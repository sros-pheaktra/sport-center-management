# Sport Center Management — Full System Roadmap

This document is the master plan for extending the existing facility-records app
into the complete role-based sport center system described in the new brief
(4 roles, customer reservation lifecycle, Phases 1–5).

Everything already built for the coursework (auth with bcrypt, facility CRUD with
ownership checks, keyword search + category filter, image upload, toasts,
validation) is **kept and folded into** the larger system — nothing is thrown away.

---

## 1. Current state (baseline)

| Area | What exists today |
|---|---|
| DB | `users`, `categories`, `facilities` (MySQL, `npm run db:setup` recreates it) |
| Backend | Express + sessions, `/api/auth`, `/api/facilities`, `/api/categories`, multer uploads |
| Frontend | React + Vite SPA: browse/detail/create/edit facilities, login/register, toasts |
| Conventions | Parameterized SQL, `asyncHandler`, server-side validation, no secrets/stack traces in responses, ESLint-clean frontend |

The original coursework limit of "exactly 3 tables" is **dropped** — the full
system needs more tables. The database is reset & reseeded (`npm run db:setup`)
at the start of each phase.

### Implementation status

| Phase | Status |
|---|---|
| 1. Core foundation | ✅ implemented |
| 2. Booking system | ✅ implemented |
| 3. Business operations | ✅ implemented |
| 4. Advanced features | pending |
| 5. Analytics | pending |

---

## 2. Roles & permission matrix

Roles: `admin`, `manager`, `staff`, `customer` (column `users.role`).

| Capability | Admin | Manager | Staff | Customer |
|---|:--:|:--:|:--:|:--:|
| Manage users of all roles (create/edit/deactivate/delete) | ✅ | — | — | — |
| Manage staff accounts (create/edit/deactivate) | ✅ | ✅ | — | — |
| Facility CRUD | ✅ | ✅ | view | view |
| Category CRUD | ✅ | ✅ | — | — |
| Create bookings (self) | ✅ | ✅ | ✅ | ✅ |
| View bookings | all | all | all | own only |
| Confirm / cancel / check in / complete bookings | ✅ | ✅ | ✅ | cancel own (before start) |
| Record at-center payments (refunds: admin·manager only) | ✅ | ✅ | record | — |
| Pay own booking online | ✅ | ✅ | ✅ | ✅ |
| Invoices (view/print) | ✅ | ✅ | ✅ | own |
| Membership plans CRUD | ✅ | ✅ | — | — |
| Subscribe to membership plan | — | — | — | ✅ |
| Staff schedules CRUD | ✅ | ✅ | view own | — |
| Clock in / out (attendance) | ✅ | ✅ | ✅ | — |
| View attendance | all | all | own | — |
| File maintenance reports | ✅ | ✅ | ✅ | — |
| Work on / resolve maintenance, change facility status | ✅ | ✅ | update progress | — |
| Equipment CRUD | ✅ | ✅ | update status | browse / rent |
| Promotions CRUD | ✅ | ✅ | — | apply promo code |
| Reviews | moderate/delete | moderate | — | write own (verified visit) |
| Notifications | send | send | — | receive / mark read |
| Dashboards & reports | full system | operations | today's shift | personal |
| Analytics (revenue, utilization, customers, staff) | ✅ | ✅ | — | — |

Enforcement: `authenticate` (session) → `authorize('admin', 'manager')` role
middleware on protected routes; ownership checks (`req.user.id` vs row owner)
on top of role checks where the matrix says "own".

---

## 3. Reservation lifecycle (the core flow)

```
 browse        choose         pick date/time      availability check
 ────────►     court     ──►  hourly slots   ──►  (no overlap, not under
 facilities  (facility)       from a grid          maintenance, not past)
                                                          │
          ┌───────────────────────────────────────────────┘
          ▼
   confirm summary (hours × price − discounts = total)
          ▼
   choose payment: online (simulated, instant) or at the center
          ▼
   booking created → reference (BK-XXXXXX) + check-in code shown,
   notification sent, slot is held
          ▼
   staff verifies on arrival → checked_in → after session → completed
```

Reservation status machine:

```
                create                  pay online / staff records payment
 customer ──────────────► pending ────────────────► confirmed ──► checked_in ──► completed
                            │                                        │
                            └──────────► cancelled ◄── (before start)└──► no_show
```

- `pending` and `confirmed` both **hold the slot**; `cancelled` frees it.
- Cancel: customer until the start time; staff/manager any time before check-in.
  Paid payments become `refunded`.
- `no_show`: set by staff, or lazily auto-marked when a pending/confirmed
  reservation's end time has passed without a check-in.
- At-center payment is recorded by staff at check-in.

---

## 4. Database design (final schema, 16 tables)

```
                       ┌────────────┐
                       │ users      │──────────────┬───────────────────────┐
                       └─────┬──────┘              │                       │
        ┌────────────────────┼───────────┬─────────┴────────┐              │
        ▼                    ▼           ▼                  ▼              ▼
 ┌─────────────┐   ┌──────────────┐ ┌───────────────┐ ┌──────────────┐ ┌──────────────┐
 │ facilities  │   │ reservations │ │ memberships   │ │staff_schedules│ │notifications │
 │  │          │   │  │           │ │  ▲            │ └──────┬───────┘ └──────────────┘
 │  ▼          │   │  ▼           │ │membership_plans       ▼
 │ categories  │   │  payments ──►│ invoices      │   attendance
 │             │   │  │           │                │
 │             │   │  ▼           │                │
 │             │◄──┤ reviews      │                │
 │             │   └──┬───────────┘                │
 ▼             │      │  ▲                         │
 maintenance_requests │  │ promotion_id            │
                      ▼  │                         │
               equipment_rentals ──► equipment_items
```

Each phase adds its tables to `backend/database/schema.sql` and its seed rows to
`seed.sql` (DB reset is approved at each phase boundary).

### Phase 1 — core foundation (changes to existing tables)

```sql
-- users: add role, phone, active flag
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,               -- bcrypt hash only
    phone VARCHAR(30) DEFAULT NULL,
    role ENUM('admin','manager','staff','customer') NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
);

-- categories: unchanged

-- facilities: add pricing, capacity, operating hours, maintenance status
CREATE TABLE facilities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,             -- created by (audit / ownership checks)
    category_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('available','unavailable','maintenance')
        NOT NULL DEFAULT 'available',             -- 'maintenance' blocks bookings
    price_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    capacity INT UNSIGNED DEFAULT NULL,
    open_time TIME NOT NULL DEFAULT '08:00:00',   -- bookable window
    close_time TIME NOT NULL DEFAULT '22:00:00',
    image VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_facility_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_facility_category FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_facility_status (status)
);
```

### Phase 2 — booking system

```sql
CREATE TABLE reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(20) NOT NULL UNIQUE,        -- e.g. 'BK-7F3K9Q'
    user_id BIGINT UNSIGNED NOT NULL,             -- the customer
    facility_id BIGINT UNSIGNED NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,                    -- whole hours, within open/close
    status ENUM('pending','confirmed','cancelled','checked_in','completed','no_show')
        NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,              -- hours × price_per_hour
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- membership (P3) / promo (P4)
    total_price DECIMAL(10,2) NOT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    cancellation_reason VARCHAR(500) DEFAULT NULL,
    checkin_code VARCHAR(12) NOT NULL UNIQUE,     -- used by QR check-in (Phase 4)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_res_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_res_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    CONSTRAINT chk_res_time CHECK (ends_at > starts_at),
    INDEX idx_res_slot (facility_id, starts_at, ends_at),
    INDEX idx_res_user (user_id),
    INDEX idx_res_status (status)
);

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('online','at_center') NOT NULL DEFAULT 'at_center',
    status ENUM('pending','paid','refunded','failed') NOT NULL DEFAULT 'pending',
    transaction_ref VARCHAR(100) DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    recorded_by BIGINT UNSIGNED DEFAULT NULL,     -- staff who took an at-center payment
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pay_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    CONSTRAINT fk_pay_staff FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_pay_status (status)
);
```

Availability rules (enforced server-side inside a transaction):
1. Facility `status = 'available'`.
2. Requested hours fall inside `open_time`–`close_time` and are in the future.
3. No overlapping reservation on the same facility with status in
   (`pending`, `confirmed`, `checked_in`, `completed`, `no_show`).

### Phase 3 — business operations ✅

```sql
CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,  -- 'INV-202611-000123'
    reservation_id BIGINT UNSIGNED NOT NULL,
    payment_id BIGINT UNSIGNED DEFAULT NULL,
    subtotal DECIMAL(10,2) NOT NULL,              -- amount snapshot at issue time
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('issued','paid','void') NOT NULL DEFAULT 'issued',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    CONSTRAINT fk_inv_pay FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

CREATE TABLE membership_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) DEFAULT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_months TINYINT UNSIGNED NOT NULL DEFAULT 1,
    booking_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,  -- applied to new bookings
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE memberships (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mem_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mem_plan FOREIGN KEY (plan_id) REFERENCES membership_plans(id),
    INDEX idx_mem_user (user_id, status)
);

CREATE TABLE staff_schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,             -- staff member
    work_date DATE NOT NULL,
    starts_at TIME NOT NULL,
    ends_at TIME NOT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sched_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_sched_time CHECK (ends_at > starts_at),
    UNIQUE KEY uq_sched_slot (user_id, work_date, starts_at)
);

CREATE TABLE attendance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    clock_in DATETIME DEFAULT NULL,
    clock_out DATETIME DEFAULT NULL,
    status ENUM('present','late','absent') NOT NULL DEFAULT 'present',  -- late = clock_in > shift start + 15min
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_att_day (user_id, work_date)
);

CREATE TABLE maintenance_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    facility_id BIGINT UNSIGNED NOT NULL,
    reported_by BIGINT UNSIGNED NOT NULL,         -- staff
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
    status ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
    resolved_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_maint_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    CONSTRAINT fk_maint_reporter FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_maint_status (status)
);
```

Maintenance ↔ availability link: opening a request sets the facility to
`'maintenance'`; resolving/closing restores `'available'` (so Phase 2's
availability check automatically honours it).

### Phase 4 — advanced features

```sql
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('reservation','payment','maintenance','membership','system')
        NOT NULL DEFAULT 'system',
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_inbox (user_id, is_read)
);

CREATE TABLE equipment_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    item_condition ENUM('excellent','good','fair','poor') NOT NULL DEFAULT 'good',
    status ENUM('available','rented','maintenance','retired') NOT NULL DEFAULT 'available',
    rental_fee DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipment_rentals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipment_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,             -- renting customer
    reservation_id BIGINT UNSIGNED DEFAULT NULL,  -- optional link to a court booking
    rented_at DATETIME NOT NULL,
    due_at DATETIME NOT NULL,
    returned_at DATETIME DEFAULT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('rented','returned','overdue','lost') NOT NULL DEFAULT 'rented',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rent_equipment FOREIGN KEY (equipment_id) REFERENCES equipment_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_rent_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rent_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    INDEX idx_rent_status (status, due_at)
);

CREATE TABLE promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,             -- e.g. 'WELCOME10'
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    discount_type ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
    discount_value DECIMAL(10,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    usage_limit INT UNSIGNED DEFAULT NULL,         -- NULL = unlimited
    used_count INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_promo_value CHECK (discount_value > 0),
    CONSTRAINT chk_promo_dates CHECK (valid_until >= valid_from)
);

-- reservations gains: promotion_id BIGINT UNSIGNED NULL → promotions(id) ON DELETE SET NULL

CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    facility_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    reservation_id BIGINT UNSIGNED DEFAULT NULL,   -- set when reviewer had a completed booking
    rating TINYINT UNSIGNED NOT NULL,              -- 1..5
    comment VARCHAR(1000) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rev_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    CONSTRAINT fk_rev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rev_res FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL,
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    UNIQUE KEY uq_review (user_id, facility_id)   -- one review per customer per facility
);
```

### Phase 5 — analytics

Analytics needs **no new tables** — every report is computed from data created
in Phases 2–4. Two small additions keep the aggregate queries fast:

```sql
-- payments: speed up revenue-by-day / revenue-by-method reports
ALTER TABLE payments
    ADD INDEX idx_pay_paid_at (paid_at);

-- reservations: speed up utilization / performance date-range reports
ALTER TABLE reservations
    ADD INDEX idx_res_created (created_at);
```

Reports are read-only and computed with parameterized SQL:

| Report | Source | Notes |
|---|---|---|
| Revenue | `payments` (`status = 'paid'`) joined to `reservations` | totals by day/week/month, by method, by facility |
| Facility utilization | `reservations` + `facilities` | booked hours ÷ open hours for a date range, revenue per facility, no-show rate |
| Customer analytics | `users` (`role = 'customer'`) + `reservations` | new vs returning, bookings/revenue per customer, top customers, inactive customers |
| Staff performance | `reservations` (check-ins, cancellations) + `attendance` + `maintenance_requests` | check-ins processed, bookings handled, attendance rate, maintenance resolved |

---

## 5. Backend API design

All routes keep the current conventions: session auth (`credentials: 'include'`),
`authenticate` + `authorize(...roles)`, parameterized SQL, friendly 4xx JSON
messages, no stack traces.

### Phase 1

| Method & path | Roles | Purpose |
|---|---|---|
| `POST /api/auth/register` | public | Customer self-signup (role forced to `customer`) |
| `POST /api/auth/login` / `logout`, `GET /api/auth/me` | public / session | now include `role` |
| `PUT /api/auth/profile`, `PUT /api/auth/password` | any user | manage own account |
| `GET /api/users?role=&search=` | admin, manager | list users (manager sees staff+customers) |
| `POST /api/users` | admin (any role), manager (staff only) | create account |
| `PUT /api/users/:id` | admin, manager (role limits) | edit name/phone/role/password/is_active |
| `DELETE /api/users/:id` | admin | hard delete |
| `GET/POST/PUT/DELETE /api/facilities...` | read: all · write: admin, manager (+creator) | existing CRUD, now role-gated |
| `GET/POST/PUT/DELETE /api/categories...` | read: all · write: admin, manager | existing |
| `GET /api/dashboard/stats` | admin, manager | counts for dashboard cards |

### Phase 2

| Method & path | Roles | Purpose |
|---|---|---|
| `GET /api/facilities/:id/availability?date=` | public | hourly slot grid + which slots are taken |
| `POST /api/reservations` | customer+ | book (validates availability, computes price, creates payment row) |
| `GET /api/reservations?status=&date=&facility_id=&mine=` | staff+ all; `mine` = own | booking lists |
| `GET /api/reservations/:reference` | owner, staff+ | booking detail |
| `POST /api/reservations/:id/cancel` | owner (before start), staff+ | cancel + refund |
| `POST /api/reservations/:id/confirm` | staff+ | confirm pending booking |
| `POST /api/reservations/:id/check-in` | staff+ | mark `checked_in` |
| `POST /api/reservations/:id/complete` | staff+ | mark `completed` (+ record at-center payment) |
| `POST /api/reservations/:id/pay` | owner | simulated online payment → `confirmed` |

### Phase 3 ✅

| Method & path | Roles | Purpose |
|---|---|---|
| `GET /api/payments?status=&date=` | staff+ | payments overview |
| `POST /api/payments/:id/record` | staff+ | record at-center payment |
| `POST /api/payments/:id/refund` | manager, admin | refund |
| `GET /api/invoices`, `GET /api/invoices/:id` | staff+ / own | invoices (issued on payment) |
| `GET /api/membership-plans`, CRUD | read: all · write: manager, admin | plans |
| `POST /api/memberships`, `GET /api/memberships?mine=` | customer / own | subscribe & view |
| `GET/POST/PUT/DELETE /api/schedules...` | manager+ write, staff read own | shifts |
| `POST /api/attendance/clock-in` / `clock-out` | staff+ | punch clock |
| `GET /api/attendance?user_id=&from=&to=` | manager+ all, staff own | attendance log |
| `GET/POST /api/maintenance...`, `PUT /api/maintenance/:id` | create: staff+ · resolve: manager+ | maintenance workflow |

### Phase 4

| Method & path | Roles | Purpose |
|---|---|---|
| `GET /api/notifications`, `POST /api/notifications/:id/read`, `.../read-all` | own | inbox + bell |
| `POST /api/reservations/check-in/:code` | staff+ | QR/code check-in (same transition as above) |
| `GET /api/equipment` + CRUD | read: all · write: manager+ | equipment catalogue |
| `POST /api/equipment/:id/rent` | customer | rent (optionally attach a booking) |
| `POST /api/rentals/:id/return` | staff+ | return item, flag overdue |
| `GET/POST/PUT/DELETE /api/promotions...` | write: manager+ | promo codes |
| `POST /api/promotions/validate` | customer | check a code at checkout |
| `GET/POST /api/facilities/:id/reviews`, `DELETE /api/reviews/:id` | customer write / manager+ moderate | reviews + rating |

### Phase 5

All endpoints require `admin` or `manager`; every one accepts `from` / `to`
date filters (defaulting to the last 30 days).

| Method & path | Purpose |
|---|---|
| `GET /api/analytics/revenue?from=&to=&group_by=day\|week\|month` | Revenue totals, breakdown by method and facility |
| `GET /api/analytics/utilization?from=&to=` | Booked hours vs open hours per facility, revenue, no-show rate |
| `GET /api/analytics/customers?from=&to=` | New vs returning customers, top customers, inactive customers |
| `GET /api/analytics/staff?from=&to=` | Check-ins/booking actions, attendance rate, maintenance resolved |
| `GET /api/analytics/overview?from=&to=` | Combined KPIs for the analytics dashboard |

| Frontend route | Purpose |
|---|---|
| `/analytics` | Tabs for Revenue, Utilization, Customers and Staff reports with date-range filters and simple charts/tables |

---

## 6. Frontend pages & routes

Layout: existing top Navbar stays for public/customer browsing; a sidebar
`StaffLayout` is introduced in Phase 1 for admin/manager/staff tools.

### Phase 1
- `/dashboard` — role-aware dashboard (admin/manager: system stats; staff: redirected to today's bookings in P2; customer: personal summary)
- `/users` — user & staff management table (search, role filter, create/edit, deactivate, delete)
- `/profile` — edit own name/phone, change password (all roles)
- Facilities pages: buttons gated by role; `RoleGuard` redirects with a toast

### Phase 2
- `/facilities/:id/book?date=` — slot picker (grid of hourly slots, taken ones disabled), booking summary, payment choice
- `/bookings/:reference` — confirmation page: reference, check-in code, QR-ready, pay online, cancel
- `/bookings` — customer: my bookings (status badges, cancel); staff/manager: all bookings with filters + confirm/check-in/complete/cancel actions
- `/calendar` — week view per facility for staff/manager

### Phase 3 ✅
- `/payments` — payment list, record at-center, refund, invoice view (printable)
- `/memberships` — customer: plans + subscribe + current status; manager/admin: plan CRUD
- `/schedules` — manager: assign shifts; staff: my week
- `/attendance` — staff clock in/out card; manager view of the log
- `/maintenance` — staff file reports; manager work them (facility status follows)

### Phase 4
- Check-in code/QR on the confirmation page; staff `/check-in` page (enter or scan code)
- Notification bell in the navbar (unread count) + `/notifications` page
- `/equipment` — browse & rent (customer) / manage (staff+)
- Promo code input in the booking flow + `/promotions` management
- Reviews & star rating on facility detail; "write a review" after completed bookings

### Phase 5
- `/analytics` — management insights: date-range picker, KPI cards, revenue
  trend, facility utilization table, top customers and staff performance

---

## 7. Demo accounts & seed data

| Account | Password | Role |
|---|---|---|
| `admin@sportcenter.test` | `Admin1234!` | admin |
| `manager@sportcenter.test` | `Manager1234!` | manager |
| `staff@sportcenter.test` | `Staff1234!` | staff |
| `demo@sportcenter.test` | `Demo1234!` | customer (kept from the current README) |

All stored as bcrypt hashes. Seed per phase:
- **P1**: the 4 accounts above, extra staff/customers, 7 categories, 10 facilities with prices/capacity/hours
- **P2**: reservations across all statuses (past + upcoming), payments, for the demo customer and others
- **P3**: 3 membership plans, memberships, next-week schedules, attendance, maintenance requests
- **P4**: equipment + rentals, promotions, notifications, reviews
- **P5**: analytics uses the data seeded in P2–P4 (no extra seed rows required)

---

## 8. Implementation order & definition of done

Each phase = one working session: schema + seed → backend → frontend → test →
README update. `npm run db:setup` (destructive) runs at the start of each phase.

| Phase | Scope | Done when |
|---|---|---|
| **1. Core foundation** | `authorize` middleware, role column, role-gated facilities/categories, user/staff management API + UI, role-aware dashboard/layout, profile page | logging in as each role shows different navigation; non-authorized roles get 403 + friendly UI; user CRUD works; lint clean |
| **2. Booking system** | availability endpoint, reservations + payments tables, booking flow, confirmation page, booking management, calendar | full lifecycle testable end-to-end: browse → book → pay → check in → complete; double-booking rejected with a clear message |
| **3. Business operations** | invoices, memberships + discounts, schedules, attendance, maintenance ↔ facility status | at-center payment recorded at check-in; invoice view; member booking price discounted; maintenance blocks booking |
| **4. Advanced features** | QR check-in, notifications, equipment rental, promotions, reviews | code check-in works; bell shows unread; promo code reduces total; reviews appear on facility detail |
| **5. Analytics** | revenue, facility utilization, customer and staff reports + dashboard | managers can pick a date range and see revenue, utilization, top customers and staff performance; numbers reconcile with bookings/payments |

## 9. Conventions carried over

- Parameterized SQL everywhere; no secrets, no stack traces in responses
- bcrypt (10 rounds) only; session login with `regenerate()` on login
- multer for facility images (JPEG/PNG, ≤2 MB, server-generated names)
- `asyncHandler` + global error handler; friendly 404/403/401 JSON messages
- Frontend: `api.js` fetch wrapper, Toast + Auth contexts (context/provider split), ESLint clean, loading/empty/error states everywhere

## 10. Out of scope (documented as future work)

- Real payment gateway integration (online payment is simulated server-side)
- Email/SMS delivery for notifications (stored in-app)
- Camera-based QR scanning (code entry + rendered QR are enough for the demo)
- Background jobs (lazy cleanup instead of schedulers)
