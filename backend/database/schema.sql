-- =========================================================
-- Sport Center Management — Database Schema
-- =========================================================
-- Three related tables:
--   users      → accounts (passwords stored as bcrypt hashes only)
--   categories → facility categories (Football, Basketball, ...)
--   facilities → the main records; each one belongs to a user
--                (owner) and is filed under a category
--
-- Foreign keys: facilities.user_id → users.id
--               facilities.category_id → categories.id
--
-- Run schema.sql first, then seed.sql
-- (or simply run:  npm run db:setup)
-- =========================================================

-- Recreate the database from scratch so re-running always
-- leaves exactly the three tables below (drops any old tables
-- from earlier versions of this project)
DROP DATABASE IF EXISTS sport_center_management;

CREATE DATABASE sport_center_management;

USE sport_center_management;

-- =========================================================
-- 1. USERS
-- =========================================================
-- Email addresses are unique. The password column only ever
-- stores a bcrypt hash — never a plaintext password.

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
-- 3. FACILITIES (main resource)
-- =========================================================
-- Title, description, category, topic-specific status
-- (available / unavailable) and one optional image.

CREATE TABLE facilities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,

    status ENUM('available', 'unavailable')
        NOT NULL DEFAULT 'available',

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
