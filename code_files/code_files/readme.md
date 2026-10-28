# The Pickle Club App (Frontend + Python Backend)

This project is a full-stack pickleball booking app inspired by your shared design.

## Stack

- Backend: FastAPI + SQLite
- Frontend: HTML + CSS + Vanilla JS

## Features Included

- Mobile-style interface with tabs:
— Home
- Bookings
- Events
- Community
- More
- User authentication:
- Register
= Login
- Session token (Bearer)
= Court booking flow:
- Date selection
- Court selection
- Start and end time range selection
- Players
- Booking confirmation
- Payment status and checkout
29° - Events Listing
- Community feed + post creation
- Club info/profile panel
- Admin dashboard (stats + recent bookings)

## Run Locally

© From ‘c:\dummy*:

°° *powershell
python -m venv .venv
—_.\.venv\Scripts\activate
pip install -r backend\requirements.txt
uvicorn backend.main:app —-reload
me | BBS
au
Open:

- [http://127.0.0.1:8000] (http: //127.0.0.1:8000)

-### Demo Admin Login

- Email: ‘admin@pickleclub.in*
- Password: *admin123u°

U -## APT Endpoints

- “GET /api/health*
- “POST /api/auth/register”
—- “POST /api/auth/login®
—- “POST /api/auth/Logout”
- ‘GET /api/auth/me”
- ‘GET /api/courts”
- “GET /api/slots?booking_date=YYYY-MM-DD&court_id=1&duration_minutes=60"
—- “GET /api/slots?booking_date=VYYY-MM-DD&court_id=1"
- ‘POST /api/bookings”
- “GET /api/bookings?booking_date=YYYY-MM-DD*
- ‘GET /api/events*
—- “GET /api/community”
- ‘POST /api/community”
- ‘POST /api/payments/checkout”
—- ‘GET /api/payments/my*
- ‘GET /api/admin/stats* (admin)
72. - “GET /api/admin/bookings’ (admin)
- “PATCH /api/admin/bookings/{booking_id}* (admin)

veadme.md - end of file - 73 lines
