# Sport Center Management

A full-stack sport center management system with four roles, facility
management and a complete customer booking lifecycle. Customers browse
facilities, pick an hourly slot, pay online (simulated) or at the center,
receive a booking reference and check-in code, and staff manage the booking
through check-in and completion. Business operations cover invoices,
membership discounts, staff schedules and attendance, and maintenance
workflows that automatically take facilities out of booking.

Built with **Node.js + Express**, **MySQL**, and a **React (Vite)** frontend
that talks to the REST API with `fetch` and session cookies.

The project grows in five phases (see [`ROADMAP.md`](ROADMAP.md)):

| Phase | Scope | Status |
|---|---|---|
| **1. Core foundation** | roles + RBAC, admin dashboard, user/staff management, facility & category CRUD | ✅ implemented |
| **2. Booking system** | availability, calendar, reservations, cancellation, online/at-center payment, check-in/completion | ✅ implemented |
| **3. Business operations** | invoices, membership plans, staff schedules/attendance, maintenance | ✅ implemented |
| **4. Advanced features** | QR check-in, notifications, equipment rental, promotions, reviews | implemented |
| **5. Analytics** | revenue, facility utilization, customer and staff performance reports | planned |

---

## Roles & permissions

| Capability | Admin | Manager | Staff | Customer |
|---|:--:|:--:|:--:|:--:|
| Manage all users / staff accounts | ✅ | staff only | — | — |
| Facility & category management | ✅ | ✅ | view | view |
| Book a facility (for themselves) | ✅ | ✅ | ✅ | ✅ |
| View bookings | all | all | all | own only |
| Confirm / check in / complete / cancel bookings | ✅ | ✅ | ✅ | cancel own before start |
| Pay a booking online | ✅ | ✅ | ✅ | ✅ |
| View / record payments, refund (refund: admin·manager) | ✅ | ✅ | record | — |
| View invoices | all | all | all | own |
| Membership plans CRUD | ✅ | ✅ | — | — |
| Subscribe to a membership plan | — | — | — | ✅ |
| Staff schedules: assign (admin·manager) / view own | ✅ | ✅ | own | — |
| Clock in / out & view attendance | ✅ | ✅ | own | — |
| File maintenance reports / work them | ✅ | ✅ | report + start work | — |
| Resolve / close maintenance, cancel memberships | ✅ | ✅ | — | — |
| Personal profile & password | ✅ | ✅ | ✅ | ✅ |

Role checks are enforced **on the server** with `authenticate` +
`authorize(...roles)` middleware; the frontend only decides what to show.

## Interface

The frontend uses a responsive admin shell shared by every page:

- a dark, collapsible left sidebar with role-aware navigation groups
  (Overview, Management, Finance & Services, Administration), Lucide icons,
  active-route highlighting and icon tooltips when collapsed;
- a sticky top header with breadcrumb + page title, global search, notification
  bell, user menu (Profile, Settings, Logout) and a contextual primary action;
- a mobile slide-out drawer with an overlay and scroll lock;
- a dashboard overview with KPI cards, an SVG revenue chart (daily / weekly /
  monthly), booking trend and status charts, today's bookings, facility
  availability, quick actions and a merged activity feed.

The dashboard is backed by `GET /api/dashboard/stats`, which returns the KPI
totals, comparison trends, chart series, today's schedule and recent activity in
one request. Charts are small hand-built SVG/CSS components, so no chart
dependency is added. Authentication pages use the same branding without the
sidebar or header.

## Reservation lifecycle

```
 browse facilities ─► pick facility ─► date + hourly slot ─► availability check
                                                                   │
      ┌────────────────────────────────────────────────────────────┘
      ▼
 confirm summary (hours × price = total) ─► pay online or at the center
      │
      ▼
 booking reference (BK-XXXXXX) + check-in code, slot held
      │
      ▼
 staff confirms (at-center) ─► check-in ─► completed
      │
      └─► cancelled (before start; paid → refunded) / no-show
```

- `pending` and `confirmed` bookings hold the time slot; `cancelled` frees it.
- The server rejects overlapping bookings, past times, slots outside the
  facility's opening hours, and facilities under maintenance.
- Online payment is simulated server-side and confirms the booking instantly.
- At-center payments start as pending and are recorded when staff check the
  customer in.
- Active members get their plan's discount (snapshot in `discount_amount`) on
  new bookings; the booking and its `issued`/`paid` invoice are created together.
- Cancelling or refunding a booking voids its invoice.
- Old pending/confirmed bookings are lazily marked `no_show` when their end
  time has passed (there is no background scheduler).

## Database

Phase 1–3 tables (`backend/database/schema.sql`):

| Table | Purpose |
|---|---|
| `users` | accounts with `role` (`admin`/`manager`/`staff`/`customer`), `is_active`; bcrypt hashes only |
| `categories` | facility categories |
| `facilities` | the bookable facilities: pricing, capacity, opening hours, status (available/unavailable/maintenance), image |
| `reservations` | hourly bookings with reference, check-in code, price snapshot and status |
| `payments` | one online or at-center payment per reservation |
| `invoices` | one per booking (`INV-YYYYMM-000123`), paid with its payment, void on cancellation/refund |
| `membership_plans` | plans with a price, duration and booking-discount percentage |
| `memberships` | a customer's plan period (`active`/`expired`/`cancelled`) |
| `staff_schedules` | shifts assigned to staff members |
| `attendance` | one clock-in/out row per staff/day (`present`/`late`/`absent`) |
| `maintenance_requests` | facility issues; active ones keep the facility in `maintenance` |

Later phases add notifications, equipment, promotions and reviews.
`backend/database/seed.sql` seeds the demo accounts, 7 categories, 10
facilities, bookings across the whole lifecycle, payments/invoices,
membership plans/memberships, next-week shifts, attendance and maintenance
requests (all relative to the current date).

> `npm run db:setup` **drops and recreates** the database. Run it at phase
> boundaries or whenever you want a clean demo state.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sportcenter.test` | `Admin1234!` |
| Manager | `manager@sportcenter.test` | `Manager1234!` |
| Staff | `staff@sportcenter.test` | `Staff1234!` |
| Customer | `demo@sportcenter.test` | `Demo1234!` |

Extra seeded accounts: staff `nadia@sportcenter.test` (`Staff1234!`) and
customers `sophia@`, `marcus@`, `aisha@sportcenter.test` (`Customer1234!`).
All passwords are stored as **bcrypt hashes** — never plaintext.

The demo customer has past completed/cancelled bookings and upcoming
confirmed/pending bookings, so the booking list and staff calendar look
realistic immediately. They also hold the seeded **Peak Performer** membership
(10% off new bookings), with invoices, shifts, attendance and maintenance
requests already populated.

## Getting started

### Prerequisites

- Node.js (v18 or newer)
- MySQL server (v8+) running locally

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
```

```dotenv
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=sport_center_management
SESSION_SECRET=change_this_to_a_long_random_string
```

### 2. Create and seed the database

```bash
cd backend
npm run db:setup
```

This runs `schema.sql` followed by `seed.sql` with the credentials from
`backend/.env`.

### 3. Start the API

```bash
cd backend
npm install
npm run dev        # nodemon; use npm start for a plain node process
```

The API runs at `http://localhost:5000`.

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Vite proxies `/api` and `/uploads`
to the backend, so session cookies work without extra CORS setup.

## Project structure

```
├── backend/
│   ├── app.js                    Express entry point + route mounting
│   ├── config/                   MySQL pool, session middleware
│   ├── controllers/              auth, users, facilities, reservations, payments, invoices, memberships, schedules, attendance, maintenance, dashboard
│   ├── middleware/               session auth + role authorization, multer uploads
│   ├── routes/                   one router per resource
│   ├── utils/                    asyncHandler, invoice numbering, membership helpers
│   ├── database/schema.sql       Phase 1–3 tables
│   ├── database/seed.sql         demo users, facilities, bookings, payments, plans, schedules, maintenance
│   └── scripts/setupDb.js        npm run db:setup
└── frontend/src/
    ├── api.js                    fetch wrapper (credentials: 'include')
    ├── context/                  Auth + toast providers
    ├── components/               navbar, guards, badges, dialogs, cards
    ├── pages/                    facilities, booking flow, bookings, calendar, payments, invoices, memberships, schedules, attendance, maintenance, users, dashboard, profile
    └── utils/                    role helpers + date/price/status formatting
```

## API overview

All routes use JSON, session cookies and parameterized SQL. Protected routes
return `401` when logged out and `403` when the role is not allowed.

### Authentication & accounts

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Self-signup (always creates a customer) |
| POST | `/api/auth/login` | public | Start a session |
| POST | `/api/auth/logout` | logged in | Destroy the session |
| GET | `/api/auth/me` | public | Current user or 401 |
| PUT | `/api/auth/profile` | logged in | Update own name/phone |
| PUT | `/api/auth/password` | logged in | Change own password |
| GET | `/api/users` | admin/manager | List accounts (`?search=&role=`) |
| POST/PUT | `/api/users` … | admin/manager | Create/edit accounts (manager: staff only) |
| DELETE | `/api/users/:id` | admin | Delete an account |

### Facilities & availability

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/facilities` | public | List (`?search=&category_id=&status=`) |
| GET | `/api/facilities/:id` | public | Facility details |
| GET | `/api/facilities/:id/availability?date=YYYY-MM-DD` | public | Hourly slot grid with taken/past slots |
| POST/PUT/DELETE | `/api/facilities…` | admin/manager | Manage facilities |
| GET/POST/PUT/DELETE | `/api/categories…` | read public / write admin·manager | Categories |
| GET | `/api/dashboard/stats` | admin/manager/staff | Dashboard counts |

### Bookings (Phase 2)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/reservations` | logged in | Create a booking (validates availability + computes total) |
| GET | `/api/reservations` | logged in | Customer: own · staff: all (`?status=&date=&from=&to=&facility_id=&mine=1`) |
| GET | `/api/reservations/:reference` | owner/staff | Booking details |
| POST | `/api/reservations/:id/pay` | owner | Simulated online payment |
| POST | `/api/reservations/:id/cancel` | owner/staff | Cancel (paid → refunded) |
| POST | `/api/reservations/:id/confirm` | staff-side | Confirm a pending booking |
| POST | `/api/reservations/:id/check-in` | staff-side | Check in (records an at-center payment) |
| POST | `/api/reservations/:id/complete` | staff-side | Complete the session |
| POST | `/api/reservations/:id/no-show` | staff-side | Mark a late booking as no-show |

### Business operations (Phase 3)

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/payments` | staff-side | Payment ledger (`?status=&method=&date=&from=&to=`) |
| GET | `/api/payments/:id` | staff-side | Payment detail |
| POST | `/api/payments/:id/record` | staff-side | Record an at-center payment |
| POST | `/api/payments/:id/refund` | admin/manager | Refund, void the invoice, cancel an active booking |
| GET | `/api/invoices` | logged in | Staff: all · customer: own (`?status=&reservation_id=`) |
| GET | `/api/invoices/:id` | owner/staff | Printable invoice detail |
| GET | `/api/membership-plans` | public | List plans |
| POST/PUT/DELETE | `/api/membership-plans…` | admin/manager | Manage plans (referenced plans must be deactivated, not deleted) |
| GET | `/api/memberships/mine` | logged in | Current active membership |
| GET | `/api/memberships` | logged in | Staff: all · customer: own (`?status=&user_id=`) |
| POST | `/api/memberships` | customer | Subscribe to a plan |
| POST | `/api/memberships/:id/cancel` | admin/manager | Cancel an active membership |
| GET | `/api/schedules` | staff-side | Manager: all · staff: own (`?from=&to=&user_id=`) |
| POST/PUT/DELETE | `/api/schedules…` | admin/manager | Assign/edit/remove shifts |
| GET | `/api/attendance` | staff-side | Manager: all · staff: own (`?date=&from=&to=&user_id=`) |
| GET | `/api/attendance/today` | staff-side | Own row + today's shifts |
| POST | `/api/attendance/clock-in` | staff-side | Clock in (>15 min after shift start → late) |
| POST | `/api/attendance/clock-out` | staff-side | Clock out |
| GET/POST | `/api/maintenance` | staff-side | List/file requests (`?status=&priority=&facility_id=`) |
| PUT | `/api/maintenance/:id` | staff-side | Move to in progress; resolve/close is admin/manager |

Facility availability automatically rejects bookings while a facility has an
`open` or `in_progress` maintenance request.

## Security notes

- **Passwords** are bcrypt hashes (10 rounds) only; login uses a generic error
  for unknown email and wrong password.
- **All SQL is parameterized** — no user input is concatenated into queries.
- **Authorization is server-side**: role checks on every protected route plus
  ownership checks for customers' own bookings.
- **Booking availability** is checked inside a transaction with row locking, so
  two customers cannot double-book the same slot.
- **Server-side validation** covers dates, times, opening hours, price
  calculations, status transitions and image type/size limits.
- **Invoices and discounts** are generated server-side: invoice numbers come
  from the inserted row id, and membership discounts are recalculated on the
  server (the booking page only previews them).
- **Errors** are logged server-side and returned as short generic JSON
  messages — no stack traces or credentials reach the client.
- **Uploads** use multer with JPEG/PNG only, a 2 MB limit and server-generated
  filenames.
- Sessions use the express-session **in-memory store** (as taught in class):
  restarting the API logs everyone out. That is expected in this demo.

## Notes / limitations

- Online payment is simulated (`SIM-ONLINE-…` references); no external gateway.
- Membership subscriptions are simulated — no recurring billing.
- Notifications are not yet sent by email/SMS (Phase 4 adds in-app notifications).
- QR check-in, equipment, promotions, reviews and analytics are planned for
  Phases 4–5 (see `ROADMAP.md`).
