-- =========================================================
-- Sport Center Management — Seed Data
-- =========================================================
-- Fictional sample data: 8 users across the four roles,
-- 7 categories and 10 facilities with pricing and hours.
--
-- NO PLAINTEXT PASSWORDS ARE STORED. The password column
-- contains bcrypt hashes only.
--
-- Demo accounts (for trying the app without registering):
--     admin:    admin@sportcenter.test    / Admin1234!
--     manager:  manager@sportcenter.test  / Manager1234!
--     staff:    staff@sportcenter.test    / Staff1234!
--     customer: demo@sportcenter.test     / Demo1234!
--
-- All seeded staff members share the password "Staff1234!"
-- and the extra customers share "Customer1234!" (bcrypt
-- hashes of both are stored, never the plaintext).
--
-- Seeded facilities intentionally have no image so the
-- placeholder is visible while browsing.
-- =========================================================

USE sport_center_management;

-- =========================================================
-- USERS (bcrypt hashes, never plaintext)
-- =========================================================
-- id 1 = Alex Morgan   (admin)      admin@sportcenter.test
-- id 2 = Priya Sharma  (manager)    manager@sportcenter.test
-- id 3 = Tom Becker    (staff)      staff@sportcenter.test
-- id 4 = Demo User     (customer)   demo@sportcenter.test
-- id 5 = Nadia Osei    (staff)      nadia@sportcenter.test
-- id 6 = Sophia Chen   (customer)   sophia@sportcenter.test
-- id 7 = Marcus Webb   (customer)   marcus@sportcenter.test
-- id 8 = Aisha Rahman  (customer)   aisha@sportcenter.test

INSERT INTO users (full_name, email, password, phone, role) VALUES
('Alex Morgan', 'admin@sportcenter.test',
 '$2b$10$jP0ymPV2rS0YhqEMhysejOtqnj5qKfHQpbRieIw4HHAolZwFpUm3W',
 '+1 555-0100', 'admin'),

('Priya Sharma', 'manager@sportcenter.test',
 '$2b$10$d1CD5lL4oRLbr3Dt3WEVDeLXh.YxDeNTx.PKJvuMIoBg8gHs26/6y',
 '+1 555-0111', 'manager'),

('Tom Becker', 'staff@sportcenter.test',
 '$2b$10$4fJftLxKKJwr3MTpJlphT.o2cfY2rVQ9WRxvKugsNMWvxCnKGcza6',
 '+1 555-0122', 'staff'),

('Demo User', 'demo@sportcenter.test',
 '$2b$10$92jGBrSiOVAdSNs63LlOheaKlx8i8Z4zBXPcSk.EZbUQ8dutRQbYK',
 NULL, 'customer'),

('Nadia Osei', 'nadia@sportcenter.test',
 '$2b$10$4fJftLxKKJwr3MTpJlphT.o2cfY2rVQ9WRxvKugsNMWvxCnKGcza6',
 '+1 555-0133', 'staff'),

('Sophia Chen', 'sophia@sportcenter.test',
 '$2b$10$m9w0ml/H6axD.FH0WcNoQeLS8KOQIkJV/EejzWIMFY.3I5PsiNara',
 NULL, 'customer'),

('Marcus Webb', 'marcus@sportcenter.test',
 '$2b$10$m9w0ml/H6axD.FH0WcNoQeLS8KOQIkJV/EejzWIMFY.3I5PsiNara',
 NULL, 'customer'),

('Aisha Rahman', 'aisha@sportcenter.test',
 '$2b$10$m9w0ml/H6axD.FH0WcNoQeLS8KOQIkJV/EejzWIMFY.3I5PsiNara',
 NULL, 'customer');

-- =========================================================
-- CATEGORIES (at least three)
-- =========================================================

INSERT INTO categories (name) VALUES
('Football'),
('Basketball'),
('Badminton'),
('Tennis'),
('Swimming'),
('Volleyball'),
('Gym');

-- =========================================================
-- FACILITIES (10 fictional records)
-- =========================================================
-- Facilities are managed by the center: created by the
-- manager (user_id 2) or the admin (user_id 1).
--
-- category_id 1 = Football     2 = Basketball   3 = Badminton
--             4 = Tennis      5 = Swimming     6 = Volleyball
--             7 = Gym

INSERT INTO facilities
    (user_id, category_id, title, description, status,
     price_per_hour, capacity, open_time, close_time, image)
VALUES

(2, 1, 'Riverside Futsal Arena',
 'A floodlit five-a-side futsal arena right on the riverfront. Smooth professional turf, rentable bibs and balls, and showers in the changing block. Popular for after-work leagues, so book early on weekdays.',
 'available', 60.00, 12, '07:00:00', '23:00:00', NULL),

(2, 2, 'Maple Street Basketball Court',
 'Half-court with springy asphalt, two adjustable hoops and night lighting until 11 pm. A neighbourhood favourite for pickup games — bring your own ball or borrow one from the front desk.',
 'available', 35.00, 10, '08:00:00', '23:00:00', NULL),

(2, 3, 'Featherlite Badminton Hall',
 'Six courts with anti-glare lighting and spring-wood flooring. The flooring is being resurfaced this week, so bookings are blocked until the work is finished.',
 'maintenance', 25.00, 24, '08:00:00', '22:00:00', NULL),

(1, 4, 'Sunrise Tennis Center',
 'Three outdoor clay courts and one covered hard court. Rackets and balls included in the hourly rate, and a resident coach offers beginner clinics every Saturday morning.',
 'available', 40.00, 8, '06:00:00', '21:00:00', NULL),

(2, 5, 'Blue Lagoon Swimming Pool',
 'A 25-metre heated indoor pool with lanes for slow, medium and fast swimmers. Family splash sessions run on Sunday afternoons, and early-bird lane swimming starts at 6 am.',
 'available', 30.00, 40, '06:00:00', '21:00:00', NULL),

(1, 6, 'Thunder Volleyball Dome',
 'Indoor dome with two full-size courts, soft landing flooring and a spectator mezzanine. Closed while the roof insulation is replaced after January storms.',
 'unavailable', 45.00, 24, '09:00:00', '22:00:00', NULL),

(2, 7, 'Iron Core Fitness Gym',
 'A 24/7 gym with free weights, cardio machines and a stretching zone. Membership includes one induction session and a personalised starter programme.',
 'available', 20.00, 60, '06:00:00', '23:00:00', NULL),

(2, 1, 'Greenfield Football Pitch',
 'A full-size grass pitch with goal nets, corner flags and covered dugouts. Home ground for the Greenfield Giants on weekends, bookable by the hour on weekday evenings.',
 'available', 80.00, 30, '08:00:00', '22:00:00', NULL),

(1, 3, 'Smash Point Badminton Club',
 'Cosy two-court club above the tram depot. Birdies and rackets available at the counter, and a small cafe famous for its lime soda after matches.',
 'available', 22.00, 8, '09:00:00', '22:00:00', NULL),

(1, 4, 'Clay Court Tennis Retreat',
 'A quiet retreat with two red-clay courts surrounded by pine trees. Court maintenance is underway this month — bookings reopen once the surface is levelled.',
 'maintenance', 38.00, 4, '07:00:00', '20:00:00', NULL);
