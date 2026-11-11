-- =========================================================
-- Sport Center Management — Seed Data
-- =========================================================
-- Fictional sample data: 4 users, 7 categories and
-- 10 facilities.
--
-- NO PLAINTEXT PASSWORDS ARE STORED. The password column
-- contains bcrypt hashes only.
--
-- Demo account (for trying the app without registering):
--     email:    demo@sportcenter.test
--     password: Demo1234!
--     (hash of "Demo1234!" with bcrypt, 10 salt rounds)
--
-- The three sample owners share the password "Owner1234!"
-- (also stored as a bcrypt hash) — useful for testing that
-- only the owner of a facility can edit or delete it.
--
-- Seeded facilities intentionally have no image so the
-- placeholder is visible while browsing.
-- =========================================================

USE sport_center_management;

-- =========================================================
-- USERS (bcrypt hashes, never plaintext)
-- =========================================================

INSERT INTO users (full_name, email, password) VALUES
('Demo User', 'demo@sportcenter.test', '$2b$10$92jGBrSiOVAdSNs63LlOheaKlx8i8Z4zBXPcSk.EZbUQ8dutRQbYK'),
('Sophia Chen', 'sophia@sportcenter.test', '$2b$10$o1NgvaRvpYre.JLfKdDQWuS.AdZxsONQsRvroOksq6U30K.S/C/OO'),
('Marcus Webb', 'marcus@sportcenter.test', '$2b$10$o1NgvaRvpYre.JLfKdDQWuS.AdZxsONQsRvroOksq6U30K.S/C/OO'),
('Aisha Rahman', 'aisha@sportcenter.test', '$2b$10$o1NgvaRvpYre.JLfKdDQWuS.AdZxsONQsRvroOksq6U30K.S/C/OO');

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
-- user_id 1 = Demo User       2 = Sophia Chen
--          3 = Marcus Webb     4 = Aisha Rahman
--
-- category_id 1 = Football     2 = Basketball   3 = Badminton
--             4 = Tennis      5 = Swimming     6 = Volleyball
--             7 = Gym

INSERT INTO facilities (user_id, category_id, title, description, status, image) VALUES
(2, 1, 'Riverside Futsal Arena',
 'A floodlit five-a-side futsal arena right on the riverfront. Smooth professional turf, rentable bibs and balls, and showers in the changing block. Popular for after-work leagues, so book early on weekdays.',
 'available', NULL),

(3, 2, 'Maple Street Basketball Court',
 'Half-court with springy asphalt, two adjustable hoops and night lighting until 11 pm. A neighbourhood favourite for pickup games — bring your own ball or borrow one from the front desk.',
 'available', NULL),

(4, 3, 'Featherlite Badminton Hall',
 'Six courts with anti-glare lighting and spring-wood flooring. Currently being resurfaced after the winter season; expect a reopening announcement soon.',
 'unavailable', NULL),

(2, 4, 'Sunrise Tennis Center',
 'Three outdoor clay courts and one covered hard court. Rackets and balls included in the hourly rate, and a resident coach offers beginner clinics every Saturday morning.',
 'available', NULL),

(3, 5, 'Blue Lagoon Swimming Pool',
 'A 25-metre heated indoor pool with lanes for slow, medium and fast swimmers. Family splash sessions run on Sunday afternoons, and early-bird lane swimming starts at 6 am.',
 'available', NULL),

(4, 6, 'Thunder Volleyball Dome',
 'Indoor dome with two full-size courts, soft landing flooring and a spectator mezzanine. Closed while the roof insulation is replaced after January storms.',
 'unavailable', NULL),

(2, 7, 'Iron Core Fitness Gym',
 'A 24/7 gym with free weights, cardio machines and a stretching zone. Membership includes one induction session and a personalised starter programme.',
 'available', NULL),

(3, 1, 'Greenfield Football Pitch',
 'A full-size grass pitch with goal nets, corner flags and covered dugouts. Home ground for the Greenfield Giants on weekends, bookable by the hour on weekday evenings.',
 'available', NULL),

(4, 3, 'Smash Point Badminton Club',
 'Cosy two-court club above the tram depot. Birdies and rackets available at the counter, and a small cafe famous for its lime soda after matches.',
 'available', NULL),

(2, 4, 'Clay Court Tennis Retreat',
 'A quiet retreat with two red-clay courts surrounded by pine trees. Court maintenance is underway this month — bookings reopen once the surface is levelled.',
 'unavailable', NULL);
