
CREATE DATABASE IF NOT EXISTS sport_center_management;

USE sport_center_management;

-- =========================================
-- 1. USERS
-- =========================================

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) UNIQUE,
    password VARCHAR(255) NOT NULL,

    role ENUM('admin', 'staff', 'customer')
        NOT NULL DEFAULT 'customer',

    gender ENUM('male', 'female', 'other'),
    profile_image VARCHAR(500),

    status ENUM('active', 'inactive', 'suspended')
        NOT NULL DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
);

-- =========================================
-- 2. SPORTS
-- =========================================

CREATE TABLE sports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image VARCHAR(500),

    status ENUM('active', 'inactive')
        DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 3. FACILITIES
-- =========================================

CREATE TABLE facilities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    sport_id BIGINT UNSIGNED,

    name VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(255),

    facility_type ENUM(
        'indoor',
        'outdoor'
    ) NOT NULL,

    capacity INT UNSIGNED DEFAULT 1,

    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,

    status ENUM(
        'available',
        'unavailable',
        'maintenance'
    ) DEFAULT 'available',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_facility_sport
        FOREIGN KEY (sport_id)
        REFERENCES sports(id)
        ON DELETE SET NULL,

    INDEX idx_facility_status (status),
    INDEX idx_facility_sport (sport_id)
);

-- =========================================
-- 4. MEMBERSHIP PLANS
-- =========================================

CREATE TABLE memberships (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    name VARCHAR(100) NOT NULL,
    description TEXT,

    duration_days INT UNSIGNED NOT NULL,

    price DECIMAL(10,2) NOT NULL,

    benefits JSON,

    status ENUM('active', 'inactive')
        DEFAULT 'active',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 5. CUSTOMER MEMBERSHIPS
-- =========================================

CREATE TABLE customer_memberships (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    membership_id BIGINT UNSIGNED NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    status ENUM(
        'pending',
        'active',
        'expired',
        'cancelled'
    ) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_customer_membership_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_customer_membership_plan
        FOREIGN KEY (membership_id)
        REFERENCES memberships(id),

    INDEX idx_customer_membership_user (user_id),
    INDEX idx_customer_membership_status (status)
);

-- =========================================
-- 6. RESERVATIONS
-- =========================================


CREATE TABLE reservations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    reservation_code VARCHAR(50) NOT NULL UNIQUE,

    user_id BIGINT UNSIGNED NOT NULL,
    facility_id BIGINT UNSIGNED NOT NULL,

    -- Booking type
    booking_type ENUM(
        'walk-in',
        'reserved'
    ) NOT NULL DEFAULT 'reserved',

    -- Reservation schedule
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,

    number_of_people INT UNSIGNED DEFAULT 1,

    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Reservation status
    status ENUM(
        'pending',
        'confirmed',
        'checked_in',
        'completed',
        'cancelled',
        'rejected',
        'no_show'
    ) NOT NULL DEFAULT 'pending',

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_reservation_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_reservation_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id),

    -- Validation
    CONSTRAINT chk_reservation_time
        CHECK (end_at > start_at),

    CONSTRAINT chk_reservation_people
        CHECK (number_of_people >= 1),

    CONSTRAINT chk_reservation_amount
        CHECK (total_amount >= 0),

    -- Indexes
    INDEX idx_reservation_user (user_id),
    INDEX idx_reservation_facility (facility_id),
    INDEX idx_reservation_schedule (start_at, end_at),
    INDEX idx_reservation_status (status),
    INDEX idx_reservation_type (booking_type)
);


-- =========================================
-- 7. PAYMENTS
-- =========================================

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    reservation_id BIGINT UNSIGNED,
    customer_membership_id BIGINT UNSIGNED,

    amount DECIMAL(10,2) NOT NULL,

    payment_method ENUM(
        'cash',
        'aba',
        'wing',
        'bank_transfer',
        'card',
        'other'
    ) NOT NULL,

    transaction_reference VARCHAR(150),

    status ENUM(
        'pending',
        'paid',
        'failed',
        'refunded'
    ) DEFAULT 'pending',

    paid_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id),

    CONSTRAINT fk_payment_membership
        FOREIGN KEY (customer_membership_id)
        REFERENCES customer_memberships(id),

    INDEX idx_payment_status (status),
    INDEX idx_payment_created (created_at)
);

-- =========================================
-- 8. ATTENDANCE
-- =========================================

CREATE TABLE attendance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    reservation_id BIGINT UNSIGNED NOT NULL UNIQUE,

    checked_in_by BIGINT UNSIGNED,

    check_in_at DATETIME,
    check_out_at DATETIME,

    notes TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attendance_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id),

    CONSTRAINT fk_attendance_staff
        FOREIGN KEY (checked_in_by)
        REFERENCES users(id)
        ON DELETE SET NULL
);

-- =========================================
-- 9. MAINTENANCE REQUESTS
-- =========================================

CREATE TABLE maintenance_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    facility_id BIGINT UNSIGNED NOT NULL,

    reported_by BIGINT UNSIGNED NOT NULL,
    assigned_to BIGINT UNSIGNED,

    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,

    priority ENUM(
        'low',
        'medium',
        'high',
        'urgent'
    ) DEFAULT 'medium',

    status ENUM(
        'reported',
        'assigned',
        'in_progress',
        'completed',
        'cancelled'
    ) DEFAULT 'reported',

    estimated_cost DECIMAL(10,2) DEFAULT 0,
    actual_cost DECIMAL(10,2) DEFAULT 0,

    scheduled_at DATETIME,
    completed_at DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_maintenance_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id),

    CONSTRAINT fk_maintenance_reporter
        FOREIGN KEY (reported_by)
        REFERENCES users(id),

    CONSTRAINT fk_maintenance_assignee
        FOREIGN KEY (assigned_to)
        REFERENCES users(id)
        ON DELETE SET NULL,

    INDEX idx_maintenance_status (status),
    INDEX idx_maintenance_priority (priority)
);

-- =========================================
-- 10. REVIEWS
-- =========================================

CREATE TABLE reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,
    reservation_id BIGINT UNSIGNED NOT NULL UNIQUE,

    rating TINYINT UNSIGNED NOT NULL,
    comment TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_review_reservation
        FOREIGN KEY (reservation_id)
        REFERENCES reservations(id),

    CONSTRAINT chk_review_rating
        CHECK (rating BETWEEN 1 AND 5)
);

-- =========================================
-- 11. NOTIFICATIONS
-- =========================================

CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    user_id BIGINT UNSIGNED NOT NULL,

    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,

    type ENUM(
        'reservation',
        'payment',
        'membership',
        'maintenance',
        'system'
    ) DEFAULT 'system',

    is_read BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_notification_user_read (user_id, is_read)
);

-- =========================================
-- 12. INITIAL SPORTS
-- =========================================

INSERT INTO sports (name, description) VALUES
('Football', 'Football and futsal activities'),
('Basketball', 'Basketball activities'),
('Badminton', 'Badminton activities'),
('Tennis', 'Tennis activities'),
('Swimming', 'Swimming activities'),
('Volleyball', 'Volleyball activities'),
('Gym', 'Gym activities');

-- =========================================
-- 13. INITIAL MEMBERSHIP PLANS
-- =========================================

INSERT INTO memberships
(name, description, duration_days, price, benefits)
VALUES
(
    'Basic',
    'Basic sport center membership',
    30,
    15.00,
    JSON_ARRAY('Standard booking access')
),
(
    'Standard',
    'Standard membership plan',
    90,
    40.00,
    JSON_ARRAY('Priority booking', 'Member discounts')
),
(
    'Premium',
    'Premium membership plan',
    365,
    120.00,
    JSON_ARRAY(
        'Priority booking',
        'Exclusive discounts',
        'Premium facility access'
    )
);

INSERT INTO sports (name, description)
VALUES ('Gym', 'Gym activities');