-- =========================================================
-- Sport Center Management — Database Schema
-- =========================================================
-- Phase 1 (core foundation) tables:
--   users      → accounts with a role (admin / manager /
--                staff / customer); passwords are bcrypt
--                hashes only
--   categories → facility categories (Football, Basketball, …)
--   facilities → the sport facilities managed by the center;
--                pricing, capacity, bookable hours, status
--
-- Phase 2 (booking system) tables:
--   reservations → a customer's hourly booking of a facility;
--                  holds the slot while pending/confirmed
--   payments     → online (simulated) or at-center payment
--                  for a reservation
--
-- Phase 3 (business operations) tables:
--   invoices            → issued for a booking; paid when its
--                         payment is paid
--   membership_plans    → plans with a booking discount
--   memberships         → a customer's active plan period
--   staff_schedules     → shifts assigned to staff members
--   attendance          → daily clock-in/clock-out per staff
--   maintenance_requests → facility issues; open ones keep the
--                         facility in 'maintenance'
--
-- Phase 4 (advanced features) tables:
--   notifications      → in-app inbox for customers and staff
--   equipment_items    → rentable equipment catalogue
--   equipment_rentals  → a customer renting an item for a period
--   promotions         → discount codes applied at booking time
--   reviews            → one star rating + comment per customer
--                        per facility (after a completed booking)
--
-- Foreign keys: facilities.user_id     → users.id      (created by)
--               facilities.category_id → categories.id
--               reservations.user_id   → users.id      (customer)
--               reservations.facility_id → facilities.id
--               reservations.promotion_id → promotions.id
--               payments.reservation_id → reservations.id
--               payments.recorded_by   → users.id      (staff)
--               invoices.reservation_id → reservations.id
--               invoices.payment_id     → payments.id
--               memberships.user_id/plan_id → users.id / membership_plans.id
--               staff_schedules.user_id → users.id
--               attendance.user_id      → users.id
--               maintenance_requests.facility_id/reported_by
--               notifications.user_id   → users.id
--               equipment_rentals.equipment_id/user_id/reservation_id
--               reviews.facility_id/user_id/reservation_id
--
-- Run schema.sql first, then seed.sql
-- (or simply run:  npm run db:setup)
-- =========================================================

-- Recreate the database from scratch so re-running always
-- leaves a clean, predictable state (this drops all data!)
DROP DATABASE IF EXISTS sport_center_management;

CREATE DATABASE sport_center_management;

USE sport_center_management;

-- =========================================================
-- 1. USERS
-- =========================================================
-- Email addresses are unique. The password column only ever
-- stores a bcrypt hash — never a plaintext password.
--
-- role controls what the account may do (checked on the
-- server on every protected request):
--   admin    → full control of the system
--   manager  → daily operations, employees, facilities, reports
--   staff    → check-ins, bookings, payments, maintenance
--   customer → books facilities, manages their own account
--
-- is_active = FALSE blocks login for deactivated accounts.

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30) DEFAULT NULL,
    role ENUM('admin', 'manager', 'staff', 'customer')
        NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_role (role)
);

-- =========================================================
-- 2. CATEGORIES
-- =========================================================

CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. FACILITIES
-- =========================================================
-- Title, description, category, pricing, capacity, bookable
-- hours, status and one optional image.
--
-- status:
--   available   → can be booked
--   unavailable  → temporarily closed for other reasons
--   maintenance  → out of service; bookings are rejected
--
-- price_per_hour drives the booking totals (Phase 2), and
-- open_time / close_time define the bookable window.

CREATE TABLE facilities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- who created/last owns this record (audit trail)
    user_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,

    status ENUM('available', 'unavailable', 'maintenance')
        NOT NULL DEFAULT 'available',

    price_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    capacity INT UNSIGNED DEFAULT NULL,

    open_time TIME NOT NULL DEFAULT '08:00:00',
    close_time TIME NOT NULL DEFAULT '22:00:00',

    -- Server-generated filename of the uploaded JPEG/PNG,
    -- stored in the server's uploads/ folder. NULL → placeholder.
    image VARCHAR(255) DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_facility_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_facility_category
        FOREIGN KEY (category_id)
        REFERENCES categories(id),

    INDEX idx_facility_user (user_id),
    INDEX idx_facility_category (category_id),
    INDEX idx_facility_status (status)
);

-- =========================================================
-- 4. RESERVATIONS (Phase 2)
-- =========================================================
-- A booking is a whole number of hours inside the facility's
-- open/close window. `pending` and `confirmed` both hold the
-- slot; `cancelled` and `no_show` free it.
--
--   pending    → created, waiting for payment/confirmation
--   confirmed  → paid online or confirmed/paid at the desk
--   checked_in → customer arrived; session in progress
--   completed  → session finished
--   cancelled  → cancelled before the start
--   no_show    → end time passed without a check-in
--
-- subtotal/discount/total are snapshots so later price changes
-- never rewrite old bookings. checkin_code is unique and is
-- rendered as a QR code in Phase 4.

CREATE TABLE reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(20) NOT NULL UNIQUE,
    user_id BIGINT UNSIGNED NOT NULL,
    facility_id BIGINT UNSIGNED NOT NULL,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME NOT NULL,
    status ENUM(
        'pending', 'confirmed', 'cancelled',
        'checked_in', 'completed', 'no_show'
    ) NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    promotion_id BIGINT UNSIGNED DEFAULT NULL,
    promotion_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    cancellation_reason VARCHAR(500) DEFAULT NULL,
    checkin_code VARCHAR(12) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_res_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_res_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_res_time CHECK (ends_at > starts_at),

    INDEX idx_res_slot (facility_id, starts_at, ends_at),
    INDEX idx_res_user (user_id),
    INDEX idx_res_status (status),
    INDEX idx_res_promotion (promotion_id)
);

-- =========================================================
-- 5. PAYMENTS (Phase 2)
-- =========================================================
-- One payment row per reservation. Online payments are
-- simulated server-side (marked paid instantly). At-center
-- payments start as `pending` and are recorded by staff.
-- Cancelling a paid booking turns the payment `refunded`.

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reservation_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    method ENUM('online', 'at_center')
        NOT NULL DEFAULT 'at_center',
    status ENUM('pending', 'paid', 'refunded', 'failed')
        NOT NULL DEFAULT 'pending',
    transaction_ref VARCHAR(100) DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    recorded_by BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_pay_res
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_pay_staff
        FOREIGN KEY (recorded_by)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_pay_status (status)
);

-- =========================================================
-- 6. INVOICES (Phase 3)
-- =========================================================
-- One invoice per booking, created with the booking. It starts
-- as `issued` while the payment is pending, becomes `paid`
-- when the payment is paid, and is `void` if the booking is
-- cancelled/refunded. Amounts are snapshots taken at issue.
--
-- invoice_number is generated after insert as
-- INV-YYYYMM-000123 (zero-padded invoice id).

CREATE TABLE invoices (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    reservation_id BIGINT UNSIGNED NOT NULL,
    payment_id BIGINT UNSIGNED DEFAULT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    promotion_discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    status ENUM('issued', 'paid', 'void') NOT NULL DEFAULT 'issued',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inv_res
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_inv_pay
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE SET NULL,

    INDEX idx_inv_res (reservation_id),
    INDEX idx_inv_status (status)
);

-- =========================================================
-- 7. MEMBERSHIP PLANS & MEMBERSHIPS (Phase 3)
-- =========================================================
-- A plan has a monthly-style price and a percentage discount
-- applied to new bookings while the customer's membership is
-- active. Subscribing is simulated (no gateway).
--
--   active    → within starts_on…ends_on
--   expired   → ends_on passed (also lazily updated)
--   cancelled → cancelled by staff

CREATE TABLE membership_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500) DEFAULT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_months TINYINT UNSIGNED NOT NULL DEFAULT 1,
    booking_discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_plan_duration CHECK (duration_months BETWEEN 1 AND 24),
    CONSTRAINT chk_plan_discount
        CHECK (booking_discount_percent BETWEEN 0 AND 100)
);

CREATE TABLE memberships (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status ENUM('active', 'expired', 'cancelled')
        NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mem_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_mem_plan
        FOREIGN KEY (plan_id)
        REFERENCES membership_plans(id),

    CONSTRAINT chk_mem_period CHECK (ends_on >= starts_on),

    INDEX idx_mem_user (user_id, status),
    INDEX idx_mem_plan (plan_id)
);

-- =========================================================
-- 8. STAFF SCHEDULES & ATTENDANCE (Phase 3)
-- =========================================================
-- Managers assign shifts; staff clock in/out once per day.
-- A clock-in more than 15 minutes after the shift start is
-- recorded as `late`. Attendance has one row per staff/day.

CREATE TABLE staff_schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    starts_at TIME NOT NULL,
    ends_at TIME NOT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sched_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_sched_time CHECK (ends_at > starts_at),

    UNIQUE KEY uq_sched_slot (user_id, work_date, starts_at),
    INDEX idx_sched_date (work_date)
);

CREATE TABLE attendance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    work_date DATE NOT NULL,
    clock_in DATETIME DEFAULT NULL,
    clock_out DATETIME DEFAULT NULL,
    status ENUM('present', 'late', 'absent')
        NOT NULL DEFAULT 'present',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_att_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_att_day (user_id, work_date),
    INDEX idx_att_date (work_date)
);

-- =========================================================
-- 9. MAINTENANCE REQUESTS (Phase 3)
-- =========================================================
-- Staff file issues; managers move them through the workflow.
-- While a facility has an `open` or `in_progress` request, its
-- status is 'maintenance' (so Phase 2 availability blocks
-- bookings). Resolving/closing restores 'available' once no
-- other active request remains.

CREATE TABLE maintenance_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    facility_id BIGINT UNSIGNED NOT NULL,
    reported_by BIGINT UNSIGNED NOT NULL,
    assigned_to BIGINT UNSIGNED DEFAULT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    priority ENUM('low', 'medium', 'high')
        NOT NULL DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed')
        NOT NULL DEFAULT 'open',
    resolution_notes VARCHAR(500) DEFAULT NULL,
    resolved_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_maint_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_maint_reporter
        FOREIGN KEY (reported_by)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_maint_assignee
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_maint_status (status),
    INDEX idx_maint_facility (facility_id)
);

-- =========================================================
-- 10. NOTIFICATIONS (Phase 4)
-- =========================================================
-- In-app inbox. Every role can receive notifications; the bell
-- in the navbar shows the unread count and the page marks them
-- read. `link` is an optional frontend path to the related page.

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    type ENUM('reservation', 'payment', 'maintenance', 'membership', 'system')
        NOT NULL DEFAULT 'system',
    title VARCHAR(150) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(255) DEFAULT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_notif_inbox (user_id, is_read, created_at)
);

-- =========================================================
-- 11. EQUIPMENT & RENTALS (Phase 4)
-- =========================================================
-- Rentable items (rackets, balls, bibs, …). `rental_fee` is the
-- price per day. An item is 'rented' while an active rental
-- exists. Rentals keep the fee snapshot and an optional link to
-- the customer's court booking.

CREATE TABLE equipment_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    item_condition ENUM('excellent', 'good', 'fair', 'poor')
        NOT NULL DEFAULT 'good',
    status ENUM('available', 'rented', 'maintenance', 'retired')
        NOT NULL DEFAULT 'available',
    rental_fee DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_equipment_fee CHECK (rental_fee >= 0),
    INDEX idx_equipment_status (status)
);

CREATE TABLE equipment_rentals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    equipment_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    reservation_id BIGINT UNSIGNED DEFAULT NULL,
    rented_at DATETIME NOT NULL,
    due_at DATETIME NOT NULL,
    returned_at DATETIME DEFAULT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('rented', 'returned', 'overdue', 'lost')
        NOT NULL DEFAULT 'rented',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_rent_equipment
        FOREIGN KEY (equipment_id)
        REFERENCES equipment_items(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rent_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rent_res
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_rent_due CHECK (due_at > rented_at),
    INDEX idx_rent_status (status, due_at),
    INDEX idx_rent_user (user_id)
);

-- =========================================================
-- 12. PROMOTIONS (Phase 4)
-- =========================================================
-- Discount codes. `percent` applies discount_value % off;
-- `fixed` subtracts discount_value. `used_count` is incremented
-- when a booking uses the code (and decremented on cancel).

CREATE TABLE promotions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    discount_type ENUM('percent', 'fixed') NOT NULL DEFAULT 'percent',
    discount_value DECIMAL(10,2) NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    usage_limit INT UNSIGNED DEFAULT NULL,
    used_count INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_promo_value CHECK (discount_value > 0),
    CONSTRAINT chk_promo_dates CHECK (valid_until >= valid_from),
    INDEX idx_promo_active (is_active, valid_from, valid_until)
);

-- Reservations may reference the promotion applied at checkout.
ALTER TABLE reservations
    ADD CONSTRAINT fk_res_promotion
        FOREIGN KEY (promotion_id)
        REFERENCES promotions(id)
        ON DELETE SET NULL;

-- =========================================================
-- 13. REVIEWS (Phase 4)
-- =========================================================
-- One review per customer per facility (enforced by the unique
-- key). `reservation_id` links the completed booking that made
-- the customer eligible; historical seed reviews may be null.

CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    facility_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    reservation_id BIGINT UNSIGNED DEFAULT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    comment VARCHAR(1000) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_rev_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rev_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_rev_res
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    UNIQUE KEY uq_review (user_id, facility_id),
    INDEX idx_review_facility (facility_id),
    INDEX idx_review_rating (rating)
);

-- Phase 5 analytics indexes (reports query these columns).
ALTER TABLE payments
    ADD INDEX idx_pay_paid_at (paid_at);

ALTER TABLE reservations
    ADD INDEX idx_res_created (created_at);
