from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import segno

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "pickleclub.db"
FRONTEND_DIR = BASE_DIR / "frontend"
ASSETS_DIR = BASE_DIR / "assets"

TIME_SLOTS = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
    "23:00",
]
SESSION_HOURS = 24
END_OF_DAY = "24:00"
WEEKDAY_RATE = 800
WEEKEND_RATE = 900
# UPI creds for selected admin
UPI_PAYEE_ID = os.getenv("PICKLECLUB_UPI_ID", "496373@ybl")
UPI_PAYEE_NAME = os.getenv("PICKLECLUB_UPI_NAME", "The Pickle Club")
UPI_QR_URL = os.getenv("PICKLECLUB_UPI_QR_URL", "/assets/upi-qr.png")

app = FastAPI(title="Pickle Club API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str | None = None) -> str:
    password_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), password_salt.encode("utf-8"), 100_000
    ).hex()
    return f"{password_salt}${digest}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, _ = stored_hash.split("$", 1)
        return hash_password(password, salt) == stored_hash
    except ValueError:
        return False


def is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


def ensure_column(conn: sqlite3.Connection, table: str, column: str, spec: str) -> None:
    cols = conn.execute(f"PRAGMA table_info({table})").fetchall()
    names = {c["name"] for c in cols}
    if column not in names:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {spec}")


def hourly_rate(booking_date: str) -> int:
    day = datetime.strptime(booking_date[:10], "%Y-%m-%d").weekday()
    return WEEKEND_RATE if day >= 5 else WEEKDAY_RATE


def time_to_hour(time_value: str) -> int:
    match = re.match(r"^(\d{2}):00$", time_value)
    if not match:
        return -1
    hour = int(match.group(1))
    if 0 <= hour <= 24:
        return hour
    return -1


def build_occupied_slots(start_time: str, end_time: str) -> set[str]:
    start_hour = time_to_hour(start_time)
    end_hour = time_to_hour(end_time)
    if start_hour < 0 or end_hour < 0 or start_hour >= end_hour:
        return set()
    occupied = set()
    for hour in range(start_hour, end_hour):
        slot = f"{hour:02d}:00"
        if slot in TIME_SLOTS:
            occupied.add(slot)
    return occupied


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT,
            contact_details TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS courts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            tier TEXT NOT NULL,
            price_per_hour INTEGER NOT NULL,
            image_url TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            booking_date TEXT NOT NULL,
            court_id INTEGER NOT NULL,
            time_slot TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            players INTEGER NOT NULL,
            player_name TEXT,
            phone TEXT,
            status TEXT NOT NULL DEFAULT 'confirmed',
            payment_status TEXT NOT NULL DEFAULT 'pending',
            amount INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (court_id) REFERENCES courts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS razorpay_orders (
            order_id TEXT PRIMARY KEY,
            purpose TEXT NOT NULL,
            ref TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            amount_paise INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            method TEXT NOT NULL,
            provider_ref TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            skill_level TEXT NOT NULL DEFAULT 'Beginner',
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            event_date TEXT NOT NULL,
            start_time TEXT NOT NULL,
            description TEXT NOT NULL,
            seats_left INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS community_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            posted_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        """
    )

    # Migration support for older local DBs.
    ensure_column(conn, "bookings", "user_id", "INTEGER")
    ensure_column(conn, "bookings", "payment_status", "TEXT NOT NULL DEFAULT 'pending'")
    ensure_column(conn, "bookings", "amount", "INTEGER NOT NULL DEFAULT 0")
    ensure_column(conn, "bookings", "end_time", "TEXT")
    ensure_column(conn, "community_posts", "user_id", "INTEGER")
    ensure_column(conn, "users", "contact_details", "TEXT")

    cur.execute("SELECT COUNT(*) AS c FROM courts")
    if cur.fetchone()["c"] == 0:
        cur.executemany(
            """
            INSERT INTO courts(name, tier, price_per_hour, image_url)
            VALUES(?, ?, ?, ?)
            """,
            [
                (
                    "Court 1",
                    "Premium",
                    900,
                    "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=600&q=80",
                ),
                (
                    "Court 2",
                    "Standard",
                    700,
                    "https://images.unsplash.com/photo-1599058918144-1ffabb6ab9a0?auto=format&fit=crop&w=600&q=80",
                ),
                (
                    "Court 3",
                    "Standard",
                    700,
                    "https://images.unsplash.com/photo-1583969461978-08a3ec3ee9a2?auto=format&fit=crop&w=600&q=80",
                ),
                (
                    "Court 4",
                    "Premium",
                    900,
                    "https://images.unsplash.com/photo-1597495662183-6c04d127f4a8?auto=format&fit=crop&w=600&q=80",
                ),
            ],
        )

    cur.execute("SELECT COUNT(*) AS c FROM events")
    if cur.fetchone()["c"] == 0:
        cur.executemany(
            """
            INSERT INTO events(title, event_date, start_time, description, seats_left)
            VALUES(?, ?, ?, ?, ?)
            """,
            [
                (
                    "Social Play Night",
                    "2026-10-12",
                    "18:00",
                    "Friendly round-robin matches with music and snacks.",
                    18,
                ),
                (
                    "Weekend Beginner Clinic",
                    "2026-10-18",
                    "08:00",
                    "Coach-led intro session for new players.",
                    12,
                ),
                (
                    "RJC Open Tournament",
                    "2026-10-25",
                    "09:00",
                    "Competitive doubles tournament with prizes.",
                    6,
                ),
            ],
        )

    cur.execute("SELECT COUNT(*) AS c FROM community_posts")
    if cur.fetchone()["c"] == 0:
        now = datetime.utcnow().isoformat()
        cur.executemany(
            """
            INSERT INTO community_posts(user_id, author, content, posted_at)
            VALUES(?, ?, ?, ?)
            """,
            [
                (None, "Coach Aman", "Saturday drills are now open. Bring your paddle and energy!", now),
                (None, "Riya P", "Looking for mixed doubles partners for Sunday morning.", now),
            ],
        )

    # Seed admin account.
    cur.execute("SELECT id FROM users WHERE email = ?", ("admin@pickleclub.in",))
    if not cur.fetchone():
        cur.execute(
            """
            INSERT INTO users(name, email, phone, contact_details, password_hash, role, created_at)
            VALUES(?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "Club Admin",
                "admin@pickleclub.in",
                "+919000000001",
                "For support call +91 90968 83844",
                hash_password("admin1234"),
                "admin",
                datetime.utcnow().isoformat(),
            ),
        )

    cur.execute("UPDATE courts SET price_per_hour = ?", (WEEKDAY_RATE,))
    tables = {row[0] for row in cur.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    if "membership_plans" in tables:
        cur.execute("UPDATE membership_plans SET price = 5499 WHERE months = 1")
        cur.execute("UPDATE membership_plans SET price = 15999 WHERE months = 3")
    if "elite_offers" in tables:
        cur.execute("UPDATE elite_offers SET price = paid_hours * ?", (WEEKDAY_RATE,))

    conn.commit()
    conn.close()


def extract_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    match = re.match(r"^Bearer\s+(.+)$", authorization.strip(), flags=re.IGNORECASE)
    return match.group(1).strip() if match else None


def get_current_user(authorization: str | None, required: bool = True) -> dict[str, Any] | None:
    token = extract_token(authorization)
    if not token:
        if required:
            raise HTTPException(status_code=401, detail="Missing auth token")
        return None

    conn = get_conn()
    row = conn.execute(
        """
        SELECT s.id AS session_id, s.expires_at,
               u.id, u.name, u.email, u.phone, u.contact_details, u.role
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
        """,
        (token,),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid auth token")

    if datetime.fromisoformat(row["expires_at"]) < datetime.utcnow():
        conn.execute("DELETE FROM sessions WHERE id = ?", (row["session_id"],))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=401, detail="Session expired, login again")

    user = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "contact_details": row["contact_details"],
        "role": row["role"],
        "token": token,
    }
    conn.close()
    return user


def require_admin(user: dict[str, Any]) -> None:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


class RegisterPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    email: str = Field(..., min_length=5, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    contact_details: str | None = Field(default=None, max_length=300)
    password: str = Field(..., min_length=6, max_length=64)


class LoginPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=64)


class BookingCreate(BaseModel):
    booking_date: str = Field(..., examples=["2026-10-12"])
    court_id: int = Field(..., ge=1)
    start_time: str = Field(..., examples=["10:00"])
    end_time: str = Field(..., examples=["12:00"])
    players: int = Field(..., ge=1, le=8)
    player_name: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, max_length=20)


class CommunityCreate(BaseModel):
    content: str = Field(..., min_length=5, max_length=500)


class PaymentCreate(BaseModel):
    booking_id: int = Field(..., ge=1)
    method: str = Field(default="UPI", min_length=2, max_length=20)
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""


class BookingStatusPatch(BaseModel):
    status: str = Field(..., pattern="^(confirmed|cancelled)$")


class PlayerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=60)
    skill_level: str = Field(default="Beginner", min_length=2, max_length=20)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(payload: RegisterPayload) -> dict[str, Any]:
    if not is_valid_email(payload.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    conn = get_conn()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Email already registered")
    created_at = datetime.utcnow().isoformat()
    cur = conn.execute(
        """
        INSERT INTO users(name, email, phone, contact_details, password_hash, role, created_at)
        VALUES(?, ?, ?, ?, ?, 'member', ?)
        """,
        (
            payload.name.strip(),
            payload.email.lower(),
            payload.phone.strip() if payload.phone else None,
            payload.contact_details.strip() if payload.contact_details else None,
            hash_password(payload.password),
            created_at,
        ),
    )
    user_id = cur.lastrowid
    conn.commit()
    conn.close()
    return {"message": "Registration successful", "user_id": user_id}


@app.post("/api/auth/login")
def login(payload: LoginPayload) -> dict[str, Any]:
    if not is_valid_email(payload.email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    conn = get_conn()
    user = conn.execute(
        """
        SELECT id, name, email, phone, contact_details, role, password_hash
        FROM users
        WHERE email = ?
        """,
        (payload.email.lower(),),
    ).fetchone()
    if not user or not verify_password(payload.password, user["password_hash"]):
        conn.close()
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = secrets.token_urlsafe(32)
    created_at = datetime.utcnow()
    expires_at = created_at + timedelta(hours=SESSION_HOURS)
    conn.execute(
        """
        INSERT INTO sessions(user_id, token, expires_at, created_at)
        VALUES(?, ?, ?, ?)
        """,
        (user["id"], token, expires_at.isoformat(), created_at.isoformat()),
    )
    conn.commit()
    conn.close()
    return {
        "token": token,
        "expires_at": expires_at.isoformat(),
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user["phone"],
            "contact_details": user["contact_details"],
            "role": user["role"],
        },
    }


@app.post("/api/auth/logout")
def logout(authorization: str | None = Header(default=None)) -> dict[str, str]:
    token = extract_token(authorization)
    if token:
        conn = get_conn()
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        conn.commit()
        conn.close()
    return {"message": "Logged out"}


@app.get("/api/auth/me")
def me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    return {"user": user}


@app.get("/api/courts")
def list_courts() -> list[dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, name, tier, price_per_hour, image_url FROM courts ORDER BY id"
    ).fetchall()
    conn.close()
    courts = []
    for row in rows:
        item = dict(row)
        item["price_per_hour"] = WEEKDAY_RATE
        item["weekday_rate"] = WEEKDAY_RATE
        item["weekend_rate"] = WEEKEND_RATE
        item["area"] = item.get("area") or "The Pickle Club, Behind University Campus, Kachimet 440033"
        courts.append(item)
    return courts


@app.get("/api/slots")
def list_slots(
    booking_date: str = Query(...),
    court_id: int = Query(..., ge=1),
) -> dict[str, Any]:
    conn = get_conn()
    booked_rows = conn.execute(
        """
        SELECT time_slot, end_time FROM bookings
        WHERE booking_date = ? AND court_id = ? AND status = 'confirmed'
        """,
        (booking_date, court_id),
    ).fetchall()
    conn.close()

    booked: set[str] = set()
    for row in booked_rows:
        start_time = row["time_slot"]
        end_time = row["end_time"] or f"{(time_to_hour(start_time) + 1):02d}:00"
        booked.update(build_occupied_slots(start_time, end_time))
    slots = [{"time": t, "is_available": t not in booked} for t in TIME_SLOTS]
    return {
        "booking_date": booking_date,
        "court_id": court_id,
        "slots": slots,
    }


@app.post("/api/bookings")
def create_booking(payload: BookingCreate, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    start_hour = time_to_hour(payload.start_time)
    end_hour = time_to_hour(payload.end_time)
    if payload.start_time not in TIME_SLOTS or start_hour < 0:
        raise HTTPException(status_code=400, detail="Invalid start time")
    if end_hour < 0 or end_hour <= start_hour:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    if payload.end_time not in TIME_SLOTS and payload.end_time != END_OF_DAY:
        raise HTTPException(status_code=400, detail="Invalid end time")
    duration_minutes = (end_hour - start_hour) * 60

    conn = get_conn()
    court = conn.execute(
        "SELECT price_per_hour FROM courts WHERE id = ?",
        (payload.court_id,),
    ).fetchone()
    if not court:
        conn.close()
        raise HTTPException(status_code=404, detail="Court not found")

    existing_rows = conn.execute(
        """
        SELECT id, time_slot, end_time FROM bookings
        WHERE booking_date = ? AND court_id = ? AND status = 'confirmed'
        """,
        (payload.booking_date, payload.court_id),
    ).fetchall()
    requested = build_occupied_slots(payload.start_time, payload.end_time)
    for row in existing_rows:
        taken = build_occupied_slots(
            row["time_slot"],
            row["end_time"] or f"{(time_to_hour(row['time_slot']) + 1):02d}:00",
        )
        if requested.intersection(taken):
            conn.close()
            raise HTTPException(status_code=409, detail="Selected time range overlaps an existing booking")

    if not requested:
        conn.close()
        raise HTTPException(status_code=400, detail="Invalid booking range")

    amount = hourly_rate(payload.booking_date) * int(duration_minutes / 60)
    created_at = datetime.utcnow().isoformat()
    cur = conn.execute(
        """
        INSERT INTO bookings(
            user_id, booking_date, court_id, time_slot, end_time, duration_minutes, players,
            player_name, phone, status, payment_status, amount, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'pending', ?, ?)
        """,
        (
            user["id"],
            payload.booking_date,
            payload.court_id,
            payload.start_time,
            payload.end_time,
            duration_minutes,
            payload.players,
            payload.player_name or user["name"],
            payload.phone or user["phone"],
            amount,
            created_at,
        ),
    )
    booking_id = cur.lastrowid
    conn.commit()
    conn.close()

    return {
        "message": "Slot reserved. Complete payment to finalize.",
        "booking_id": booking_id,
        "amount": amount,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "payment_status": "pending",
    }


@app.get("/api/bookings")
def list_bookings(
    booking_date: str | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()

    params: list[Any] = [user["id"]]
    query = """
        SELECT b.id, b.booking_date, b.time_slot, b.players, b.status, b.payment_status, b.amount,
               b.end_time,
               c.name AS court_name
        FROM bookings b
        JOIN courts c ON b.court_id = c.id
        WHERE b.user_id = ?
    """
    if booking_date:
        query += " AND b.booking_date = ?"
        params.append(booking_date)
    query += " ORDER BY b.booking_date DESC, b.time_slot LIMIT 50"
    rows = conn.execute(query, tuple(params)).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/api/users/me/bookings")
def my_bookings(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    return list_bookings(authorization=authorization)


def upi_qr_data_url(upi_url: str) -> str:
    qr = segno.make(upi_url, error="m")
    buffer = BytesIO()
    qr.save(buffer, kind="svg", scale=8, xmldecl=False, svgns=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def razorpay_keys() -> tuple[str, str]:
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    if key_id and key_secret:
        return key_id, key_secret
    creds = BASE_DIR / "creds.txt"
    if not creds.exists():
        return "", ""
    found: dict[str, str] = {}
    for line in creds.read_text(encoding="utf-8").splitlines():
        if ":" not in line:
            continue
        name, value = line.split(":", 1)
        found[name.strip()] = value.strip()
    return found.get("key_id", ""), found.get("key_secret", "")


def razorpay_request(method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    key_id, key_secret = razorpay_keys()
    if not key_id or not key_secret:
        raise HTTPException(status_code=503, detail="Razorpay is not configured")
    token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode("ascii")
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        f"https://api.razorpay.com{path}",
        data=data,
        headers={"Authorization": f"Basic {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        error.read()
        raise HTTPException(status_code=502, detail="Razorpay could not start the payment") from error
    except urllib.error.URLError as error:
        raise HTTPException(status_code=502, detail="Razorpay could not be reached") from error


def create_razorpay_order(
    conn: sqlite3.Connection,
    purpose: str,
    ref: str,
    user_id: int,
    amount_rupees: int,
    description: str,
) -> dict[str, Any] | None:
    key_id, _secret = razorpay_keys()
    if not key_id:
        return None
    paise = int(amount_rupees) * 100
    if paise < 100:
        raise HTTPException(status_code=400, detail="Amount is too small for Razorpay")
    order = razorpay_request(
        "POST",
        "/v1/orders",
        {
            "amount": paise,
            "currency": "INR",
            "receipt": f"{purpose}-{ref}"[:40],
            "payment_capture": 1,
            "notes": {"purpose": purpose, "ref": str(ref)},
        },
    )
    conn.execute(
        """
        INSERT OR REPLACE INTO razorpay_orders(order_id, purpose, ref, user_id, amount_paise, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (order["id"], purpose, str(ref), user_id, paise, datetime.utcnow().isoformat()),
    )
    conn.commit()
    return {
        "key_id": key_id,
        "order_id": order["id"],
        "amount_paise": paise,
        "currency": "INR",
        "description": description,
    }


def verified_razorpay_payment(
    conn: sqlite3.Connection,
    purpose: str,
    ref: str,
    user_id: int,
    amount_rupees: int,
    order_id: str,
    payment_id: str,
    signature: str,
) -> str:
    _key_id, secret = razorpay_keys()
    if not secret:
        return ""
    if not order_id or not payment_id or not signature:
        raise HTTPException(status_code=400, detail="Complete the Razorpay payment first.")
    expected = hmac.new(secret.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Payment could not be verified.")
    saved = conn.execute("SELECT * FROM razorpay_orders WHERE order_id = ?", (order_id,)).fetchone()
    if (
        not saved
        or saved["purpose"] != purpose
        or saved["ref"] != str(ref)
        or int(saved["user_id"]) != int(user_id)
        or int(saved["amount_paise"]) != int(amount_rupees) * 100
    ):
        raise HTTPException(status_code=400, detail="This payment does not match the booking.")
    payment = razorpay_request("GET", f"/v1/payments/{payment_id}")
    if payment.get("order_id") != order_id or int(payment.get("amount") or 0) != int(amount_rupees) * 100:
        raise HTTPException(status_code=400, detail="Razorpay amount does not match.")
    if payment.get("status") not in ("captured", "authorized"):
        raise HTTPException(status_code=400, detail="Payment is not complete.")
    return payment_id


def court_booking_row(conn: sqlite3.Connection, booking_id: int) -> sqlite3.Row | None:
    return conn.execute(
        """
        SELECT b.id, b.user_id, b.booking_date, b.time_slot, b.end_time, b.duration_minutes,
               b.players, b.status, b.payment_status, b.amount, b.phone,
               c.id AS court_id, c.name AS court_name, c.tier, c.image_url
        FROM bookings b
        JOIN courts c ON c.id = b.court_id
        WHERE b.id = ?
        """,
        (booking_id,),
    ).fetchone()


@app.get("/api/bookings/{booking_id}")
def get_booking(booking_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    row = court_booking_row(conn, booking_id)
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    if row["user_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    detail = dict(row)
    detail["sms"] = None
    return detail


@app.post("/api/payments/checkout")
def checkout(payload: PaymentCreate, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    booking = conn.execute(
        """
        SELECT id, user_id, amount, payment_status
        FROM bookings
        WHERE id = ?
        """,
        (payload.booking_id,),
    ).fetchone()
    if not booking:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot pay for another user booking")
    if booking["payment_status"] == "paid":
        conn.close()
        raise HTTPException(status_code=409, detail="Booking is already paid")
    method = payload.method.upper()
    if method not in ("UPI", "CARD", "NETBANKING"):
        conn.close()
        raise HTTPException(status_code=400, detail="Choose UPI, card, or net banking.")
    razorpay = create_razorpay_order(
        conn,
        "court",
        str(booking["id"]),
        user["id"],
        int(booking["amount"]),
        f"Court booking {booking['id']}",
    )
    conn.close()
    if razorpay is None and method != "UPI":
        raise HTTPException(status_code=400, detail="Pay with UPI. Card and net banking are not live yet.")
    upi_url = upi_link(int(booking["amount"]), f"Court Booking {booking['id']}")
    body = {
        "message": "Pay now opens Razorpay." if razorpay else "Scan this QR to pay the exact amount.",
        "payment_status": "pending",
        "booking_id": booking["id"],
        "amount": booking["amount"],
        "upi_url": upi_url,
        "qr_image_url": upi_qr_data_url(upi_url),
    }
    if razorpay:
        body["razorpay"] = razorpay
    return body


@app.post("/api/payments/confirm")
def confirm_upi_payment(payload: PaymentCreate, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    booking = conn.execute(
        "SELECT id, user_id, amount, payment_status FROM bookings WHERE id = ?",
        (payload.booking_id,),
    ).fetchone()
    if not booking:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["user_id"] != user["id"] and user["role"] != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="Cannot pay for another user booking")
    if booking["payment_status"] != "paid":
        provider_ref = verified_razorpay_payment(
            conn,
            "court",
            str(booking["id"]),
            user["id"],
            int(booking["amount"]),
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )
        if not provider_ref:
            provider_ref = f"PAY-{secrets.token_hex(5).upper()}"
        created_at = datetime.utcnow().isoformat()
        conn.execute(
            """
            INSERT INTO payments(booking_id, user_id, amount, method, provider_ref, status, created_at)
            VALUES(?, ?, ?, ?, ?, 'success', ?)
            """,
            (
                booking["id"],
                user["id"],
                booking["amount"],
                (payload.method or "UPI").upper(),
                provider_ref,
                created_at,
            ),
        )
        conn.execute("UPDATE bookings SET payment_status = 'paid', status = 'confirmed' WHERE id = ?", (booking["id"],))
        conn.commit()
    detail = court_booking_row(conn, payload.booking_id)
    conn.close()
    body = dict(detail)
    body["sms"] = None
    body["message"] = "Payment recorded. Booking confirmed."
    return body


@app.get("/api/payments/my")
def my_payments(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT p.id, p.booking_id, p.amount, p.method, p.provider_ref, p.status, p.created_at
        FROM payments p
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT 50
        """,
        (user["id"],),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/api/players")
def list_players(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT id, name, skill_level, created_at
        FROM players
        WHERE user_id = ?
        ORDER BY id DESC
        """,
        (user["id"],),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/players")
def create_player(payload: PlayerCreate, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    created_at = datetime.utcnow().isoformat()
    conn = get_conn()
    cur = conn.execute(
        """
        INSERT INTO players(user_id, name, skill_level, created_at)
        VALUES(?, ?, ?, ?)
        """,
        (user["id"], payload.name.strip(), payload.skill_level.strip(), created_at),
    )
    conn.commit()
    player_id = cur.lastrowid
    conn.close()
    return {"message": "Player added", "id": player_id}


@app.delete("/api/players/{player_id}")
def delete_player(player_id: int, authorization: str | None = Header(default=None)) -> dict[str, str]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    deleted = conn.execute(
        "DELETE FROM players WHERE id = ? AND user_id = ?",
        (player_id, user["id"]),
    )
    if deleted.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Player not found")
    conn.commit()
    conn.close()
    return {"message": "Player removed"}


@app.get("/api/events")
def list_events() -> list[dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT id, title, event_date, start_time, description, seats_left
        FROM events
        ORDER BY event_date, start_time
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.get("/api/community")
def list_community() -> list[dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT id, author, content, posted_at
        FROM community_posts
        ORDER BY id DESC
        LIMIT 50
        """
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.post("/api/community")
def create_community_post(payload: CommunityCreate, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    posted_at = datetime.utcnow().isoformat()
    conn = get_conn()
    cur = conn.execute(
        """
        INSERT INTO community_posts(user_id, author, content, posted_at)
        VALUES(?, ?, ?, ?)
        """,
        (user["id"], user["name"], payload.content, posted_at),
    )
    conn.commit()
    post_id = cur.lastrowid
    conn.close()
    return {"message": "Post created", "id": post_id, "posted_at": posted_at}


@app.get("/api/admin/stats")
def admin_stats(authorization: str | None = Header(default=None)) -> dict[str, int]:
    user = get_current_user(authorization, required=True)
    require_admin(user)
    conn = get_conn()
    stats = {
        "users": conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"],
        "bookings": conn.execute("SELECT COUNT(*) AS c FROM bookings").fetchone()["c"],
        "payments_paid": conn.execute(
            "SELECT COUNT(*) AS c FROM bookings WHERE payment_status = 'paid'"
        ).fetchone()["c"],
        "community_posts": conn.execute("SELECT COUNT(*) AS c FROM community_posts").fetchone()["c"],
    }
    conn.close()
    return stats


@app.get("/api/admin/bookings")
def admin_bookings(
    booking_date: str | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    user = get_current_user(authorization, required=True)
    require_admin(user)
    conn = get_conn()
    params: list[Any] = []
    query = """
        SELECT b.id, b.booking_date, b.time_slot, b.players, b.status, b.payment_status, b.amount,
               b.end_time,
               c.name AS court_name, u.name AS user_name, u.email AS user_email
        FROM bookings b
        LEFT JOIN users u ON u.id = b.user_id
        JOIN courts c ON c.id = b.court_id
    """
    if booking_date:
        query += " WHERE b.booking_date = ?"
        params.append(booking_date)
    query += " ORDER BY b.booking_date DESC, b.time_slot LIMIT 200"
    rows = conn.execute(query, tuple(params)).fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.patch("/api/admin/bookings/{booking_id}")
def update_booking_status(
    booking_id: int,
    payload: BookingStatusPatch,
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    user = get_current_user(authorization, required=True)
    require_admin(user)
    conn = get_conn()
    updated = conn.execute(
        "UPDATE bookings SET status = ? WHERE id = ?",
        (payload.status, booking_id),
    )
    if updated.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Booking not found")
    conn.commit()
    conn.close()
    return {"message": "Booking status updated"}


def split_merch(value: str | None) -> list[str]:
    return [part for part in (value or "").split(",") if part]


def offer_is_open(offer: sqlite3.Row) -> bool:
    today = datetime.utcnow().date().isoformat()
    return bool(offer["active"]) and offer["promo_start"] <= today <= offer["promo_end"]


def elite_card_payload(conn: sqlite3.Connection, card: sqlite3.Row) -> dict[str, Any]:
    offer = conn.execute("SELECT * FROM elite_offers WHERE id = ?", (card["offer_id"],)).fetchone()
    today = datetime.utcnow().date().isoformat()
    remaining = max(0, int(card["total_hours"]) - int(card["used_hours"]))
    activated = card["payment_status"] == "paid" and card["status"] == "active" and (card["expires_at"] or "") >= today
    expires = card["expires_at"] or ""
    expiring_soon = activated and expires <= (datetime.utcnow().date() + timedelta(days=14)).isoformat()
    return {
        "id": card["id"],
        "card_number": card["card_number"],
        "holder_name": card["holder_name"],
        "phone": card["phone"],
        "package": offer["name"] if offer else "Elite Card",
        "paid_hours": offer["paid_hours"] if offer else card["total_hours"],
        "bonus_hours": offer["bonus_hours"] if offer else 0,
        "total_hours": card["total_hours"],
        "used_hours": card["used_hours"],
        "remaining_hours": remaining,
        "price": offer["price"] if offer else 0,
        "status": card["status"],
        "payment_status": card["payment_status"],
        "activated": activated,
        "valid_until": expires,
        "expiring_soon": expiring_soon,
        "history": [],
    }


def membership_payload(conn: sqlite3.Connection, row: sqlite3.Row) -> dict[str, Any]:
    plan = conn.execute("SELECT * FROM membership_plans WHERE id = ?", (row["plan_id"],)).fetchone()
    today = datetime.utcnow().date().isoformat()
    activated = (
        row["payment_status"] == "paid"
        and row["status"] == "active"
        and bool(row["expires_at"])
        and row["expires_at"] >= today
    )
    return {
        "membership_id": row["membership_id"],
        "holder_name": row["holder_name"],
        "phone": row["phone"],
        "plan": plan["name"] if plan else "Membership",
        "months": plan["months"] if plan else 1,
        "price": plan["price"] if plan else 0,
        "merch": split_merch(plan["merch"] if plan else ""),
        "payment_status": row["payment_status"],
        "status": row["status"],
        "activated": activated,
        "valid_from": row["starts_at"] or "",
        "valid_until": row["expires_at"] or "",
    }


class EliteVerify(BaseModel):
    card_number: str = Field(..., min_length=6, max_length=20)


class ElitePurchase(BaseModel):
    offer_id: int = Field(..., ge=1)


class EliteCheckout(BaseModel):
    card_number: str = Field(..., min_length=6, max_length=20)
    method: str = Field(default="UPI", min_length=2, max_length=20)
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""


class MembershipSelect(BaseModel):
    plan_id: int = Field(..., ge=1)


class MembershipCheckout(BaseModel):
    membership_id: str = Field(..., min_length=6, max_length=24)
    method: str = Field(default="UPI", min_length=2, max_length=20)
    razorpay_order_id: str = ""
    razorpay_payment_id: str = ""
    razorpay_signature: str = ""


@app.get("/api/club/config")
def club_config() -> dict[str, Any]:
    return {
        "upi_id": UPI_PAYEE_ID,
        "upi_name": UPI_PAYEE_NAME,
        "qr_image_url": UPI_QR_URL or "/assets/upi-qr.png",
        "maps_url": "https://maps.app.goo.gl/wXmPLPzKQJfunk658?g_st=ig",
        "maps_coords": "21.148889,79.032750",
        "address": "The Pickle Club, Behind University Campus, Kachimet 440033",
    }


@app.get("/api/elite/offers")
def elite_offers() -> list[dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM elite_offers WHERE active = 1 ORDER BY price").fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "paid_hours": row["paid_hours"],
            "bonus_hours": row["bonus_hours"],
            "total_hours": row["paid_hours"] + row["bonus_hours"],
            "price": row["price"],
            "validity_days": row["validity_days"],
            "promo_end": row["promo_end"],
            "badge": row["badge"],
            "open": offer_is_open(row),
        }
        for row in rows
    ]


@app.get("/api/elite/mine")
def my_elite_cards(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM elite_cards WHERE user_id = ? ORDER BY id DESC",
        (user["id"],),
    ).fetchall()
    payload = [elite_card_payload(conn, row) for row in rows]
    conn.close()
    return payload


@app.post("/api/elite/verify")
def verify_elite(payload: EliteVerify, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    card = conn.execute(
        "SELECT * FROM elite_cards WHERE card_number = ?",
        (payload.card_number.strip().upper(),),
    ).fetchone()
    if not card:
        conn.close()
        raise HTTPException(status_code=404, detail="Elite Card not found")
    if card["user_id"] != user["id"] and user["role"] != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="This Elite Card belongs to another player")
    body = elite_card_payload(conn, card)
    conn.close()
    return body


def new_elite_number(conn: sqlite3.Connection) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(30):
        suffix = "".join(secrets.choice(alphabet) for _ in range(6))
        number = f"ELITE-{suffix}"
        if not conn.execute("SELECT 1 FROM elite_cards WHERE card_number = ?", (number,)).fetchone():
            return number
    raise HTTPException(status_code=500, detail="Could not generate an Elite Card number")


def upi_link(amount: int, note: str) -> str:
    return f"upi://pay?{urlencode({'pa': UPI_PAYEE_ID, 'pn': UPI_PAYEE_NAME, 'am': amount, 'cu': 'INR', 'tn': note})}"


@app.post("/api/elite/purchase")
def purchase_elite(payload: ElitePurchase, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    offer = conn.execute("SELECT * FROM elite_offers WHERE id = ? AND active = 1", (payload.offer_id,)).fetchone()
    if not offer or not offer_is_open(offer):
        conn.close()
        raise HTTPException(status_code=400, detail="This Elite offer is not open")
    number = new_elite_number(conn)
    issued = datetime.utcnow().date()
    expires = issued + timedelta(days=int(offer["validity_days"]))
    conn.execute(
        """
        INSERT INTO elite_cards(
            card_number, user_id, offer_id, holder_name, phone, total_hours, used_hours,
            status, issued_at, expires_at, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, 'pending')
        """,
        (
            number,
            user["id"],
            offer["id"],
            user["name"],
            user["phone"] or "",
            int(offer["paid_hours"]) + int(offer["bonus_hours"]),
            issued.isoformat(),
            expires.isoformat(),
        ),
    )
    conn.commit()
    card = conn.execute("SELECT * FROM elite_cards WHERE card_number = ?", (number,)).fetchone()
    body = elite_card_payload(conn, card)
    conn.close()
    return body


@app.post("/api/elite/checkout")
def checkout_elite(payload: EliteCheckout, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    card = conn.execute(
        "SELECT * FROM elite_cards WHERE card_number = ?",
        (payload.card_number.strip().upper(),),
    ).fetchone()
    if not card:
        conn.close()
        raise HTTPException(status_code=404, detail="Elite Card not found")
    if card["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="This Elite Card belongs to another player")
    offer = conn.execute("SELECT * FROM elite_offers WHERE id = ?", (card["offer_id"],)).fetchone()
    amount = int(offer["price"]) if offer else 0
    if card["payment_status"] == "paid":
        body = elite_card_payload(conn, card)
        conn.close()
        body["upi_url"] = upi_link(amount, f"Elite {body['card_number']}")
        body["qr_image_url"] = upi_qr_data_url(body["upi_url"])
        body["payment_status"] = "paid"
        return body
    razorpay = create_razorpay_order(
        conn,
        "elite",
        card["card_number"],
        user["id"],
        amount,
        f"Elite Card {card['card_number']}",
    )
    conn.close()
    upi_url = upi_link(amount, f"Elite {card['card_number']}")
    body = {
        "message": "Pay now opens Razorpay." if razorpay else "Scan this QR to pay the exact amount.",
        "payment_status": "pending",
        "card_number": card["card_number"],
        "amount": amount,
        "upi_url": upi_url,
        "qr_image_url": upi_qr_data_url(upi_url),
    }
    if razorpay:
        body["razorpay"] = razorpay
    return body


@app.post("/api/elite/confirm")
def confirm_elite(payload: EliteCheckout, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    card = conn.execute(
        "SELECT * FROM elite_cards WHERE card_number = ?",
        (payload.card_number.strip().upper(),),
    ).fetchone()
    if not card:
        conn.close()
        raise HTTPException(status_code=404, detail="Elite Card not found")
    if card["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="This Elite Card belongs to another player")
    offer = conn.execute("SELECT * FROM elite_offers WHERE id = ?", (card["offer_id"],)).fetchone()
    amount = int(offer["price"]) if offer else 0
    if card["payment_status"] != "paid":
        provider_ref = verified_razorpay_payment(
            conn,
            "elite",
            card["card_number"],
            user["id"],
            amount,
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )
        if not provider_ref:
            provider_ref = f"PAY-{secrets.token_hex(5).upper()}"
        created_at = datetime.utcnow().isoformat()
        conn.execute(
            """
            INSERT INTO elite_payments(card_id, user_id, amount, method, provider_ref, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'success', ?)
            """,
            (card["id"], user["id"], amount, payload.method.upper(), provider_ref, created_at),
        )
        conn.execute(
            "UPDATE elite_cards SET payment_status = 'paid', status = 'active' WHERE id = ?",
            (card["id"],),
        )
        conn.commit()
        card = conn.execute("SELECT * FROM elite_cards WHERE id = ?", (card["id"],)).fetchone()
    body = elite_card_payload(conn, card)
    conn.close()
    return body


@app.get("/api/membership/plans")
def membership_plans() -> list[dict[str, Any]]:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM membership_plans WHERE active = 1 ORDER BY months").fetchall()
    conn.close()
    return [
        {
            "id": row["id"],
            "months": row["months"],
            "price": row["price"],
            "badge": row["badge"],
            "merch": split_merch(row["merch"]),
        }
        for row in rows
    ]


@app.get("/api/membership/mine")
def my_memberships(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM memberships WHERE user_id = ? ORDER BY id DESC",
        (user["id"],),
    ).fetchall()
    payload = [membership_payload(conn, row) for row in rows]
    conn.close()
    return payload


def membership_by_public_id(conn: sqlite3.Connection, membership_id: str) -> sqlite3.Row | None:
    return conn.execute(
        "SELECT * FROM memberships WHERE membership_id = ?",
        (membership_id.strip().upper(),),
    ).fetchone()


@app.post("/api/membership/checkout")
def checkout_membership(payload: MembershipCheckout, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    row = membership_by_public_id(conn, payload.membership_id)
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Membership not found")
    if row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="This membership belongs to another player")
    plan = conn.execute("SELECT * FROM membership_plans WHERE id = ?", (row["plan_id"],)).fetchone()
    amount = int(plan["price"]) if plan else 0
    if row["payment_status"] == "paid":
        conn.close()
        raise HTTPException(status_code=409, detail="Membership is already paid")
    razorpay = create_razorpay_order(
        conn,
        "membership",
        row["membership_id"],
        user["id"],
        amount,
        f"Membership {row['membership_id']}",
    )
    conn.close()
    upi_url = upi_link(amount, f"Membership {row['membership_id']}")
    body = {
        "message": "Pay now opens Razorpay." if razorpay else "Scan this QR to pay the exact amount.",
        "payment_status": "pending",
        "membership_id": row["membership_id"],
        "amount": amount,
        "upi_url": upi_url,
        "qr_image_url": upi_qr_data_url(upi_url),
    }
    if razorpay:
        body["razorpay"] = razorpay
    return body


@app.post("/api/membership/confirm")
def confirm_membership(payload: MembershipCheckout, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    row = membership_by_public_id(conn, payload.membership_id)
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Membership not found")
    if row["user_id"] != user["id"]:
        conn.close()
        raise HTTPException(status_code=403, detail="This membership belongs to another player")
    plan = conn.execute("SELECT * FROM membership_plans WHERE id = ?", (row["plan_id"],)).fetchone()
    amount = int(plan["price"]) if plan else 0
    if row["payment_status"] != "paid":
        provider_ref = verified_razorpay_payment(
            conn,
            "membership",
            row["membership_id"],
            user["id"],
            amount,
            payload.razorpay_order_id,
            payload.razorpay_payment_id,
            payload.razorpay_signature,
        )
        if not provider_ref:
            provider_ref = f"PAY-{secrets.token_hex(5).upper()}"
        start = datetime.utcnow().date()
        months = int(plan["months"]) if plan else 1
        expires = start + timedelta(days=30 * months)
        created_at = datetime.utcnow().isoformat()
        conn.execute(
            """
            INSERT INTO membership_payments(membership_pk, user_id, amount, method, provider_ref, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'success', ?)
            """,
            (row["id"], user["id"], amount, payload.method.upper(), provider_ref, created_at),
        )
        conn.execute(
            """
            UPDATE memberships
            SET payment_status = 'paid', status = 'active', starts_at = ?, expires_at = ?
            WHERE id = ?
            """,
            (start.isoformat(), expires.isoformat(), row["id"]),
        )
        conn.commit()
        row = membership_by_public_id(conn, payload.membership_id)
    body = membership_payload(conn, row)
    conn.close()
    body["message"] = "Payment recorded. Membership is active."
    return body


@app.post("/api/membership/select")
def select_membership(payload: MembershipSelect, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    plan = conn.execute(
        "SELECT * FROM membership_plans WHERE id = ? AND active = 1",
        (payload.plan_id,),
    ).fetchone()
    if not plan:
        conn.close()
        raise HTTPException(status_code=404, detail="Membership plan not found")
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    membership_id = ""
    for _ in range(30):
        suffix = "".join(secrets.choice(alphabet) for _ in range(6))
        membership_id = f"MEM-{suffix}"
        if not conn.execute("SELECT 1 FROM memberships WHERE membership_id = ?", (membership_id,)).fetchone():
            break
    created_at = datetime.utcnow().isoformat()
    conn.execute(
        """
        INSERT INTO memberships(
            membership_id, user_id, plan_id, holder_name, phone, status, payment_status, created_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?)
        """,
        (membership_id, user["id"], plan["id"], user["name"], user["phone"] or "", created_at),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM memberships WHERE membership_id = ?", (membership_id,)).fetchone()
    body = membership_payload(conn, row)
    conn.close()
    return body


@app.get("/api/membership/{membership_id}")
def get_membership(membership_id: str, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = get_current_user(authorization, required=True)
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM memberships WHERE membership_id = ?",
        (membership_id.strip().upper(),),
    ).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Membership not found")
    if row["user_id"] != user["id"] and user["role"] != "admin":
        conn.close()
        raise HTTPException(status_code=403, detail="This membership belongs to another player")
    body = membership_payload(conn, row)
    conn.close()
    return body


def frontend_file() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/")
def frontend_index() -> FileResponse:
    return frontend_file()


app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/assets", StaticFiles(directory=ASSETS_DIR, check_dir=False), name="assets")


@app.get("/{full_path:path}")
def frontend_page(full_path: str) -> FileResponse:
    if full_path.startswith("api/") or full_path.startswith("static/") or full_path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Not found")
    return frontend_file()
