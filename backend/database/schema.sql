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
-- Foreign keys: facilities.user_id     → users.id      (created by)
--               facilities.category_id → categories.id
--
-- Later phases add more tables (reservations, payments, …) —
-- see ROADMAP.md.
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
