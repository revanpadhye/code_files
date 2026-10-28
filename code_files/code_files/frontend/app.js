// const API = "/api";
// const TOKEN_KEY = "pickleclub_token";

// const state = {
//   token: localStorage.getItem(TOKEN_KEY) || "",
//   user: null,
//   courts: [],
//   court: null,
//   date: null,
//   slots: [],
//   start: null,
//   end: null,
//   booking: null,
// };

// const screens = {
//   splash: document.getElementById("screen-splash"),
//   login: document.getElementById("screen-login"),
//   landing: document.getElementById("screen-landing"),
//   courts: document.getElementById("screen-courts"),
//   booking: document.getElementById("screen-booking"),
//   payment: document.getElementById("screen-payment"),
//   confirmed: document.getElementById("screen-confirmed"),
//   elite: document.getElementById("screen-elite"),
//   eliteCard: document.getElementById("screen-elite-card"),
//   eliteBook: document.getElementById("screen-elite-book"),
//   eliteAdmin: document.getElementById("screen-elite-admin"),
//   membership: document.getElementById("screen-membership"),
//   membershipReview: document.getElementById("screen-membership-review"),
// };

// let termsAutoShown = false;

// function openTerms(auto) {
//   if (auto && termsAutoShown) return;
//   if (auto) termsAutoShown = true;
//   const more = document.getElementById("more-panel");
//   if (more) more.classList.add("hidden");
//   document.getElementById("terms-modal").classList.remove("hidden");
// }

// function closeTerms() {
//   document.getElementById("terms-modal").classList.add("hidden");
// }

// function show(name) {
//   Object.entries(screens).forEach(([key, el]) => {
//     if (el) el.classList.toggle("hidden", key !== name);
//   });
//   if (name !== "landing") closeTerms();
// }

// function toast(message) {
//   const el = document.getElementById("toast");
//   el.textContent = message;
//   el.classList.add("show");
//   setTimeout(() => el.classList.remove("show"), 2200);
// }

// let routeToken = 0;

// function go(path) {
//   const next = new URL(path, window.location.origin);
//   if (next.origin !== window.location.origin) {
//     window.location.href = path;
//     return;
//   }
//   const target = next.pathname + next.search;
//   const current = window.location.pathname + window.location.search;
//   if (target !== current) history.pushState({}, "", target);
//   route().catch((error) => toast(error.message));
// }

// async function request(path, options = {}) {
//   const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
//   if (state.token) headers.Authorization = `Bearer ${state.token}`;
//   const res = await fetch(`${API}${path}`, { ...options, headers });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     if (res.status === 401) {
//       localStorage.removeItem(TOKEN_KEY);
//       state.token = "";
//       state.user = null;
//     }
//     throw new Error(data.detail || "Request failed");
//   }
//   return data;
// }

// function isoDate(date) {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   return `${y}-${m}-${d}`;
// }

// function upcomingDates() {
//   const today = new Date();
//   return Array.from({ length: 5 }, (_, i) => {
//     const d = new Date(today);
//     d.setDate(today.getDate() + i);
//     return isoDate(d);
//   });
// }

// function hour(time) {
//   return Number(String(time).slice(0, 2));
// }

// async function loadUser() {
//   if (!state.token) return null;
//   try {
//     const data = await request("/auth/me");
//     state.user = data.user;
//     return state.user;
//   } catch {
//     return null;
//   }
// }

// function bindAuth() {
//   const loginForm = document.getElementById("login-form");
//   const registerForm = document.getElementById("register-form");
//   document.getElementById("show-login").onclick = () => {
//     loginForm.classList.remove("hidden");
//     registerForm.classList.add("hidden");
//     document.getElementById("show-login").classList.add("active");
//     document.getElementById("show-register").classList.remove("active");
//   };
//   document.getElementById("show-register").onclick = () => {
//     registerForm.classList.remove("hidden");
//     loginForm.classList.add("hidden");
//     document.getElementById("show-register").classList.add("active");
//     document.getElementById("show-login").classList.remove("active");
//   };
//   loginForm.onsubmit = async (event) => {
//     event.preventDefault();
//     try {
//       const data = await request("/auth/login", {
//         method: "POST",
//         body: JSON.stringify({
//           email: document.getElementById("login-email").value.trim(),
//           password: document.getElementById("login-password").value,
//         }),
//       });
//       state.token = data.token;
//       state.user = data.user;
//       localStorage.setItem(TOKEN_KEY, data.token);
//       go("/landing");
//     } catch (error) {
//       toast(error.message);
//     }
//   };
//   registerForm.onsubmit = async (event) => {
//     event.preventDefault();
//     try {
//       await request("/auth/register", {
//         method: "POST",
//         body: JSON.stringify({
//           name: document.getElementById("register-name").value.trim(),
//           email: document.getElementById("register-email").value.trim(),
//           phone: document.getElementById("register-phone").value.trim(),
//           password: document.getElementById("register-password").value,
//         }),
//       });
//       toast("Account created. Please login.");
//       document.getElementById("show-login").click();
//     } catch (error) {
//       toast(error.message);
//     }
//   };
//   document.getElementById("more-btn").onclick = () => {
//     document.getElementById("more-panel").classList.toggle("hidden");
//   };
//   document.getElementById("terms-btn").onclick = () => openTerms(false);
//   document.getElementById("terms-modal").onclick = (event) => {
//     if (event.target.id === "terms-modal") closeTerms();
//   };
//   document.getElementById("logout-btn").onclick = async () => {
//     try { await request("/auth/logout", { method: "POST" }); } catch {}
//     localStorage.removeItem(TOKEN_KEY);
//     state.token = "";
//     go("/login");
//   };
// }

// async function renderCourts() {
//   state.courts = await request("/courts");
//   const list = document.getElementById("courts-list");
//   list.innerHTML = "";
//   state.courts.forEach((court) => {
//     const card = document.createElement("a");
//     card.className = "court-card";
//     card.href = `/book/${court.id}`;
//     card.innerHTML = `
//       <img src="${court.image_url}" alt="" />
//       <div class="court-body">
//         <h3>${court.name}</h3>
//         <p class="muted">${court.area || "The Pickle Club, Behind University Campus, Kachimet 440033"}</p>
//         <div class="court-meta">
//           <span>Same club</span>
//           <strong>Rs ${court.weekday_rate || 800}/hr</strong>
//         </div>
//         <p class="mini muted">Weekend Rs ${court.weekend_rate || 900}/hr</p>
//         <p>★ ${court.rating || "-"} (${court.review_count || 0})</p>
//         <span class="primary">Select court</span>
//       </div>
//     `;
//     list.appendChild(card);
//   });
// }

// function renderDates() {
//   const dates = upcomingDates();
//   if (!state.date) state.date = dates[0];
//   const wrap = document.getElementById("date-chips");
//   wrap.innerHTML = "";
//   dates.forEach((date) => {
//     const btn = document.createElement("button");
//     btn.type = "button";
//     btn.className = `chip ${date === state.date ? "active" : ""}`;
//     btn.textContent = new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
//     btn.onclick = async () => {
//       state.date = date;
//       state.start = null;
//       state.end = null;
//       await loadSlots();
//     };
//     wrap.appendChild(btn);
//   });
// }

// function endOptions(start) {
//   const map = new Map(state.slots.map((slot) => [slot.time, slot.is_available]));
//   const times = state.slots.map((slot) => slot.time);
//   const index = times.indexOf(start);
//   const options = [];
//   if (index < 0) return options;
//   for (let i = index; i < times.length; i += 1) {
//     if (!map.get(times[i])) break;
//     options.push(i === times.length - 1 ? "24:00" : times[i + 1]);
//   }
//   return options;
// }

// function fillSelect(select, values, selected) {
//   select.innerHTML = "";
//   values.forEach((value) => {
//     const opt = document.createElement("option");
//     opt.value = value;
//     opt.textContent = value;
//     select.appendChild(opt);
//   });
//   if (selected && values.includes(selected)) select.value = selected;
// }

// function isWeekend(dateValue) {
//   const day = new Date(`${dateValue}T00:00:00`).getDay();
//   return day === 0 || day === 6;
// }

// function hourlyRate(dateValue) {
//   const day = new Date(`${dateValue}T00:00:00`).getDay();
//   const weekend = day === 0 || day === 6;
//   const weekdayRate = state.court?.weekday_rate || 800;
//   const weekendRate = state.court?.weekend_rate || 900;
//   return weekend ? weekendRate : weekdayRate;
// }

// function updateQuote() {
//   const quote = document.getElementById("quote");
//   if (!state.court || !state.start) {
//     quote.textContent = "Select an available range.";
//     return;
//   }
//   if (!state.end) {
//     quote.textContent = `${state.start} selected. Select the end time.`;
//     return;
//   }
//   const hours = hour(state.end) - hour(state.start);
//   const rate = hourlyRate(state.date);
//   const amount = rate * hours;
//   const dayLabel = isWeekend(state.date) ? "weekend" : "weekday";
//   quote.textContent = `${state.start} to ${state.end} · ${hours} hr · Rs ${rate}/hr ${dayLabel} · Rs ${amount}`;
// }

// function padHour(value) {
//   return `${String(value).padStart(2, "0")}:00`;
// }

// function hourIsSelected(time) {
//   if (!state.start) return false;
//   if (!state.end) return time === state.start;
//   return time >= state.start && time < state.end;
// }

// function chooseCourtTime(time) {
//   if (time === "24:00") {
//     if (!state.start || !endOptions(state.start).includes("24:00")) return;
//     if (state.end === "24:00") {
//       state.end = "23:00";
//       if (state.end <= state.start) {
//         state.start = null;
//         state.end = null;
//       }
//     } else {
//       state.end = "24:00";
//     }
//     renderSlots();
//     return;
//   }
//   const canStart = state.slots.some((slot) => slot.time === time && slot.is_available);
//   if (hourIsSelected(time)) {
//     const next = padHour(hour(state.start) + 1);
//     if (!state.end || (time === state.start && state.end === next)) {
//       state.start = null;
//       state.end = null;
//     } else if (time === state.start) {
//       state.start = next;
//     } else {
//       state.end = time;
//     }
//     renderSlots();
//     return;
//   }
//   const endsNow = state.start ? endOptions(state.start) : [];
//   if (state.start && hour(time) > hour(state.start) && endsNow.includes(time)) {
//     state.end = time;
//     renderSlots();
//     return;
//   }
//   if (!canStart) return;
//   state.start = time;
//   state.end = null;
//   renderSlots();
// }

// function renderSlots() {
//   const grid = document.getElementById("slots-grid");
//   grid.innerHTML = "";
//   const starts = state.slots.filter((slot) => slot.is_available).map((slot) => slot.time);
//   if (state.start && !starts.includes(state.start)) {
//     state.start = null;
//     state.end = null;
//   }
//   const ends = state.start ? endOptions(state.start) : [];
//   if (state.start && state.end && !ends.includes(state.end)) state.end = null;
//   state.slots.forEach((slot) => {
//     const btn = document.createElement("button");
//     btn.type = "button";
//     const selected = hourIsSelected(slot.time) || slot.time === state.end;
//     const canClose = ends.includes(slot.time);
//     btn.className = `slot ${selected ? "active" : ""} ${slot.is_available ? "" : "unavailable"}`;
//     if (slot.is_available) {
//       btn.textContent = slot.time;
//     } else {
//       const label = document.createElement("span");
//       label.textContent = slot.time;
//       const note = document.createElement("small");
//       note.textContent = "Booked";
//       btn.append(label, note);
//     }
//     btn.disabled = !slot.is_available && !canClose;
//     btn.onclick = () => chooseCourtTime(slot.time);
//     grid.appendChild(btn);
//   });
//   if (ends.includes("24:00")) {
//     const closeBtn = document.createElement("button");
//     closeBtn.type = "button";
//     closeBtn.className = `slot ${state.end === "24:00" ? "active" : ""}`;
//     closeBtn.textContent = "24:00";
//     closeBtn.onclick = () => chooseCourtTime("24:00");
//     grid.appendChild(closeBtn);
//   }
//   const startSelect = document.getElementById("start-time");
//   const endSelect = document.getElementById("end-time");
//   fillSelect(startSelect, starts, state.start);
//   fillSelect(endSelect, ends, state.end);
//   startSelect.onchange = () => {
//     state.start = startSelect.value;
//     state.end = null;
//     renderSlots();
//   };
//   endSelect.onchange = () => {
//     state.end = endSelect.value;
//     updateQuote();
//   };
//   updateQuote();
//   renderDates();
// }

// async function loadSlots() {
//   if (!state.date) state.date = upcomingDates()[0];
//   const data = await request(`/slots?booking_date=${state.date}&court_id=${state.court.id}`);
//   state.slots = data.slots;
//   renderSlots();
// }

// async function openBooking(courtId) {
//   if (!state.courts.length) state.courts = await request("/courts");
//   state.court = state.courts.find((court) => String(court.id) === String(courtId));
//   if (!state.court) {
//     toast("Court not found");
//     go("/courts");
//     return;
//   }
//   document.getElementById("booking-title").textContent = state.court.name;
//   document.getElementById("booking-name").textContent = state.court.name;
//   document.getElementById("booking-tier").textContent = state.court.tier;
//   document.getElementById("booking-area").textContent = state.court.area || "The Pickle Club, Behind University Campus, Kachimet 440033";
//   document.getElementById("booking-price").textContent = `Rs ${state.court.weekday_rate || 800}/hr · Weekend Rs ${state.court.weekend_rate || 900}`;
//   document.getElementById("booking-image").src = state.court.image_url;
//   state.date = null;
//   state.start = null;
//   state.end = null;
//   await loadSlots();
// }

// async function confirmBooking() {
//   if (!state.user) {
//     go("/login");
//     return;
//   }
//   if (!state.start || !state.end) {
//     toast("Select a time range first.");
//     return;
//   }
//   const data = await request("/bookings", {
//     method: "POST",
//     body: JSON.stringify({
//       booking_date: state.date,
//       court_id: state.court.id,
//       start_time: state.start,
//       end_time: state.end,
//       players: 2,
//       player_name: state.user.name,
//       phone: state.user.phone || "",
//     }),
//   });
//   go(`/pay/${data.booking_id}`);
// }

// async function loadClubConfig() {
//   if (state.clubConfig) return state.clubConfig;
//   try {
//     state.clubConfig = await request("/club/config");
//   } catch {
//     state.clubConfig = {
//       upi_id: "496373@ybl",
//       qr_image_url: "/assets/upi-qr.png",
//       maps_url: "https://maps.app.goo.gl/wXmPLPzKQJfunk658?g_st=ig",
//     };
//   }
//   return state.clubConfig;
// }

// function isPhone() {
//   return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
// }

// function paintUpiBox() {
//   const box = document.getElementById("upi-box");
//   if (!state.upiReady) {
//     box.classList.add("hidden");
//     return;
//   }
//   box.classList.remove("hidden");
//   const cfg = state.clubConfig || {};
//   if (state.upiQr) document.getElementById("upi-qr").src = state.upiQr;
//   if (cfg.upi_id) document.getElementById("upi-id-label").textContent = cfg.upi_id;
//   document.getElementById("upi-help").textContent = isPhone()
//     ? "Your UPI app should be open with this amount. Come back here and tap the button below only after the payment succeeds."
//     : "Scan this QR with PhonePe, GPay, or Paytm. The booking is confirmed only after you tap the button below.";
// }

// function bindPayMethods() {
//   document.querySelectorAll("input[name='method']").forEach((input) => {
//     input.onchange = () => paintUpiBox();
//   });
// }

// function openUpiApp(url) {
//   if (!url || !isPhone()) return;
//   window.location.href = url;
// }

// function prepareRazorpayPay() {
//   state.upiReady = false;
//   state.razorpay = true;
//   const box = document.getElementById("upi-box");
//   const img = document.getElementById("upi-qr");
//   const done = document.getElementById("payment-done");
//   const idLine = document.getElementById("upi-id-label");
//   if (img) img.classList.add("hidden");
//   if (done) done.classList.add("hidden");
//   if (idLine && idLine.parentElement) idLine.parentElement.classList.add("hidden");
//   if (box) box.classList.remove("hidden");
//   const help = document.getElementById("upi-help");
//   if (help) help.textContent = "Tap Pay now. Razorpay opens in test mode. This is confirmed only after the payment succeeds.";
// }

// function loadRazorpayScript() {
//   if (window.Razorpay) return Promise.resolve();
//   return new Promise((resolve, reject) => {
//     const script = document.createElement("script");
//     script.src = "https://checkout.razorpay.com/v1/checkout.js";
//     script.onload = () => resolve();
//     script.onerror = () => reject(new Error("Razorpay could not load. Check the internet connection."));
//     document.head.appendChild(script);
//   });
// }

// async function confirmPaid(kind, response, method) {
//   const proof = {
//     method,
//     razorpay_order_id: response.razorpay_order_id,
//     razorpay_payment_id: response.razorpay_payment_id,
//     razorpay_signature: response.razorpay_signature,
//   };
//   if (kind === "membership") {
//     await request("/membership/confirm", {
//       method: "POST",
//       body: JSON.stringify({ membership_id: memberState.paying.membership_id, ...proof }),
//     });
//     memberState.paying = null;
//     toast("Membership is active");
//     go("/membership");
//     return;
//   }
//   if (kind === "elite") {
//     await request("/elite/confirm", {
//       method: "POST",
//       body: JSON.stringify({ card_number: eliteState.paying.card_number, ...proof }),
//     });
//     eliteState.paying = null;
//     toast("Elite Card is active");
//     go("/elite");
//     return;
//   }
//   const paid = await request("/payments/confirm", {
//     method: "POST",
//     body: JSON.stringify({ booking_id: state.booking.id, ...proof }),
//   });
//   if (paid.payment_status !== "paid") throw new Error("Payment is not recorded yet.");
//   sessionStorage.removeItem(`pickleclub_upi_${state.booking.id}`);
//   go(`/confirmed/${state.booking.id}`);
// }

// async function openRazorpayCheckout(data, kind) {
//   await loadRazorpayScript();
//   const method = document.querySelector("input[name='method']:checked").value;
//   const rz = data.razorpay;
//   await new Promise((resolve, reject) => {
//     let settled = false;
//     const checkout = new window.Razorpay({
//       key: rz.key_id,
//       amount: rz.amount_paise,
//       currency: rz.currency || "INR",
//       name: "The Pickle Club",
//       description: rz.description,
//       order_id: rz.order_id,
//       theme: { color: "#07140d" },
//       handler: (response) => {
//         settled = true;
//         confirmPaid(kind, response, method).then(resolve).catch(reject);
//       },
//       modal: {
//         ondismiss: () => {
//           if (!settled) reject(new Error("Payment was closed before it finished."));
//         },
//       },
//     });
//     checkout.on("payment.failed", (failed) => {
//       settled = true;
//       reject(new Error((failed.error && failed.error.description) || "Payment failed"));
//     });
//     checkout.open();
//   });
// }

// async function openPayment(bookingId) {
//   memberState.paying = null;
//   eliteState.paying = null;
//   await loadClubConfig();
//   state.booking = await request(`/bookings/${bookingId}`);
//   document.getElementById("pay-back").href = `/book/${state.booking.court_id}`;
//   document.getElementById("pay-court").textContent = `${state.booking.court_name} · ${state.booking.tier}`;
//   document.getElementById("pay-when").textContent = `${state.booking.booking_date} · ${state.booking.time_slot} to ${state.booking.end_time}`;
//   document.getElementById("pay-duration").textContent = `${state.booking.duration_minutes / 60} hour(s)`;
//   document.getElementById("pay-amount").textContent = `Rs ${state.booking.amount}`;
//   state.upiReady = false;
//   prepareRazorpayPay();
//   if (state.booking.payment_status === "paid") go(`/confirmed/${state.booking.id}`);
// }

// function showPaymentQr(data, storageKey, openApp) {
//   if (!data || !data.qr_image_url) {
//     toast("Payment QR did not load. Tap Pay now again.");
//     return;
//   }
//   state.upiReady = true;
//   state.upiQr = data.qr_image_url;
//   state.upiUrl = data.upi_url;
//   if (storageKey) {
//     sessionStorage.setItem(storageKey, JSON.stringify({ qr: data.qr_image_url, url: data.upi_url }));
//   }
//   const img = document.getElementById("upi-qr");
//   const done = document.getElementById("payment-done");
//   const idLine = document.getElementById("upi-id-label");
//   if (img) img.classList.remove("hidden");
//   if (done) done.classList.remove("hidden");
//   if (idLine && idLine.parentElement) idLine.parentElement.classList.remove("hidden");
//   paintUpiBox();
//   const box = document.getElementById("upi-box");
//   if (box) box.scrollIntoView({ block: "nearest" });
//   if (openApp) openUpiApp(data.upi_url);
//   toast("QR is ready. Pay this amount, then tap I have completed the payment.");
// }

// async function pay(event) {
//   event.preventDefault();
//   const method = document.querySelector("input[name='method']:checked").value;
//   const path = window.location.pathname;
//   let data;
//   let kind = "court";
//   if (path === "/membership/pay" && memberState.paying) {
//     kind = "membership";
//     data = await request("/membership/checkout", {
//       method: "POST",
//       body: JSON.stringify({ membership_id: memberState.paying.membership_id, method }),
//     });
//   } else if (path === "/elite/pay" && eliteState.paying) {
//     kind = "elite";
//     data = await request("/elite/checkout", {
//       method: "POST",
//       body: JSON.stringify({ card_number: eliteState.paying.card_number, method }),
//     });
//   } else if (state.booking) {
//     data = await request("/payments/checkout", {
//       method: "POST",
//       body: JSON.stringify({ booking_id: state.booking.id, method }),
//     });
//   } else {
//     toast("Open the booking again, then tap Pay now.");
//     return;
//   }
//   if (data.razorpay) {
//     await openRazorpayCheckout(data, kind);
//     return;
//   }
//   if (method !== "UPI") {
//     toast("Pay with UPI. Card and net banking are not live yet.");
//     return;
//   }
//   const storageKey = kind === "membership"
//     ? `pickleclub_upi_mem_${memberState.paying.membership_id}`
//     : kind === "elite"
//       ? `pickleclub_upi_elite_${eliteState.paying.card_number}`
//       : `pickleclub_upi_${state.booking.id}`;
//   showPaymentQr(data, storageKey, true);
// }

// async function finishCourtPayment() {
//   const path = window.location.pathname;
//   if (path === "/membership/pay" && memberState.paying) {
//     await request("/membership/confirm", {
//       method: "POST",
//       body: JSON.stringify({ membership_id: memberState.paying.membership_id, method: "UPI" }),
//     });
//     memberState.paying = null;
//     toast("Membership is active");
//     go("/membership");
//     return;
//   }
//   if (path === "/elite/pay" && eliteState.paying) {
//     await request("/elite/confirm", {
//       method: "POST",
//       body: JSON.stringify({ card_number: eliteState.paying.card_number, method: "UPI" }),
//     });
//     eliteState.paying = null;
//     toast("Elite Card is active");
//     go("/elite");
//     return;
//   }
//   if (!state.booking) return;
//   const data = await request("/payments/confirm", {
//     method: "POST",
//     body: JSON.stringify({ booking_id: state.booking.id, method: "UPI" }),
//   });
//   if (data.payment_status !== "paid") {
//     toast("Payment is not recorded yet.");
//     return;
//   }
//   sessionStorage.removeItem(`pickleclub_upi_${state.booking.id}`);
//   go(`/confirmed/${state.booking.id}`);
// }

// async function openConfirmed(bookingId) {
//   const booking = await request(`/bookings/${bookingId}`);
//   if (booking.payment_status !== "paid") {
//     toast("Complete the UPI payment before confirmation.");
//     go(`/pay/${bookingId}`);
//     return;
//   }
//   document.getElementById("confirm-lines").innerHTML = `
//     <strong>${booking.court_name}</strong><br/>
//     ${booking.booking_date}<br/>
//     ${booking.time_slot} to ${booking.end_time}<br/>
//     Ref PC-${booking.id}<br/>
//     Paid Rs ${booking.amount}
//   `;
//   const sms = booking.sms;
//   document.getElementById("sms-box").textContent = sms
//     ? `Confirmation SMS queued to ${sms.phone}: ${sms.message}`
//     : "Add a mobile number on your account to receive the confirmation SMS.";
// }

// function sleep(ms) {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

// function whenImageReady(img) {
//   if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
//   return new Promise((resolve) => {
//     img.addEventListener("load", () => resolve(img.naturalWidth > 0), { once: true });
//     img.addEventListener("error", () => resolve(false), { once: true });
//   });
// }

// function screenForPath(path) {
//   if (path === "/login") return "login";
//   if (path === "/landing" || path === "/") return "landing";
//   if (path === "/membership") return "membership";
//   if (path === "/membership/review") return "membershipReview";
//   if (path === "/membership/pay") return "payment";
//   if (path === "/courts") return "courts";
//   if (path.startsWith("/book/")) return "booking";
//   if (path.startsWith("/pay/")) return "payment";
//   if (path.startsWith("/confirmed/")) return "confirmed";
//   if (path === "/elite") return "elite";
//   if (path === "/elite/card") return "eliteCard";
//   if (path === "/elite/pay") return "payment";
//   if (path === "/elite/book") return "eliteBook";
//   if (path === "/elite/admin") return "eliteAdmin";
//   return "landing";
// }

// async function route() {
//   const token = ++routeToken;
//   const path = window.location.pathname;
//   if (path === "/" || path === "") {
//     show("splash");
//     const userPromise = loadUser();
//     const splash = document.getElementById("screen-splash");
//     const logo = document.getElementById("splash-logo");
//     const loaded = await whenImageReady(logo);
//     if (token !== routeToken) return;
//     if (loaded) splash.classList.add("is-live");
//     const user = await userPromise;
//     await sleep(loaded ? 1900 : 400);
//     if (token !== routeToken) return;
//     const next = user ? "landing" : "login";
//     screens[next].classList.remove("hidden");
//     splash.classList.add("splash-leave");
//     await sleep(400);
//     if (token !== routeToken) return;
//     history.replaceState({}, "", next === "landing" ? "/landing" : "/login");
//     show(next);
//     if (next === "landing") openTerms(true);
//     return;
//   }
//   show(screenForPath(path));
//   const user = await loadUser();
//   if (token !== routeToken) return;
//   if (!user && path !== "/login") {
//     history.replaceState({}, "", "/login");
//     show("login");
//     return;
//   }
//   if (path === "/login") {
//     if (user) {
//       history.replaceState({}, "", "/landing");
//       show("landing");
//       openTerms(true);
//       return;
//     }
//     show("login");
//     return;
//   }
//   if (path === "/landing") { show("landing"); openTerms(true); return; }
//   if (path === "/membership") { show("membership"); await openMembership(); return; }
//   if (path === "/membership/review") { show("membershipReview"); await openMembershipReview(); return; }
//   if (path === "/membership/pay") { show("payment"); await openMembershipPayment(); return; }
//   if (path === "/courts") { show("courts"); await renderCourts(); return; }
//   if (path.startsWith("/book/")) {
//     show("booking");
//     await openBooking(path.split("/")[2]);
//     return;
//   }
//   if (path.startsWith("/pay/")) {
//     show("payment");
//     await openPayment(path.split("/")[2]);
//     return;
//   }
//   if (path.startsWith("/confirmed/")) {
//     show("confirmed");
//     await openConfirmed(path.split("/")[2]);
//     return;
//   }
//   if (path === "/elite" || path === "/elite/card") { await openElite(); return; }
//   if (path === "/elite/pay") { show("payment"); await openElitePayment(); return; }
//   if (path === "/elite/book") { await renderEliteBook(); return; }
//   if (path === "/elite/admin") { show("eliteAdmin"); await renderEliteAdmin(); }
// }

// document.addEventListener("click", (event) => {
//   if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
//   const link = event.target.closest("a[href]");
//   if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
//   const url = new URL(link.href, window.location.origin);
//   if (url.origin !== window.location.origin) return;
//   if (url.pathname.startsWith("/api") || url.pathname.startsWith("/static") || url.pathname.startsWith("/assets")) return;
//   event.preventDefault();
//   go(url.pathname + url.search);
// });
// window.addEventListener("popstate", () => {
//   route().catch((error) => toast(error.message));
// });

// const eliteState = { card: null, courts: [], courtId: null, date: null, start: null, end: null, paying: null };
// const memberState = { current: null, paying: null };

// function merchMarkup(items) {
//   const kit = {
//     tshirt: { src: "/assets/merch-tshirt.svg", title: "Club T-shirt", copy: "Complimentary match tee" },
//     sipper: { src: "/assets/merch-sipper.svg", title: "Club Sipper", copy: "Complimentary bottle" },
//   };
//   return (items || []).map((key) => {
//     const item = kit[key];
//     if (!item) return "";
//     return `<article class="merch-card"><img src="${item.src}" alt="${item.title}" /><strong>${item.title}</strong><p class="mini muted">${item.copy}</p></article>`;
//   }).join("");
// }

// async function activeMembership() {
//   const rows = await request("/membership/mine");
//   return rows.find((item) => item.activated && item.payment_status === "paid") || null;
// }

// async function openMembership() {
//   const active = await activeMembership();
//   const plansWrap = document.getElementById("membership-plans-wrap");
//   const activeWrap = document.getElementById("membership-active");
//   if (!active) {
//     plansWrap.classList.remove("hidden");
//     activeWrap.classList.add("hidden");
//     const plans = await request("/membership/plans");
//     const wrap = document.getElementById("membership-plans");
//     wrap.innerHTML = "";
//     plans.forEach((plan) => {
//       const card = document.createElement("article");
//       card.className = `offer-card member-plan ${plan.badge ? "best" : ""}`;
//       card.innerHTML = `
//         <p class="eyebrow">${plan.badge || "CLUB PLAN"}</p>
//         <h2>${plan.months} Month${plan.months === 1 ? "" : "s"}</h2>
//         <p class="amount">₹${plan.price.toLocaleString("en-IN")}</p>
//         <p class="muted">per person</p>
//         <p>Physical Membership Card</p>
//         <p>${plan.months}-month club membership</p>
//         <div class="merch-row">${merchMarkup(plan.merch)}</div>
//         <p class="mini muted">Digital membership details after purchase. Validity shown on your card.</p>
//         <button class="primary" type="button">Join Now</button>
//       `;
//       card.querySelector("button").onclick = () => selectMembership(plan.id);
//       wrap.appendChild(card);
//     });
//     return;
//   }
//   plansWrap.classList.add("hidden");
//   activeWrap.classList.remove("hidden");
//   document.getElementById("member-pass-name").textContent = active.holder_name;
//   document.getElementById("member-pass-id").textContent = active.membership_id;
//   document.getElementById("member-pass-plan").textContent = `${active.plan} · The Pickle Club`;
//   document.getElementById("member-pass-from").textContent = active.valid_from;
//   document.getElementById("member-pass-until").textContent = active.valid_until;
//   document.getElementById("member-pass-status").textContent = "Active";
//   document.getElementById("member-kit").innerHTML = merchMarkup(active.merch);
// }

// async function selectMembership(planId) {
//   try {
//     const data = await request("/membership/select", {
//       method: "POST",
//       body: JSON.stringify({ plan_id: planId }),
//     });
//     sessionStorage.setItem("membership_id", data.membership_id);
//     go(`/membership/review?id=${encodeURIComponent(data.membership_id)}`);
//   } catch (error) {
//     toast(error.message);
//   }
// }

// async function openMembershipReview() {
//   const id = new URLSearchParams(window.location.search).get("id") || sessionStorage.getItem("membership_id");
//   if (!id) {
//     go("/membership");
//     return;
//   }
//   const data = await request(`/membership/${encodeURIComponent(id)}`);
//   if (data.activated) {
//     go("/membership");
//     return;
//   }
//   memberState.current = data;
//   sessionStorage.setItem("membership_id", data.membership_id);
//   document.getElementById("member-review-plan").textContent = data.plan;
//   document.getElementById("member-review-duration").textContent = `${data.months} month${data.months === 1 ? "" : "s"} club membership`;
//   document.getElementById("member-review-price").textContent = `₹${data.price.toLocaleString("en-IN")}`;
//   document.getElementById("member-review-name").textContent = data.holder_name;
//   document.getElementById("member-review-phone").textContent = data.phone || "Add a mobile number on your account";
//   document.getElementById("member-review-kit").innerHTML = merchMarkup(data.merch);
// }

// async function openMembershipPayment() {
//   eliteState.paying = null;
//   await loadClubConfig();
//   const id = new URLSearchParams(window.location.search).get("id") || sessionStorage.getItem("membership_id");
//   if (!id) {
//     toast("Select a membership plan first.");
//     go("/membership");
//     return;
//   }
//   const data = await request(`/membership/${encodeURIComponent(id)}`);
//   if (data.activated) {
//     go("/membership");
//     return;
//   }
//   memberState.paying = data;
//   state.upiReady = false;
//   state.upiQr = "";
//   document.getElementById("pay-back").href = `/membership/review?id=${encodeURIComponent(data.membership_id)}`;
//   document.getElementById("pay-court").textContent = data.plan;
//   document.getElementById("pay-when").textContent = `${data.months} month membership · The Pickle Club`;
//   document.getElementById("pay-duration").textContent = "Activated only after payment";
//   document.getElementById("pay-amount").textContent = `₹${data.price.toLocaleString("en-IN")}`;
//   prepareRazorpayPay();
// }

// async function loadMembershipQr(openApp) {
//   const data = await request("/membership/checkout", {
//     method: "POST",
//     body: JSON.stringify({ membership_id: memberState.paying.membership_id, method: "UPI" }),
//   });
//   showPaymentQr(data, `pickleclub_upi_mem_${memberState.paying.membership_id}`, openApp);
// }

// async function eliteCards() {
//   return request("/elite/mine");
// }

// async function activeEliteCard() {
//   const cards = await eliteCards();
//   return cards.find((card) => card.activated && card.payment_status === "paid") || null;
// }

// async function pendingEliteCard() {
//   const cards = await eliteCards();
//   return cards.find((card) => !card.activated) || null;
// }

// async function openElite() {
//   const adminLink = document.getElementById("elite-admin-link");
//   if (state.user && state.user.role === "admin") adminLink.classList.remove("hidden");
//   const buying = new URLSearchParams(window.location.search).get("buy") === "1";
//   const active = await activeEliteCard();
//   if (buying || !active) {
//     show("elite");
//     await renderEliteOffers(active);
//     return;
//   }
//   show("eliteCard");
//   const card = await request("/elite/verify", {
//     method: "POST",
//     body: JSON.stringify({ card_number: active.card_number }),
//   });
//   if (!card.activated || card.payment_status !== "paid") {
//     show("elite");
//     await renderEliteOffers();
//     return;
//   }
//   saveElite(card.card_number);
//   paintEliteCard(card);
// }

// function saveElite(number) {
//   sessionStorage.setItem("elite_card", number);
// }

// async function renderEliteOffers(activeCard) {
//   const yourCard = document.getElementById("elite-your-card");
//   if (yourCard) {
//     yourCard.classList.toggle("hidden", !activeCard);
//     if (activeCard) yourCard.href = `/elite/card?card=${encodeURIComponent(activeCard.card_number)}`;
//   }
//   const offers = await request("/elite/offers");
//   const wrap = document.getElementById("elite-offers");
//   wrap.innerHTML = "";
//   offers.forEach((offer) => {
//     const card = document.createElement("article");
//     card.className = `offer-card ${offer.badge ? "best" : ""}`;
//     card.innerHTML = `
//       <p class="eyebrow">${offer.badge || "ELITE PACKAGE"}</p>
//       <h2>${offer.name}</h2>
//       <p>Book ${offer.paid_hours} hours</p>
//       <p>Get ${offer.bonus_hours} hour${offer.bonus_hours === 1 ? "" : "s"} free</p>
//       <p class="amount">Total: ${offer.total_hours} hours</p>
//       <p>Rs ${offer.price}</p>
//       <p class="muted">Rs 800/hr on weekdays · Rs 900/hr on weekends. You pay for ${offer.paid_hours} hours.</p>
//       <p class="muted">Offer open until ${offer.promo_end}. Hours stay valid for ${offer.validity_days} days after purchase.</p>
//       <button class="primary" type="button" ${offer.open ? "" : "disabled"}>${offer.open ? "Buy now" : "Offer closed"}</button>
//     `;
//     card.querySelector("button").onclick = () => buyElite(offer.id);
//     wrap.appendChild(card);
//   });
// }

// async function buyElite(offerId) {
//   try {
//     const data = await request("/elite/purchase", { method: "POST", body: JSON.stringify({ offer_id: offerId }) });
//     saveElite(data.card_number);
//     go(`/elite/pay?card=${encodeURIComponent(data.card_number)}`);
//   } catch (error) {
//     toast(error.message);
//   }
// }

// async function openElitePayment() {
//   memberState.paying = null;
//   await loadClubConfig();
//   const requested = (new URLSearchParams(window.location.search).get("card") || "").toUpperCase();
//   const cards = await eliteCards();
//   const requestedCard = requested ? cards.find((card) => card.card_number === requested) : null;
//   if (requestedCard && requestedCard.activated) {
//     go(`/elite/card?card=${encodeURIComponent(requestedCard.card_number)}`);
//     return;
//   }
//   const pending = (requestedCard && !requestedCard.activated)
//     ? requestedCard
//     : cards.find((card) => !card.activated);
//   if (!pending) {
//     toast("Choose an Elite package to buy.");
//     go("/elite?buy=1");
//     return;
//   }
//   eliteState.paying = pending;
//   state.upiReady = false;
//   state.upiQr = "";
//   document.getElementById("pay-back").href = "/elite?buy=1";
//   document.getElementById("pay-court").textContent = pending.package;
//   document.getElementById("pay-when").textContent = "Elite package hours. This purchase is separate from any card you already have.";
//   document.getElementById("pay-duration").textContent = `${pending.total_hours} hour package`;
//   document.getElementById("pay-amount").textContent = `Rs ${pending.price || 0}`;
//   prepareRazorpayPay();
// }

// async function loadEliteQr(openApp) {
//   const data = await request("/elite/checkout", {
//     method: "POST",
//     body: JSON.stringify({ card_number: eliteState.paying.card_number, method: "UPI" }),
//   });
//   showPaymentQr(data, `pickleclub_upi_elite_${eliteState.paying.card_number}`, openApp);
// }

// function paintEliteCard(card) {
//   eliteState.card = card;
//   document.getElementById("elite-card-number").textContent = card.card_number;
//   document.getElementById("elite-holder").textContent = card.holder_name;
//   document.getElementById("elite-package").textContent = `${card.package} · pay ${card.paid_hours} + ${card.bonus_hours} free`;
//   document.getElementById("elite-total").textContent = card.total_hours;
//   document.getElementById("elite-used").textContent = card.used_hours;
//   document.getElementById("elite-remaining").textContent = card.remaining_hours;
//   document.getElementById("elite-member-admin").classList.toggle("hidden", !state.user || state.user.role !== "admin");
//   document.getElementById("elite-until").textContent = card.valid_until;
//   document.getElementById("elite-meter-label").textContent = `${card.remaining_hours} / ${card.total_hours} hours remaining`;
//   document.getElementById("elite-meter-bar").style.width = `${card.total_hours ? (card.remaining_hours / card.total_hours) * 100 : 0}%`;
//   document.getElementById("elite-status-pill").textContent = card.status;
//   document.getElementById("elite-expiry-note").textContent = card.expiring_soon
//     ? "This card is close to its expiry date. Book the remaining hours soon."
//     : "A physical card with this number is issued at the club.";
//   const link = `${window.location.origin}/elite/card?card=${encodeURIComponent(card.card_number)}`;
//   document.getElementById("elite-qr").src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}`;
//   const bookLink = document.getElementById("elite-book-link");
//   bookLink.href = `/elite/book?card=${encodeURIComponent(card.card_number)}`;
//   bookLink.classList.toggle("hidden", !(card.activated && card.payment_status === "paid" && card.remaining_hours > 0));
//   const buyAgain = document.getElementById("elite-buy-again");
//   if (buyAgain) buyAgain.classList.remove("hidden");
//   const pay = document.getElementById("elite-pay-upi");
//   pay.classList.add("hidden");
//   pay.onclick = () => { if (upi) window.location.href = upi; };
//   const history = document.getElementById("elite-history");
//   history.innerHTML = "";
//   const rows = card.history || [];
//   if (!rows.length) {
//     history.innerHTML = `<p class="muted">No Elite bookings yet.</p>`;
//     return;
//   }
//   rows.forEach((item) => {
//     const block = document.createElement("article");
//     block.className = "history-item";
//     block.innerHTML = `
//       <strong>PC-${item.id}</strong> · ${item.status}<br/>
//       ${item.date_label} · ${item.court}<br/>
//       ${item.time_slot} to ${item.end_time} · ${item.hours} hour(s) deducted
//     `;
//     if (item.upcoming) {
//       const button = document.createElement("button");
//       button.className = "ghost";
//       button.type = "button";
//       button.textContent = "Cancel and return hours";
//       button.onclick = () => cancelEliteBooking(item.id, card.card_number);
//       block.appendChild(button);
//     }
//     history.appendChild(block);
//   });
// }

// async function renderEliteCard() {
//   await openElite();
// }

// async function cancelEliteBooking(id, number) {
//   try {
//     await request(`/elite/bookings/${id}/cancel`, { method: "POST" });
//     toast("Hours returned to your Elite Card");
//     saveElite(number);
//     await renderEliteCard();
//   } catch (error) {
//     toast(error.message);
//   }
// }

// function eliteQuote() {
//   const quote = document.getElementById("elite-deduct");
//   const card = eliteState.card;
//   if (!card || !eliteState.start || !eliteState.end) {
//     quote.textContent = "Select an available range.";
//     return;
//   }
//   const hours = Number(eliteState.end.slice(0, 2)) - Number(eliteState.start.slice(0, 2));
//   const after = card.remaining_hours - hours;
//   if (hours > card.remaining_hours) {
//     quote.textContent = `Insufficient Elite Card balance. You currently have ${card.remaining_hours} hour${card.remaining_hours === 1 ? "" : "s"} remaining.`;
//     return;
//   }
//   quote.textContent = `${hours} hour${hours === 1 ? "" : "s"} will be deducted from your Elite Card. Your remaining balance will be ${after} hour${after === 1 ? "" : "s"}.`;
// }

// async function renderEliteBook() {
//   const active = await activeEliteCard();
//   if (!active) {
//     toast("Purchase and activate an Elite package before booking a slot.");
//     go("/elite");
//     return;
//   }
//   const number = active.card_number;
//   saveElite(number);
//   show("eliteBook");
//   const dates = upcomingDates();
//   eliteState.date = eliteState.date || dates[0];
//   const dateWrap = document.getElementById("elite-dates");
//   dateWrap.innerHTML = "";
//   dates.forEach((date) => {
//     const btn = document.createElement("button");
//     btn.type = "button";
//     btn.className = `chip ${date === eliteState.date ? "active" : ""}`;
//     btn.textContent = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
//     btn.onclick = async () => {
//       eliteState.date = date;
//       eliteState.start = null;
//       eliteState.end = null;
//       await renderEliteBook();
//     };
//     dateWrap.appendChild(btn);
//   });
//   let data;
//   try {
//     data = await request(`/elite/day?booking_date=${eliteState.date}&card_number=${encodeURIComponent(number)}`);
//   } catch (error) {
//     toast("Buy another Elite Card. Pay now shows the payment QR.");
//     go("/elite?buy=1");
//     return;
//   }
//   eliteState.card = data.card;
//   eliteState.courts = data.courts;
//   if (!eliteState.courtId) eliteState.courtId = data.courts[0]?.id;
//   document.getElementById("elite-book-balance").textContent = `${data.card.remaining_hours} hrs left`;
//   document.getElementById("elite-book-back").href = `/elite/card?card=${encodeURIComponent(data.card.card_number)}`;
//   const courtWrap = document.getElementById("elite-courts");
//   courtWrap.innerHTML = "";
//   data.courts.forEach((court) => {
//     const btn = document.createElement("button");
//     btn.type = "button";
//     btn.className = `chip ${court.id === eliteState.courtId ? "active" : ""}`;
//     btn.textContent = court.name;
//     btn.onclick = () => {
//       eliteState.courtId = court.id;
//       eliteState.start = null;
//       eliteState.end = null;
//       renderEliteSlots();
//       courtWrap.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
//       btn.classList.add("active");
//     };
//     courtWrap.appendChild(btn);
//   });
//   renderEliteSlots();
// }

// function renderEliteSlots() {
//   const court = eliteState.courts.find((item) => item.id === eliteState.courtId);
//   const grid = document.getElementById("elite-slots");
//   grid.innerHTML = "";
//   if (!court) return;
//   court.slots.forEach((slot) => {
//     const btn = document.createElement("button");
//     btn.type = "button";
//     const selected = eliteState.start && eliteState.end && slot.time >= eliteState.start && slot.time < eliteState.end;
//     btn.className = `slot ${selected || eliteState.start === slot.time ? "active" : ""} ${slot.is_available ? "" : "unavailable"}`;
//     btn.textContent = slot.is_available ? `${slot.time} available` : `${slot.time} booked`;
//     btn.disabled = !slot.is_available;
//     btn.onclick = () => chooseEliteSlot(court, slot.time);
//     grid.appendChild(btn);
//   });
//   const starts = court.slots.filter((slot) => slot.is_available).map((slot) => slot.time);
//   const startSelect = document.getElementById("elite-start");
//   const endSelect = document.getElementById("elite-end");
//   fillSelect(startSelect, starts, eliteState.start);
//   const ends = eliteState.start ? eliteEnds(court, eliteState.start) : [];
//   fillSelect(endSelect, ends, eliteState.end);
//   startSelect.onchange = () => chooseEliteSlot(court, startSelect.value);
//   endSelect.onchange = () => {
//     eliteState.end = endSelect.value;
//     eliteQuote();
//     renderEliteSlots();
//   };
//   eliteQuote();
// }

// function eliteEnds(court, start) {
//   const map = new Map(court.slots.map((slot) => [slot.time, slot.is_available]));
//   const times = court.slots.map((slot) => slot.time);
//   const index = times.indexOf(start);
//   const options = [];
//   if (index < 0) return options;
//   for (let i = index; i < times.length; i += 1) {
//     if (!map.get(times[i])) break;
//     options.push(i === times.length - 1 ? "24:00" : times[i + 1]);
//   }
//   return options;
// }

// function chooseEliteSlot(court, start) {
//   eliteState.start = start;
//   const ends = eliteEnds(court, start);
//   if (!ends.includes(eliteState.end)) eliteState.end = ends[0] || null;
//   renderEliteSlots();
// }

// async function confirmEliteBooking() {
//   const card = eliteState.card;
//   if (!card || !eliteState.start || !eliteState.end) {
//     toast("Select a court and time first.");
//     return;
//   }
//   const hours = Number(eliteState.end.slice(0, 2)) - Number(eliteState.start.slice(0, 2));
//   if (hours > card.remaining_hours) {
//     toast(`Insufficient Elite Card balance. You currently have ${card.remaining_hours} hour${card.remaining_hours === 1 ? "" : "s"} remaining.`);
//     return;
//   }
//   try {
//     const data = await request("/elite/book", {
//       method: "POST",
//       body: JSON.stringify({
//         card_number: card.card_number,
//         booking_date: eliteState.date,
//         court_id: eliteState.courtId,
//         start_time: eliteState.start,
//         end_time: eliteState.end,
//       }),
//     });
//     toast(`Booked. ${data.remaining_hours} hours left.`);
//     saveElite(card.card_number);
//     go(`/elite/card?card=${encodeURIComponent(card.card_number)}`);
//   } catch (error) {
//     toast(error.message);
//   }
// }

// async function renderEliteAdmin() {
//   if (!state.user || state.user.role !== "admin") {
//     toast("Admin access required");
//     go("/elite");
//     return;
//   }
//   const load = async (q = "") => {
//     const cards = await request(`/admin/elite/cards?q=${encodeURIComponent(q)}`);
//     const list = document.getElementById("elite-admin-list");
//     list.innerHTML = "";
//     cards.forEach((card) => {
//       const block = document.createElement("article");
//       block.className = "history-item";
//       block.innerHTML = `
//         <strong>${card.card_number}</strong> · ${card.status}<br/>
//         ${card.holder_name} · ${card.phone}<br/>
//         ${card.package} · ${card.remaining_hours} of ${card.total_hours} hours left · until ${card.valid_until}
//       `;
//       const actions = document.createElement("div");
//       actions.className = "landing-actions";
//       const addBtn = document.createElement("button");
//       addBtn.className = "ghost";
//       addBtn.type = "button";
//       addBtn.textContent = "Add 1 hour";
//       addBtn.onclick = () => adjustElite(card.id, { hours_delta: 1, note: "Added 1 hour" }, q);
//       const offBtn = document.createElement("button");
//       offBtn.className = "ghost";
//       offBtn.type = "button";
//       offBtn.textContent = card.status === "inactive" ? "Activate" : "Deactivate";
//       offBtn.onclick = () => adjustElite(card.id, { status: card.status === "inactive" ? "active" : "inactive", note: "Status change" }, q);
//       const extendBtn = document.createElement("button");
//       extendBtn.className = "ghost";
//       extendBtn.type = "button";
//       extendBtn.textContent = "Extend 30 days";
//       extendBtn.onclick = () => adjustElite(card.id, { extend_days: 30, note: "Validity extended" }, q);
//       const replaceBtn = document.createElement("button");
//       replaceBtn.className = "ghost";
//       replaceBtn.type = "button";
//       replaceBtn.textContent = "Replace lost card";
//       replaceBtn.onclick = () => adjustElite(card.id, { replace_card: true, note: "Lost card replaced" }, q);
//       actions.append(addBtn, offBtn, extendBtn, replaceBtn);
//       block.appendChild(actions);
//       list.appendChild(block);
//     });
//   };
//   document.getElementById("elite-admin-search").onsubmit = (event) => {
//     event.preventDefault();
//     load(document.getElementById("elite-admin-q").value).catch((error) => toast(error.message));
//   };
//   await load("");
// }

// async function adjustElite(id, body, q) {
//   try {
//     await request(`/admin/elite/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) });
//     toast("Elite Card updated");
//     document.getElementById("elite-admin-q").value = q;
//     document.getElementById("elite-admin-search").requestSubmit();
//   } catch (error) {
//     toast(error.message);
//   }
// }

// document.getElementById("confirm-booking").onclick = () => confirmBooking().catch((error) => toast(error.message));
// document.getElementById("elite-confirm").onclick = () => confirmEliteBooking().catch((error) => toast(error.message));
// document.getElementById("member-proceed").onclick = () => {
//   const id = (memberState.current && memberState.current.membership_id) || sessionStorage.getItem("membership_id");
//   if (!id) {
//     toast("Select a membership plan first.");
//     go("/membership");
//     return;
//   }
//   go(`/membership/pay?id=${encodeURIComponent(id)}`);
// };
// document.getElementById("pay-form").onsubmit = (event) => pay(event).catch((error) => toast(error.message));
// document.getElementById("payment-done").onclick = () => finishCourtPayment().catch((error) => toast(error.message));
// bindAuth();
// bindPayMethods();
// loadClubConfig().catch(() => {});
// route().catch((error) => toast(error.message));








const API = "/api";
const TOKEN_KEY = "pickleclub_token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  courts: [],
  court: null,
  date: null,
  slots: [],
  start: null,
  end: null,
  booking: null,
};

const screens = {
  splash: document.getElementById("screen-splash"),
  login: document.getElementById("screen-login"),
  landing: document.getElementById("screen-landing"),
  courts: document.getElementById("screen-courts"),
  booking: document.getElementById("screen-booking"),
  payment: document.getElementById("screen-payment"),
  confirmed: document.getElementById("screen-confirmed"),
  elite: document.getElementById("screen-elite"),
  eliteCard: document.getElementById("screen-elite-card"),
  eliteBook: document.getElementById("screen-elite-book"),
  eliteAdmin: document.getElementById("screen-elite-admin"),
  membership: document.getElementById("screen-membership"),
  membershipReview: document.getElementById("screen-membership-review"),
};

let termsAutoShown = false;

function openTerms(auto) {
  if (auto && termsAutoShown) return;
  if (auto) termsAutoShown = true;
  const more = document.getElementById("more-panel");
  if (more) more.classList.add("hidden");
  document.getElementById("terms-modal").classList.remove("hidden");
}

function closeTerms() {
  document.getElementById("terms-modal").classList.add("hidden");
}

function show(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (el) el.classList.toggle("hidden", key !== name);
  });
  if (name !== "landing") closeTerms();
}

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2200);
}

let routeToken = 0;

function go(path) {
  const next = new URL(path, window.location.origin);
  if (next.origin !== window.location.origin) {
    window.location.href = path;
    return;
  }
  const target = next.pathname + next.search;
  const current = window.location.pathname + window.location.search;
  if (target !== current) history.pushState({}, "", target);
  route().catch((error) => toast(error.message));
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      state.token = "";
      state.user = null;
    }
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function upcomingDates() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return isoDate(d);
  });
}

function hour(time) {
  return Number(String(time).slice(0, 2));
}

async function loadUser() {
  if (!state.token) return null;
  try {
    const data = await request("/auth/me");
    state.user = data.user;
    return state.user;
  } catch {
    return null;
  }
}

function bindAuth() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  document.getElementById("show-login").onclick = () => {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    document.getElementById("show-login").classList.add("active");
    document.getElementById("show-register").classList.remove("active");
  };
  document.getElementById("show-register").onclick = () => {
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    document.getElementById("show-register").classList.add("active");
    document.getElementById("show-login").classList.remove("active");
  };
  loginForm.onsubmit = async (event) => {
    event.preventDefault();
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("login-email").value.trim(),
          password: document.getElementById("login-password").value,
        }),
      });
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem(TOKEN_KEY, data.token);
      go("/landing");
    } catch (error) {
      toast(error.message);
    }
  };
  registerForm.onsubmit = async (event) => {
    event.preventDefault();
    try {
      await request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("register-name").value.trim(),
          email: document.getElementById("register-email").value.trim(),
          phone: document.getElementById("register-phone").value.trim(),
          password: document.getElementById("register-password").value,
        }),
      });
      toast("Account created. Please login.");
      document.getElementById("show-login").click();
    } catch (error) {
      toast(error.message);
    }
  };
  document.getElementById("more-btn").onclick = () => {
    document.getElementById("more-panel").classList.toggle("hidden");
  };
  document.getElementById("terms-btn").onclick = () => openTerms(false);
  document.getElementById("terms-modal").onclick = (event) => {
    if (event.target.id === "terms-modal") closeTerms();
  };
  document.getElementById("logout-btn").onclick = async () => {
    try { await request("/auth/logout", { method: "POST" }); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    state.token = "";
    go("/login");
  };
}

async function renderCourts() {
  state.courts = await request("/courts");
  const list = document.getElementById("courts-list");
  list.innerHTML = "";
  state.courts.forEach((court) => {
    const card = document.createElement("a");
    card.className = "court-card";
    card.href = `/book/${court.id}`;
    card.innerHTML = `
      <img src="${court.image_url}" alt="" />
      <div class="court-body">
        <h3>${court.name}</h3>
        <p class="muted">${court.area || "The Pickle Club, Behind University Campus, Kachimet 440033"}</p>
        <div class="court-meta">
          <span>Same club</span>
          <strong>Rs ${court.weekday_rate || 800}/hr</strong>
        </div>
        <p class="mini muted">Weekend Rs ${court.weekend_rate || 900}/hr</p>
        <p>★ ${court.rating || "-"} (${court.review_count || 0})</p>
        <span class="primary">Select court</span>
      </div>
    `;
    list.appendChild(card);
  });
}

function renderDates() {
  const dates = upcomingDates();
  if (!state.date) state.date = dates[0];
  const wrap = document.getElementById("date-chips");
  wrap.innerHTML = "";
  dates.forEach((date) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip ${date === state.date ? "active" : ""}`;
    btn.textContent = new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    btn.onclick = async () => {
      state.date = date;
      state.start = null;
      state.end = null;
      await loadSlots();
    };
    wrap.appendChild(btn);
  });
}

function endOptions(start) {
  const map = new Map(state.slots.map((slot) => [slot.time, slot.is_available]));
  const times = state.slots.map((slot) => slot.time);
  const index = times.indexOf(start);
  const options = [];
  if (index < 0) return options;
  for (let i = index; i < times.length; i += 1) {
    if (!map.get(times[i])) break;
    options.push(i === times.length - 1 ? "24:00" : times[i + 1]);
  }
  return options;
}

function fillSelect(select, values, selected) {
  select.innerHTML = "";
  values.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });
  if (selected && values.includes(selected)) select.value = selected;
}

function isWeekend(dateValue) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function hourlyRate(dateValue) {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  const weekend = day === 0 || day === 6;
  const weekdayRate = state.court?.weekday_rate || 800;
  const weekendRate = state.court?.weekend_rate || 900;
  return weekend ? weekendRate : weekdayRate;
}

function updateQuote() {
  const quote = document.getElementById("quote");
  if (!state.court || !state.start) {
    quote.textContent = "Select an available range.";
    return;
  }
  if (!state.end) {
    quote.textContent = `${state.start} selected. Select the end time.`;
    return;
  }
  const hours = hour(state.end) - hour(state.start);
  const rate = hourlyRate(state.date);
  const amount = rate * hours;
  const dayLabel = isWeekend(state.date) ? "weekend" : "weekday";
  quote.textContent = `${state.start} to ${state.end} · ${hours} hr · Rs ${rate}/hr ${dayLabel} · Rs ${amount}`;
}

function padHour(value) {
  return `${String(value).padStart(2, "0")}:00`;
}

function hourIsSelected(time) {
  if (!state.start) return false;
  if (!state.end) return time === state.start;
  return time >= state.start && time < state.end;
}

function chooseCourtTime(time) {
  if (time === "24:00") {
    if (!state.start || !endOptions(state.start).includes("24:00")) return;
    if (state.end === "24:00") {
      state.end = "23:00";
      if (state.end <= state.start) {
        state.start = null;
        state.end = null;
      }
    } else {
      state.end = "24:00";
    }
    renderSlots();
    return;
  }
  const canStart = state.slots.some((slot) => slot.time === time && slot.is_available);
  if (hourIsSelected(time)) {
    const next = padHour(hour(state.start) + 1);
    if (!state.end || (time === state.start && state.end === next)) {
      state.start = null;
      state.end = null;
    } else if (time === state.start) {
      state.start = next;
    } else {
      state.end = time;
    }
    renderSlots();
    return;
  }
  const endsNow = state.start ? endOptions(state.start) : [];
  if (state.start && hour(time) > hour(state.start) && endsNow.includes(time)) {
    state.end = time;
    renderSlots();
    return;
  }
  if (!canStart) return;
  state.start = time;
  state.end = null;
  renderSlots();
}

function renderSlots() {
  const grid = document.getElementById("slots-grid");
  grid.innerHTML = "";
  const starts = state.slots.filter((slot) => slot.is_available).map((slot) => slot.time);
  if (state.start && !starts.includes(state.start)) {
    state.start = null;
    state.end = null;
  }
  const ends = state.start ? endOptions(state.start) : [];
  if (state.start && state.end && !ends.includes(state.end)) state.end = null;
  state.slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const selected = hourIsSelected(slot.time) || slot.time === state.end;
    const canClose = ends.includes(slot.time);
    btn.className = `slot ${selected ? "active" : ""} ${slot.is_available ? "" : "unavailable"}`;
    if (slot.is_available) {
      btn.textContent = slot.time;
    } else {
      const label = document.createElement("span");
      label.textContent = slot.time;
      const note = document.createElement("small");
      note.textContent = "Booked";
      btn.append(label, note);
    }
    btn.disabled = !slot.is_available && !canClose;
    btn.onclick = () => chooseCourtTime(slot.time);
    grid.appendChild(btn);
  });
  if (ends.includes("24:00")) {
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = `slot ${state.end === "24:00" ? "active" : ""}`;
    closeBtn.textContent = "24:00";
    closeBtn.onclick = () => chooseCourtTime("24:00");
    grid.appendChild(closeBtn);
  }
  const startSelect = document.getElementById("start-time");
  const endSelect = document.getElementById("end-time");
  fillSelect(startSelect, starts, state.start);
  fillSelect(endSelect, ends, state.end);
  startSelect.onchange = () => {
    state.start = startSelect.value;
    state.end = null;
    renderSlots();
  };
  endSelect.onchange = () => {
    state.end = endSelect.value;
    updateQuote();
  };
  updateQuote();
  renderDates();
}

async function loadSlots() {
  if (!state.date) state.date = upcomingDates()[0];
  const data = await request(`/slots?booking_date=${state.date}&court_id=${state.court.id}`);
  state.slots = data.slots;
  renderSlots();
}

async function openBooking(courtId) {
  if (!state.courts.length) state.courts = await request("/courts");
  state.court = state.courts.find((court) => String(court.id) === String(courtId));
  if (!state.court) {
    toast("Court not found");
    go("/courts");
    return;
  }
  document.getElementById("booking-title").textContent = state.court.name;
  document.getElementById("booking-name").textContent = state.court.name;
  document.getElementById("booking-tier").textContent = state.court.tier;
  document.getElementById("booking-area").textContent = state.court.area || "The Pickle Club, Behind University Campus, Kachimet 440033";
  document.getElementById("booking-price").textContent = `Rs ${state.court.weekday_rate || 800}/hr · Weekend Rs ${state.court.weekend_rate || 900}`;
  document.getElementById("booking-image").src = state.court.image_url;
  state.date = null;
  state.start = null;
  state.end = null;
  await loadSlots();
}

async function confirmBooking() {
  if (!state.user) {
    go("/login");
    return;
  }
  if (!state.start || !state.end) {
    toast("Select a time range first.");
    return;
  }
  const data = await request("/bookings", {
    method: "POST",
    body: JSON.stringify({
      booking_date: state.date,
      court_id: state.court.id,
      start_time: state.start,
      end_time: state.end,
      players: 2,
      player_name: state.user.name,
      phone: state.user.phone || "",
    }),
  });
  go(`/pay/${data.booking_id}`);
}

async function loadClubConfig() {
  if (state.clubConfig) return state.clubConfig;
  try {
    state.clubConfig = await request("/club/config");
  } catch {
    state.clubConfig = {
      upi_id: "496373@ybl",
      qr_image_url: "/assets/upi-qr.png",
      maps_url: "https://maps.app.goo.gl/wXmPLPzKQJfunk658?g_st=ig",
    };
  }
  return state.clubConfig;
}

function isPhone() {
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
}

function paintUpiBox() {
  const box = document.getElementById("upi-box");
  if (!state.upiReady) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  const cfg = state.clubConfig || {};
  if (state.upiQr) document.getElementById("upi-qr").src = state.upiQr;
  if (cfg.upi_id) document.getElementById("upi-id-label").textContent = cfg.upi_id;
  document.getElementById("upi-help").textContent = isPhone()
    ? "Your UPI app should be open with this amount. Come back here and tap the button below only after the payment succeeds."
    : "Scan this QR with PhonePe, GPay, or Paytm. The booking is confirmed only after you tap the button below.";
}

function bindPayMethods() {
  document.querySelectorAll("input[name='method']").forEach((input) => {
    input.onchange = () => paintUpiBox();
  });
}

function openUpiApp(url) {
  if (!url || !isPhone()) return;
  window.location.href = url;
}

function prepareRazorpayPay() {
  state.upiReady = false;
  state.razorpay = true;
  const box = document.getElementById("upi-box");
  const img = document.getElementById("upi-qr");
  const done = document.getElementById("payment-done");
  const idLine = document.getElementById("upi-id-label");
  if (img) img.classList.add("hidden");
  if (done) done.classList.add("hidden");
  if (idLine && idLine.parentElement) idLine.parentElement.classList.add("hidden");
  if (box) box.classList.remove("hidden");
  const help = document.getElementById("upi-help");
  if (help) help.textContent = "Tap Pay now. Razorpay opens in test mode. This is confirmed only after the payment succeeds.";
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Razorpay could not load. Check the internet connection."));
    document.head.appendChild(script);
  });
}

async function confirmPaid(kind, response, method) {
  const proof = {
    method,
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature,
  };
  if (kind === "membership") {
    await request("/membership/confirm", {
      method: "POST",
      body: JSON.stringify({ membership_id: memberState.paying.membership_id, ...proof }),
    });
    memberState.paying = null;
    toast("Membership is active");
    go("/membership");
    return;
  }
  if (kind === "elite") {
    await request("/elite/confirm", {
      method: "POST",
      body: JSON.stringify({ card_number: eliteState.paying.card_number, ...proof }),
    });
    eliteState.paying = null;
    toast("Elite Card is active");
    go("/elite");
    return;
  }
  const paid = await request("/payments/confirm", {
    method: "POST",
    body: JSON.stringify({ booking_id: state.booking.id, ...proof }),
  });
  if (paid.payment_status !== "paid") throw new Error("Payment is not recorded yet.");
  sessionStorage.removeItem(`pickleclub_upi_${state.booking.id}`);
  go(`/confirmed/${state.booking.id}`);
}

async function openRazorpayCheckout(data, kind) {
  await loadRazorpayScript();
  const method = document.querySelector("input[name='method']:checked").value;
  const rz = data.razorpay;
  await new Promise((resolve, reject) => {
    let settled = false;
    const checkout = new window.Razorpay({
      key: rz.key_id,
      amount: rz.amount_paise,
      currency: rz.currency || "INR",
      name: "The Pickle Club",
      description: rz.description,
      order_id: rz.order_id,
      theme: { color: "#07140d" },
      handler: (response) => {
        settled = true;
        confirmPaid(kind, response, method).then(resolve).catch(reject);
      },
      modal: {
        ondismiss: () => {
          if (!settled) reject(new Error("Payment was closed before it finished."));
        },
      },
    });
    checkout.on("payment.failed", (failed) => {
      settled = true;
      reject(new Error((failed.error && failed.error.description) || "Payment failed"));
    });
    checkout.open();
  });
}

async function openPayment(bookingId) {
  memberState.paying = null;
  eliteState.paying = null;
  await loadClubConfig();
  state.booking = await request(`/bookings/${bookingId}`);
  document.getElementById("pay-back").href = `/book/${state.booking.court_id}`;
  document.getElementById("pay-court").textContent = `${state.booking.court_name} · ${state.booking.tier}`;
  document.getElementById("pay-when").textContent = `${state.booking.booking_date} · ${state.booking.time_slot} to ${state.booking.end_time}`;
  document.getElementById("pay-duration").textContent = `${state.booking.duration_minutes / 60} hour(s)`;
  document.getElementById("pay-amount").textContent = `Rs ${state.booking.amount}`;
  state.upiReady = false;
  prepareRazorpayPay();
  if (state.booking.payment_status === "paid") go(`/confirmed/${state.booking.id}`);
}

function showPaymentQr(data, storageKey, openApp) {
  if (!data || !data.qr_image_url) {
    toast("Payment QR did not load. Tap Pay now again.");
    return;
  }
  state.upiReady = true;
  state.upiQr = data.qr_image_url;
  state.upiUrl = data.upi_url;
  if (storageKey) {
    sessionStorage.setItem(storageKey, JSON.stringify({ qr: data.qr_image_url, url: data.upi_url }));
  }
  const img = document.getElementById("upi-qr");
  const done = document.getElementById("payment-done");
  const idLine = document.getElementById("upi-id-label");
  if (img) img.classList.remove("hidden");
  if (done) done.classList.remove("hidden");
  if (idLine && idLine.parentElement) idLine.parentElement.classList.remove("hidden");
  paintUpiBox();
  const box = document.getElementById("upi-box");
  if (box) box.scrollIntoView({ block: "nearest" });
  if (openApp) openUpiApp(data.upi_url);
  toast("QR is ready. Pay this amount, then tap I have completed the payment.");
}

async function pay(event) {
  event.preventDefault();
  const method = document.querySelector("input[name='method']:checked").value;
  const path = window.location.pathname;
  let data;
  let kind = "court";
  if (path === "/membership/pay" && memberState.paying) {
    kind = "membership";
    data = await request("/membership/checkout", {
      method: "POST",
      body: JSON.stringify({ membership_id: memberState.paying.membership_id, method }),
    });
  } else if (path === "/elite/pay" && eliteState.paying) {
    kind = "elite";
    data = await request("/elite/checkout", {
      method: "POST",
      body: JSON.stringify({ card_number: eliteState.paying.card_number, method }),
    });
  } else if (state.booking) {
    data = await request("/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ booking_id: state.booking.id, method }),
    });
  } else {
    toast("Open the booking again, then tap Pay now.");
    return;
  }
  if (data.razorpay) {
    await openRazorpayCheckout(data, kind);
    return;
  }
  if (method !== "UPI") {
    toast("Pay with UPI. Card and net banking are not live yet.");
    return;
  }
  const storageKey = kind === "membership"
    ? `pickleclub_upi_mem_${memberState.paying.membership_id}`
    : kind === "elite"
      ? `pickleclub_upi_elite_${eliteState.paying.card_number}`
      : `pickleclub_upi_${state.booking.id}`;
  showPaymentQr(data, storageKey, true);
}

async function finishCourtPayment() {
  const path = window.location.pathname;
  if (path === "/membership/pay" && memberState.paying) {
    await request("/membership/confirm", {
      method: "POST",
      body: JSON.stringify({ membership_id: memberState.paying.membership_id, method: "UPI" }),
    });
    memberState.paying = null;
    toast("Membership is active");
    go("/membership");
    return;
  }
  if (path === "/elite/pay" && eliteState.paying) {
    await request("/elite/confirm", {
      method: "POST",
      body: JSON.stringify({ card_number: eliteState.paying.card_number, method: "UPI" }),
    });
    eliteState.paying = null;
    toast("Elite Card is active");
    go("/elite");
    return;
  }
  if (!state.booking) return;
  const data = await request("/payments/confirm", {
    method: "POST",
    body: JSON.stringify({ booking_id: state.booking.id, method: "UPI" }),
  });
  if (data.payment_status !== "paid") {
    toast("Payment is not recorded yet.");
    return;
  }
  sessionStorage.removeItem(`pickleclub_upi_${state.booking.id}`);
  go(`/confirmed/${state.booking.id}`);
}

async function openConfirmed(bookingId) {
  const booking = await request(`/bookings/${bookingId}`);
  if (booking.payment_status !== "paid") {
    toast("Complete the UPI payment before confirmation.");
    go(`/pay/${bookingId}`);
    return;
  }
  document.getElementById("confirm-lines").innerHTML = `
    <strong>${booking.court_name}</strong><br/>
    ${booking.booking_date}<br/>
    ${booking.time_slot} to ${booking.end_time}<br/>
    Ref PC-${booking.id}<br/>
    Paid Rs ${booking.amount}
  `;
  const sms = booking.sms;
  document.getElementById("sms-box").textContent = sms
    ? `Confirmation SMS queued to ${sms.phone}: ${sms.message}`
    : "Add a mobile number on your account to receive the confirmation SMS.";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function whenImageReady(img) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve(true);
  return new Promise((resolve) => {
    img.addEventListener("load", () => resolve(img.naturalWidth > 0), { once: true });
    img.addEventListener("error", () => resolve(false), { once: true });
  });
}

function screenForPath(path) {
  if (path === "/login") return "login";
  if (path === "/landing" || path === "/") return "landing";
  if (path === "/membership") return "membership";
  if (path === "/membership/review") return "membershipReview";
  if (path === "/membership/pay") return "payment";
  if (path === "/courts") return "courts";
  if (path.startsWith("/book/")) return "booking";
  if (path.startsWith("/pay/")) return "payment";
  if (path.startsWith("/confirmed/")) return "confirmed";
  if (path === "/elite") return "elite";
  if (path === "/elite/card") return "eliteCard";
  if (path === "/elite/pay") return "payment";
  if (path === "/elite/book") return "eliteBook";
  if (path === "/elite/admin") return "eliteAdmin";
  return "landing";
}

async function route() {
  const token = ++routeToken;
  const path = window.location.pathname;
  if (path === "/" || path === "") {
    show("splash");
    const userPromise = loadUser();
    const splash = document.getElementById("screen-splash");
    const logo = document.getElementById("splash-logo");
    const loaded = await whenImageReady(logo);
    if (token !== routeToken) return;
    if (loaded) splash.classList.add("is-live");
    const user = await userPromise;
    await sleep(loaded ? 1900 : 400);
    if (token !== routeToken) return;
    const next = user ? "landing" : "login";
    screens[next].classList.remove("hidden");
    splash.classList.add("splash-leave");
    await sleep(400);
    if (token !== routeToken) return;
    history.replaceState({}, "", next === "landing" ? "/landing" : "/login");
    show(next);
    if (next === "landing") openTerms(true);
    return;
  }
  show(screenForPath(path));
  const user = await loadUser();
  if (token !== routeToken) return;
  if (!user && path !== "/login") {
    history.replaceState({}, "", "/login");
    show("login");
    return;
  }
  if (path === "/login") {
    if (user) {
      history.replaceState({}, "", "/landing");
      show("landing");
      openTerms(true);
      return;
    }
    show("login");
    return;
  }
  if (path === "/landing") { show("landing"); openTerms(true); return; }
  if (path === "/membership") { show("membership"); await openMembership(); return; }
  if (path === "/membership/review") { show("membershipReview"); await openMembershipReview(); return; }
  if (path === "/membership/pay") { show("payment"); await openMembershipPayment(); return; }
  if (path === "/courts") { show("courts"); await renderCourts(); return; }
  if (path.startsWith("/book/")) {
    show("booking");
    await openBooking(path.split("/")[2]);
    return;
  }
  if (path.startsWith("/pay/")) {
    show("payment");
    await openPayment(path.split("/")[2]);
    return;
  }
  if (path.startsWith("/confirmed/")) {
    show("confirmed");
    await openConfirmed(path.split("/")[2]);
    return;
  }
  if (path === "/elite" || path === "/elite/card") { await openElite(); return; }
  if (path === "/elite/pay") { show("payment"); await openElitePayment(); return; }
  if (path === "/elite/book") { await renderEliteBook(); return; }
  if (path === "/elite/admin") { show("eliteAdmin"); await renderEliteAdmin(); }
}

document.addEventListener("click", (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
  const url = new URL(link.href, window.location.origin);
  if (url.origin !== window.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/static") || url.pathname.startsWith("/assets")) return;
  event.preventDefault();
  go(url.pathname + url.search);
});
window.addEventListener("popstate", () => {
  route().catch((error) => toast(error.message));
});

const eliteState = { card: null, courts: [], courtId: null, date: null, start: null, end: null, paying: null };
const memberState = { current: null, paying: null };

function merchMarkup(items) {
  const kit = {
    tshirt: { src: "/assets/merch-tshirt.png?v=1", title: "Club T-shirt", copy: "Complimentary match tee" },
    sipper: { src: "/assets/merch-sipper.svg", title: "Club Sipper", copy: "Complimentary bottle" },
  };
  return (items || []).map((key) => {
    const item = kit[key];
    if (!item) return "";
    return `<article class="merch-card"><img src="${item.src}" alt="${item.title}" /><strong>${item.title}</strong><p class="mini muted">${item.copy}</p></article>`;
  }).join("");
}

async function activeMembership() {
  const rows = await request("/membership/mine");
  return rows.find((item) => item.activated && item.payment_status === "paid") || null;
}

async function openMembership() {
  const active = await activeMembership();
  const plansWrap = document.getElementById("membership-plans-wrap");
  const activeWrap = document.getElementById("membership-active");
  if (!active) {
    plansWrap.classList.remove("hidden");
    activeWrap.classList.add("hidden");
    const plans = await request("/membership/plans");
    const wrap = document.getElementById("membership-plans");
    wrap.innerHTML = "";
    plans.forEach((plan) => {
      const card = document.createElement("article");
      card.className = `offer-card member-plan ${plan.badge ? "best" : ""}`;
      card.innerHTML = `
        <p class="eyebrow">${plan.badge || "CLUB PLAN"}</p>
        <h2>${plan.months} Month${plan.months === 1 ? "" : "s"}</h2>
        <p class="amount">₹${plan.price.toLocaleString("en-IN")}</p>
        <p class="muted">per person</p>
        <p>Physical Membership Card</p>
        <p>${plan.months}-month club membership</p>
        <div class="merch-row">${merchMarkup(plan.merch)}</div>
        <p class="mini muted">Digital membership details after purchase. Validity shown on your card.</p>
        <button class="primary" type="button">Join Now</button>
      `;
      card.querySelector("button").onclick = () => selectMembership(plan.id);
      wrap.appendChild(card);
    });
    return;
  }
  plansWrap.classList.add("hidden");
  activeWrap.classList.remove("hidden");
  document.getElementById("member-pass-name").textContent = active.holder_name;
  document.getElementById("member-pass-id").textContent = active.membership_id;
  document.getElementById("member-pass-plan").textContent = `${active.plan} · The Pickle Club`;
  document.getElementById("member-pass-from").textContent = active.valid_from;
  document.getElementById("member-pass-until").textContent = active.valid_until;
  document.getElementById("member-pass-status").textContent = "Active";
  document.getElementById("member-kit").innerHTML = merchMarkup(active.merch);
}

async function selectMembership(planId) {
  try {
    const data = await request("/membership/select", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId }),
    });
    sessionStorage.setItem("membership_id", data.membership_id);
    go(`/membership/review?id=${encodeURIComponent(data.membership_id)}`);
  } catch (error) {
    toast(error.message);
  }
}

async function openMembershipReview() {
  const id = new URLSearchParams(window.location.search).get("id") || sessionStorage.getItem("membership_id");
  if (!id) {
    go("/membership");
    return;
  }
  const data = await request(`/membership/${encodeURIComponent(id)}`);
  if (data.activated) {
    go("/membership");
    return;
  }
  memberState.current = data;
  sessionStorage.setItem("membership_id", data.membership_id);
  document.getElementById("member-review-plan").textContent = data.plan;
  document.getElementById("member-review-duration").textContent = `${data.months} month${data.months === 1 ? "" : "s"} club membership`;
  document.getElementById("member-review-price").textContent = `₹${data.price.toLocaleString("en-IN")}`;
  document.getElementById("member-review-name").textContent = data.holder_name;
  document.getElementById("member-review-phone").textContent = data.phone || "Add a mobile number on your account";
  document.getElementById("member-review-kit").innerHTML = merchMarkup(data.merch);
}

async function openMembershipPayment() {
  eliteState.paying = null;
  await loadClubConfig();
  const id = new URLSearchParams(window.location.search).get("id") || sessionStorage.getItem("membership_id");
  if (!id) {
    toast("Select a membership plan first.");
    go("/membership");
    return;
  }
  const data = await request(`/membership/${encodeURIComponent(id)}`);
  if (data.activated) {
    go("/membership");
    return;
  }
  memberState.paying = data;
  state.upiReady = false;
  state.upiQr = "";
  document.getElementById("pay-back").href = `/membership/review?id=${encodeURIComponent(data.membership_id)}`;
  document.getElementById("pay-court").textContent = data.plan;
  document.getElementById("pay-when").textContent = `${data.months} month membership · The Pickle Club`;
  document.getElementById("pay-duration").textContent = "Activated only after payment";
  document.getElementById("pay-amount").textContent = `₹${data.price.toLocaleString("en-IN")}`;
  prepareRazorpayPay();
}

async function loadMembershipQr(openApp) {
  const data = await request("/membership/checkout", {
    method: "POST",
    body: JSON.stringify({ membership_id: memberState.paying.membership_id, method: "UPI" }),
  });
  showPaymentQr(data, `pickleclub_upi_mem_${memberState.paying.membership_id}`, openApp);
}

async function eliteCards() {
  return request("/elite/mine");
}

async function activeEliteCard() {
  const cards = await eliteCards();
  return cards.find((card) => card.activated && card.payment_status === "paid") || null;
}

async function pendingEliteCard() {
  const cards = await eliteCards();
  return cards.find((card) => !card.activated) || null;
}

async function openElite() {
  const adminLink = document.getElementById("elite-admin-link");
  if (state.user && state.user.role === "admin") adminLink.classList.remove("hidden");
  const buying = new URLSearchParams(window.location.search).get("buy") === "1";
  const active = await activeEliteCard();
  if (buying || !active) {
    show("elite");
    await renderEliteOffers(active);
    return;
  }
  show("eliteCard");
  const card = await request("/elite/verify", {
    method: "POST",
    body: JSON.stringify({ card_number: active.card_number }),
  });
  if (!card.activated || card.payment_status !== "paid") {
    show("elite");
    await renderEliteOffers();
    return;
  }
  saveElite(card.card_number);
  paintEliteCard(card);
}

function saveElite(number) {
  sessionStorage.setItem("elite_card", number);
}

async function renderEliteOffers(activeCard) {
  const yourCard = document.getElementById("elite-your-card");
  if (yourCard) {
    yourCard.classList.toggle("hidden", !activeCard);
    if (activeCard) yourCard.href = `/elite/card?card=${encodeURIComponent(activeCard.card_number)}`;
  }
  const offers = await request("/elite/offers");
  const wrap = document.getElementById("elite-offers");
  wrap.innerHTML = "";
  offers.forEach((offer) => {
    const card = document.createElement("article");
    card.className = `offer-card ${offer.badge ? "best" : ""}`;
    card.innerHTML = `
      <p class="eyebrow">${offer.badge || "ELITE PACKAGE"}</p>
      <h2>${offer.name}</h2>
      <p>Book ${offer.paid_hours} hours</p>
      <p>Get ${offer.bonus_hours} hour${offer.bonus_hours === 1 ? "" : "s"} free</p>
      <p class="amount">Total: ${offer.total_hours} hours</p>
      <p>Rs ${offer.price}</p>
      <p class="muted">Rs 800/hr on weekdays · Rs 900/hr on weekends. You pay for ${offer.paid_hours} hours.</p>
      <p class="muted">Offer open until ${offer.promo_end}. Hours stay valid for ${offer.validity_days} days after purchase.</p>
      <button class="primary" type="button" ${offer.open ? "" : "disabled"}>${offer.open ? "Buy now" : "Offer closed"}</button>
    `;
    card.querySelector("button").onclick = () => buyElite(offer.id);
    wrap.appendChild(card);
  });
}

async function buyElite(offerId) {
  try {
    const data = await request("/elite/purchase", { method: "POST", body: JSON.stringify({ offer_id: offerId }) });
    saveElite(data.card_number);
    go(`/elite/pay?card=${encodeURIComponent(data.card_number)}`);
  } catch (error) {
    toast(error.message);
  }
}

async function openElitePayment() {
  memberState.paying = null;
  await loadClubConfig();
  const requested = (new URLSearchParams(window.location.search).get("card") || "").toUpperCase();
  const cards = await eliteCards();
  const requestedCard = requested ? cards.find((card) => card.card_number === requested) : null;
  if (requestedCard && requestedCard.activated) {
    go(`/elite/card?card=${encodeURIComponent(requestedCard.card_number)}`);
    return;
  }
  const pending = (requestedCard && !requestedCard.activated)
    ? requestedCard
    : cards.find((card) => !card.activated);
  if (!pending) {
    toast("Choose an Elite package to buy.");
    go("/elite?buy=1");
    return;
  }
  eliteState.paying = pending;
  state.upiReady = false;
  state.upiQr = "";
  document.getElementById("pay-back").href = "/elite?buy=1";
  document.getElementById("pay-court").textContent = pending.package;
  document.getElementById("pay-when").textContent = "Elite package hours. This purchase is separate from any card you already have.";
  document.getElementById("pay-duration").textContent = `${pending.total_hours} hour package`;
  document.getElementById("pay-amount").textContent = `Rs ${pending.price || 0}`;
  prepareRazorpayPay();
}

async function loadEliteQr(openApp) {
  const data = await request("/elite/checkout", {
    method: "POST",
    body: JSON.stringify({ card_number: eliteState.paying.card_number, method: "UPI" }),
  });
  showPaymentQr(data, `pickleclub_upi_elite_${eliteState.paying.card_number}`, openApp);
}

function paintEliteCard(card) {
  eliteState.card = card;
  document.getElementById("elite-card-number").textContent = card.card_number;
  document.getElementById("elite-holder").textContent = card.holder_name;
  document.getElementById("elite-package").textContent = `${card.package} · pay ${card.paid_hours} + ${card.bonus_hours} free`;
  document.getElementById("elite-total").textContent = card.total_hours;
  document.getElementById("elite-used").textContent = card.used_hours;
  document.getElementById("elite-remaining").textContent = card.remaining_hours;
  document.getElementById("elite-member-admin").classList.toggle("hidden", !state.user || state.user.role !== "admin");
  document.getElementById("elite-until").textContent = card.valid_until;
  document.getElementById("elite-meter-label").textContent = `${card.remaining_hours} / ${card.total_hours} hours remaining`;
  document.getElementById("elite-meter-bar").style.width = `${card.total_hours ? (card.remaining_hours / card.total_hours) * 100 : 0}%`;
  document.getElementById("elite-status-pill").textContent = card.status;
  document.getElementById("elite-expiry-note").textContent = card.expiring_soon
    ? "This card is close to its expiry date. Book the remaining hours soon."
    : "A physical card with this number is issued at the club.";
  const link = `${window.location.origin}/elite/card?card=${encodeURIComponent(card.card_number)}`;
  document.getElementById("elite-qr").src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}`;
  const bookLink = document.getElementById("elite-book-link");
  bookLink.href = `/elite/book?card=${encodeURIComponent(card.card_number)}`;
  bookLink.classList.toggle("hidden", !(card.activated && card.payment_status === "paid" && card.remaining_hours > 0));
  const buyAgain = document.getElementById("elite-buy-again");
  if (buyAgain) buyAgain.classList.remove("hidden");
  const pay = document.getElementById("elite-pay-upi");
  pay.classList.add("hidden");
  pay.onclick = () => { if (upi) window.location.href = upi; };
  const history = document.getElementById("elite-history");
  history.innerHTML = "";
  const rows = card.history || [];
  if (!rows.length) {
    history.innerHTML = `<p class="muted">No Elite bookings yet.</p>`;
    return;
  }
  rows.forEach((item) => {
    const block = document.createElement("article");
    block.className = "history-item";
    block.innerHTML = `
      <strong>PC-${item.id}</strong> · ${item.status}<br/>
      ${item.date_label} · ${item.court}<br/>
      ${item.time_slot} to ${item.end_time} · ${item.hours} hour(s) deducted
    `;
    if (item.upcoming) {
      const button = document.createElement("button");
      button.className = "ghost";
      button.type = "button";
      button.textContent = "Cancel and return hours";
      button.onclick = () => cancelEliteBooking(item.id, card.card_number);
      block.appendChild(button);
    }
    history.appendChild(block);
  });
}

async function renderEliteCard() {
  await openElite();
}

async function cancelEliteBooking(id, number) {
  try {
    await request(`/elite/bookings/${id}/cancel`, { method: "POST" });
    toast("Hours returned to your Elite Card");
    saveElite(number);
    await renderEliteCard();
  } catch (error) {
    toast(error.message);
  }
}

function eliteQuote() {
  const quote = document.getElementById("elite-deduct");
  const card = eliteState.card;
  if (!card || !eliteState.start || !eliteState.end) {
    quote.textContent = "Select an available range.";
    return;
  }
  const hours = Number(eliteState.end.slice(0, 2)) - Number(eliteState.start.slice(0, 2));
  const after = card.remaining_hours - hours;
  if (hours > card.remaining_hours) {
    quote.textContent = `Insufficient Elite Card balance. You currently have ${card.remaining_hours} hour${card.remaining_hours === 1 ? "" : "s"} remaining.`;
    return;
  }
  quote.textContent = `${hours} hour${hours === 1 ? "" : "s"} will be deducted from your Elite Card. Your remaining balance will be ${after} hour${after === 1 ? "" : "s"}.`;
}

async function renderEliteBook() {
  const active = await activeEliteCard();
  if (!active) {
    toast("Purchase and activate an Elite package before booking a slot.");
    go("/elite");
    return;
  }
  const number = active.card_number;
  saveElite(number);
  show("eliteBook");
  const dates = upcomingDates();
  eliteState.date = eliteState.date || dates[0];
  const dateWrap = document.getElementById("elite-dates");
  dateWrap.innerHTML = "";
  dates.forEach((date) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip ${date === eliteState.date ? "active" : ""}`;
    btn.textContent = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    btn.onclick = async () => {
      eliteState.date = date;
      eliteState.start = null;
      eliteState.end = null;
      await renderEliteBook();
    };
    dateWrap.appendChild(btn);
  });
  let data;
  try {
    data = await request(`/elite/day?booking_date=${eliteState.date}&card_number=${encodeURIComponent(number)}`);
  } catch (error) {
    toast("Buy another Elite Card. Pay now shows the payment QR.");
    go("/elite?buy=1");
    return;
  }
  eliteState.card = data.card;
  eliteState.courts = data.courts;
  if (!eliteState.courtId) eliteState.courtId = data.courts[0]?.id;
  document.getElementById("elite-book-balance").textContent = `${data.card.remaining_hours} hrs left`;
  document.getElementById("elite-book-back").href = `/elite/card?card=${encodeURIComponent(data.card.card_number)}`;
  const courtWrap = document.getElementById("elite-courts");
  courtWrap.innerHTML = "";
  data.courts.forEach((court) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip ${court.id === eliteState.courtId ? "active" : ""}`;
    btn.textContent = court.name;
    btn.onclick = () => {
      eliteState.courtId = court.id;
      eliteState.start = null;
      eliteState.end = null;
      renderEliteSlots();
      courtWrap.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
      btn.classList.add("active");
    };
    courtWrap.appendChild(btn);
  });
  renderEliteSlots();
}

function renderEliteSlots() {
  const court = eliteState.courts.find((item) => item.id === eliteState.courtId);
  const grid = document.getElementById("elite-slots");
  grid.innerHTML = "";
  if (!court) return;
  court.slots.forEach((slot) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const selected = eliteState.start && eliteState.end && slot.time >= eliteState.start && slot.time < eliteState.end;
    btn.className = `slot ${selected || eliteState.start === slot.time ? "active" : ""} ${slot.is_available ? "" : "unavailable"}`;
    btn.textContent = slot.is_available ? `${slot.time} available` : `${slot.time} booked`;
    btn.disabled = !slot.is_available;
    btn.onclick = () => chooseEliteSlot(court, slot.time);
    grid.appendChild(btn);
  });
  const starts = court.slots.filter((slot) => slot.is_available).map((slot) => slot.time);
  const startSelect = document.getElementById("elite-start");
  const endSelect = document.getElementById("elite-end");
  fillSelect(startSelect, starts, eliteState.start);
  const ends = eliteState.start ? eliteEnds(court, eliteState.start) : [];
  fillSelect(endSelect, ends, eliteState.end);
  startSelect.onchange = () => chooseEliteSlot(court, startSelect.value);
  endSelect.onchange = () => {
    eliteState.end = endSelect.value;
    eliteQuote();
    renderEliteSlots();
  };
  eliteQuote();
}

function eliteEnds(court, start) {
  const map = new Map(court.slots.map((slot) => [slot.time, slot.is_available]));
  const times = court.slots.map((slot) => slot.time);
  const index = times.indexOf(start);
  const options = [];
  if (index < 0) return options;
  for (let i = index; i < times.length; i += 1) {
    if (!map.get(times[i])) break;
    options.push(i === times.length - 1 ? "24:00" : times[i + 1]);
  }
  return options;
}

function chooseEliteSlot(court, start) {
  eliteState.start = start;
  const ends = eliteEnds(court, start);
  if (!ends.includes(eliteState.end)) eliteState.end = ends[0] || null;
  renderEliteSlots();
}

async function confirmEliteBooking() {
  const card = eliteState.card;
  if (!card || !eliteState.start || !eliteState.end) {
    toast("Select a court and time first.");
    return;
  }
  const hours = Number(eliteState.end.slice(0, 2)) - Number(eliteState.start.slice(0, 2));
  if (hours > card.remaining_hours) {
    toast(`Insufficient Elite Card balance. You currently have ${card.remaining_hours} hour${card.remaining_hours === 1 ? "" : "s"} remaining.`);
    return;
  }
  try {
    const data = await request("/elite/book", {
      method: "POST",
      body: JSON.stringify({
        card_number: card.card_number,
        booking_date: eliteState.date,
        court_id: eliteState.courtId,
        start_time: eliteState.start,
        end_time: eliteState.end,
      }),
    });
    toast(`Booked. ${data.remaining_hours} hours left.`);
    saveElite(card.card_number);
    go(`/elite/card?card=${encodeURIComponent(card.card_number)}`);
  } catch (error) {
    toast(error.message);
  }
}

async function renderEliteAdmin() {
  if (!state.user || state.user.role !== "admin") {
    toast("Admin access required");
    go("/elite");
    return;
  }
  const load = async (q = "") => {
    const cards = await request(`/admin/elite/cards?q=${encodeURIComponent(q)}`);
    const list = document.getElementById("elite-admin-list");
    list.innerHTML = "";
    cards.forEach((card) => {
      const block = document.createElement("article");
      block.className = "history-item";
      block.innerHTML = `
        <strong>${card.card_number}</strong> · ${card.status}<br/>
        ${card.holder_name} · ${card.phone}<br/>
        ${card.package} · ${card.remaining_hours} of ${card.total_hours} hours left · until ${card.valid_until}
      `;
      const actions = document.createElement("div");
      actions.className = "landing-actions";
      const addBtn = document.createElement("button");
      addBtn.className = "ghost";
      addBtn.type = "button";
      addBtn.textContent = "Add 1 hour";
      addBtn.onclick = () => adjustElite(card.id, { hours_delta: 1, note: "Added 1 hour" }, q);
      const offBtn = document.createElement("button");
      offBtn.className = "ghost";
      offBtn.type = "button";
      offBtn.textContent = card.status === "inactive" ? "Activate" : "Deactivate";
      offBtn.onclick = () => adjustElite(card.id, { status: card.status === "inactive" ? "active" : "inactive", note: "Status change" }, q);
      const extendBtn = document.createElement("button");
      extendBtn.className = "ghost";
      extendBtn.type = "button";
      extendBtn.textContent = "Extend 30 days";
      extendBtn.onclick = () => adjustElite(card.id, { extend_days: 30, note: "Validity extended" }, q);
      const replaceBtn = document.createElement("button");
      replaceBtn.className = "ghost";
      replaceBtn.type = "button";
      replaceBtn.textContent = "Replace lost card";
      replaceBtn.onclick = () => adjustElite(card.id, { replace_card: true, note: "Lost card replaced" }, q);
      actions.append(addBtn, offBtn, extendBtn, replaceBtn);
      block.appendChild(actions);
      list.appendChild(block);
    });
  };
  document.getElementById("elite-admin-search").onsubmit = (event) => {
    event.preventDefault();
    load(document.getElementById("elite-admin-q").value).catch((error) => toast(error.message));
  };
  await load("");
}

async function adjustElite(id, body, q) {
  try {
    await request(`/admin/elite/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    toast("Elite Card updated");
    document.getElementById("elite-admin-q").value = q;
    document.getElementById("elite-admin-search").requestSubmit();
  } catch (error) {
    toast(error.message);
  }
}

document.getElementById("confirm-booking").onclick = () => confirmBooking().catch((error) => toast(error.message));
document.getElementById("elite-confirm").onclick = () => confirmEliteBooking().catch((error) => toast(error.message));
document.getElementById("member-proceed").onclick = () => {
  const id = (memberState.current && memberState.current.membership_id) || sessionStorage.getItem("membership_id");
  if (!id) {
    toast("Select a membership plan first.");
    go("/membership");
    return;
  }
  go(`/membership/pay?id=${encodeURIComponent(id)}`);
};
document.getElementById("pay-form").onsubmit = (event) => pay(event).catch((error) => toast(error.message));
document.getElementById("payment-done").onclick = () => finishCourtPayment().catch((error) => toast(error.message));
bindAuth();
bindPayMethods();
loadClubConfig().catch(() => {});
route().catch((error) => toast(error.message));
