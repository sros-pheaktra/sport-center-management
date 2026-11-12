-- =========================================================
-- Sport Center Management — Seed Data
-- =========================================================
-- Fictional sample data:
--   Phase 1: 8 users across the four roles, 7 categories and
--            10 facilities with pricing and hours.
--   Phase 2: bookings across the reservation lifecycle plus
--            their online/at-center payments.
--   Phase 3: membership plans/memberships, invoices, shifts,
--            attendance and maintenance requests.
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
--
-- Seed dates are relative to CURDATE(), so the demo always
-- has upcoming and past bookings regardless of when it runs.
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

-- =========================================================
-- RESERVATIONS (Phase 2 — relative to today's date)
-- =========================================================
-- Demo customer (id 4) has a full history: completed, cancelled,
-- confirmed and pending bookings. Other customers add variety
-- for the staff booking list and calendar.
--
-- TIMESTAMP(date, time) builds a DATETIME from CURDATE() offsets.

INSERT INTO reservations
    (reference, user_id, facility_id, starts_at, ends_at, status,
     subtotal, discount_amount, total_price, notes,
     cancellation_reason, checkin_code)
VALUES
-- Past: completed and paid online
('BK-100001', 4, 1,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '18:00:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '19:00:00'),
 'completed', 60.00, 0.00, 60.00,
 'Friday five-a-side with friends.', NULL, 'CHK100001'),

-- Past: completed and paid at the center
('BK-100002', 6, 4,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '10:00:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '11:00:00'),
 'completed', 40.00, 0.00, 40.00,
 NULL, NULL, 'CHK100002'),

-- Past: never checked in (at-center payment still pending)
('BK-100003', 7, 2,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '20:00:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '21:00:00'),
 'no_show', 35.00, 0.00, 35.00,
 NULL, NULL, 'CHK100003'),

-- Past: cancelled by the customer (online payment refunded)
('BK-100004', 4, 5,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '07:00:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00'),
 'cancelled', 30.00, 0.00, 30.00,
 NULL, 'Schedule changed', 'CHK100004'),

-- Upcoming: confirmed, paid online
('BK-100005', 4, 1,
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '18:00:00'),
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '20:00:00'),
 'confirmed', 120.00, 0.00, 120.00,
 'Two-hour match — please leave the bibs out.', NULL, 'CHK100005'),

-- Upcoming: pending, will pay at the center
('BK-100006', 4, 7,
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00'),
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00'),
 'pending', 20.00, 0.00, 20.00,
 NULL, NULL, 'CHK100006'),

-- Upcoming: confirmed, at-center payment outstanding
('BK-100007', 6, 2,
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '17:00:00'),
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '18:00:00'),
 'confirmed', 35.00, 0.00, 35.00,
 NULL, NULL, 'CHK100007'),

-- Upcoming: pending at-center booking
('BK-100008', 7, 4,
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00'),
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '09:00:00'),
 'pending', 40.00, 0.00, 40.00,
 NULL, NULL, 'CHK100008'),

-- Upcoming: confirmed, paid online
('BK-100009', 8, 9,
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:00:00'),
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '21:00:00'),
 'confirmed', 44.00, 0.00, 44.00,
 'Doubles match.', NULL, 'CHK100009');

-- =========================================================
-- PAYMENTS (Phase 2)
-- =========================================================
-- Online payments are simulated: paid immediately with a
-- transaction reference. At-center payments begin pending and
-- are recorded by staff (staff id 3 in the seed).

INSERT INTO payments
    (reservation_id, amount, method, status,
     transaction_ref, paid_at, recorded_by)
VALUES
((SELECT id FROM reservations WHERE reference = 'BK-100001'),
 60.00, 'online', 'paid', 'SIM-ONLINE-1001',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '18:00:00'), NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100002'),
 40.00, 'at_center', 'paid', NULL,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '10:00:00'), 3),

((SELECT id FROM reservations WHERE reference = 'BK-100003'),
 35.00, 'at_center', 'pending', NULL, NULL, NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100004'),
 30.00, 'online', 'refunded', 'SIM-ONLINE-1004',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '05:30:00'), NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100005'),
 120.00, 'online', 'paid', 'SIM-ONLINE-1005',
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:15:00'), NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100006'),
 20.00, 'at_center', 'pending', NULL, NULL, NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100007'),
 35.00, 'at_center', 'pending', NULL, NULL, NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100008'),
 40.00, 'at_center', 'pending', NULL, NULL, NULL),

((SELECT id FROM reservations WHERE reference = 'BK-100009'),
 44.00, 'online', 'paid', 'SIM-ONLINE-1009',
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:40:00'), NULL);

-- =========================================================
-- MEMBERSHIP PLANS & MEMBERSHIPS (Phase 3)
-- =========================================================
-- Three plans with increasing booking discounts. The demo
-- customer is an active "Peak Performer" member, so new
-- bookings made in the demo are discounted by 10%.

INSERT INTO membership_plans
    (name, description, price, duration_months,
     booking_discount_percent, is_active)
VALUES
('Fair Play Monthly',
 'A flexible monthly membership: 5% off every booking, cancel anytime.',
 29.99, 1, 5.00, TRUE),

('Peak Performer',
 'Our most popular plan: three months of 10% off bookings plus priority court times.',
 79.99, 3, 10.00, TRUE),

('All-Star Annual',
 'A full year of 15% off bookings, free equipment rental and two guest passes.',
 249.99, 12, 15.00, TRUE);

-- Demo customer (id 4) is an active member (10% off).
INSERT INTO memberships (user_id, plan_id, starts_on, ends_on, status)
VALUES
(4, 2,
 DATE_SUB(CURDATE(), INTERVAL 10 DAY),
 DATE_ADD(CURDATE(), INTERVAL 80 DAY), 'active'),

-- Sophia (id 6) is on the monthly plan.
(6, 1,
 DATE_SUB(CURDATE(), INTERVAL 5 DAY),
 DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'active'),

-- Marcus (id 7) let his monthly plan expire.
(7, 1,
 DATE_SUB(CURDATE(), INTERVAL 60 DAY),
 DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'expired');

-- =========================================================
-- INVOICES (Phase 3)
-- =========================================================
-- One invoice per booking, snapshotting its amounts:
--   paid    → the payment went through
--   issued  → at-center payment still pending
--   void    → booking cancelled and money refunded

INSERT INTO invoices
    (invoice_number, reservation_id, payment_id,
     subtotal, discount_amount, total, status)
VALUES
('INV-202611-000001',
 (SELECT id FROM reservations WHERE reference = 'BK-100001'),
 (SELECT id FROM payments WHERE transaction_ref = 'SIM-ONLINE-1001'),
 60.00, 0.00, 60.00, 'paid'),

('INV-202611-000002',
 (SELECT id FROM reservations WHERE reference = 'BK-100002'),
 (SELECT id FROM payments WHERE reservation_id =
     (SELECT id FROM reservations WHERE reference = 'BK-100002')),
 40.00, 0.00, 40.00, 'paid'),

('INV-202611-000003',
 (SELECT id FROM reservations WHERE reference = 'BK-100004'),
 (SELECT id FROM payments WHERE transaction_ref = 'SIM-ONLINE-1004'),
 30.00, 0.00, 30.00, 'void'),

('INV-202611-000004',
 (SELECT id FROM reservations WHERE reference = 'BK-100005'),
 (SELECT id FROM payments WHERE transaction_ref = 'SIM-ONLINE-1005'),
 120.00, 0.00, 120.00, 'paid'),

('INV-202611-000005',
 (SELECT id FROM reservations WHERE reference = 'BK-100006'),
 (SELECT id FROM payments WHERE reservation_id =
     (SELECT id FROM reservations WHERE reference = 'BK-100006')),
 20.00, 0.00, 20.00, 'issued'),

('INV-202611-000006',
 (SELECT id FROM reservations WHERE reference = 'BK-100009'),
 (SELECT id FROM payments WHERE transaction_ref = 'SIM-ONLINE-1009'),
 44.00, 0.00, 44.00, 'paid'),

('INV-202611-000007',
 (SELECT id FROM reservations WHERE reference = 'BK-100007'),
 (SELECT id FROM payments WHERE reservation_id =
     (SELECT id FROM reservations WHERE reference = 'BK-100007')),
 35.00, 0.00, 35.00, 'issued'),

('INV-202611-000008',
 (SELECT id FROM reservations WHERE reference = 'BK-100008'),
 (SELECT id FROM payments WHERE reservation_id =
     (SELECT id FROM reservations WHERE reference = 'BK-100008')),
 40.00, 0.00, 40.00, 'issued'),

('INV-202611-000009',
 (SELECT id FROM reservations WHERE reference = 'BK-100003'),
 (SELECT id FROM payments WHERE reservation_id =
     (SELECT id FROM reservations WHERE reference = 'BK-100003')),
 35.00, 0.00, 35.00, 'void');

-- =========================================================
-- STAFF SCHEDULES (Phase 3 — upcoming week)
-- =========================================================
-- Tom (3) and Nadia (5) have shifts over the next few days.
-- The notes column is free text shown on the staff week view.

INSERT INTO staff_schedules
    (user_id, work_date, starts_at, ends_at, notes)
VALUES
(3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00', '16:00:00', 'Front desk + bookings'),
(3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '08:00:00', '16:00:00', NULL),
(3, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '12:00:00', '20:00:00', 'Evening shift'),

(5, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00:00', '20:00:00', 'Pool supervision'),
(5, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00', '16:00:00', NULL),
(5, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:00:00', '16:00:00', 'Weekend cover'),

-- A past shift so the attendance log has context
(3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00', '16:00:00', NULL);

-- =========================================================
-- ATTENDANCE (Phase 3)
-- =========================================================
-- Nadia clocked in late today; Tom's completed shift was
-- yesterday. Tom has no row for today so clock-in can be
-- demonstrated in the UI.

INSERT INTO attendance
    (user_id, work_date, clock_in, clock_out, status)
VALUES
(5, CURDATE(),
 TIMESTAMP(CURDATE(), '09:18:00'), NULL, 'late'),

(3, DATE_SUB(CURDATE(), INTERVAL 1 DAY),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '07:56:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '16:05:00'),
 'present');

-- =========================================================
-- MAINTENANCE REQUESTS (Phase 3)
-- =========================================================
-- The active requests match the facilities seeded as
-- 'maintenance' (ids 3 and 10). The resolved one was fixed
-- last week and its facility is available again.

INSERT INTO maintenance_requests
    (facility_id, reported_by, assigned_to, title, description,
     priority, status, resolution_notes, resolved_at)
VALUES
(3, 3, 2,
 'Badminton court resurfacing',
 'Courts 2 and 3 have dead spots in the spring-wood floor. The surface needs sanding and re-lacquering before league matches resume.',
 'high', 'in_progress',
 'Sanding finished; lacquer curing until Friday.', NULL),

(10, 5, 2,
 'Clay court surface levelling',
 'Rain washed out the baseline on court 1. The clay needs re-levelling and new line tape.',
 'medium', 'open', NULL, NULL),

(2, 5, NULL,
 'Replacement hoop net',
 'The net on the north hoop tore during a pickup game.',
 'low', 'resolved',
 'New net fitted and tested.', TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '15:30:00')),

(5, 3, NULL,
 'Pool lane rope repair',
 'Lane 3 rope came loose at the deep end.',
 'medium', 'closed',
 'Re-anchored and checked by the duty lifeguard.',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 12 DAY), '11:00:00'));

-- =========================================================
-- EQUIPMENT CATALOGUE & RENTALS (Phase 4)
-- =========================================================
-- rental_fee is a per-day price. Items 9 and 10 are out on
-- active rentals so the equipment page shows both states.
-- Sophia's rental is past its due date and becomes 'overdue'
-- lazily when the rentals list is opened.

INSERT INTO equipment_items
    (name, description, item_condition, status, rental_fee)
VALUES
('Carbon tennis racket',
 'Head-heavy 300 g racket, freshly strung. Includes a protective cover.',
 'excellent', 'available', 8.00),

('Badminton racket set (2)',
 'Two lightweight rackets plus a tube of three feather shuttlecocks.',
 'good', 'available', 6.00),

('Match football (size 5)',
 'FIFA-quality stitched ball, suitable for turf and grass.',
 'good', 'available', 4.00),

('Basketball',
 'Indoor/outdoor composite ball with deep channels for grip.',
 'excellent', 'available', 3.00),

('Training bibs (set of 10)',
 'Mixed sizes, washed after every rental. Ideal for small-sided games.',
 'fair', 'available', 5.00),

('Swim goggles',
 'Anti-fog racing goggles with adjustable straps. Out for inspection.',
 'good', 'maintenance', 2.00),

('Volleyball',
 'Soft-touch indoor ball used for league warm-ups.',
 'good', 'available', 3.00),

('Table tennis paddles (pair)',
 'Retired from the hire pool after the club switched paddle brands.',
 'fair', 'retired', 2.00),

('GoPro action camera kit',
 'Chest mount, spare battery and 64 GB card. Booked by the demo customer.',
 'excellent', 'rented', 12.00),

('Yoga mat',
 'Extra-thick non-slip mat, cleaned between rentals. Currently overdue.',
 'good', 'rented', 3.00);

INSERT INTO equipment_rentals
    (equipment_id, user_id, reservation_id, rented_at, due_at,
     returned_at, fee, status)
VALUES
-- Demo customer: active rental due tomorrow
((SELECT id FROM equipment_items WHERE name = 'GoPro action camera kit'),
 4, (SELECT id FROM reservations WHERE reference = 'BK-100005'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '17:30:00'),
 TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '17:30:00'),
 NULL, 24.00, 'rented'),

-- Sophia: overdue rental (due yesterday)
((SELECT id FROM equipment_items WHERE name = 'Yoga mat'),
 6, (SELECT id FROM reservations WHERE reference = 'BK-100002'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '10:15:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '10:15:00'),
 NULL, 9.00, 'overdue'),

-- Marcus: returned rental for the history table
((SELECT id FROM equipment_items WHERE name = 'Basketball'),
 7, (SELECT id FROM reservations WHERE reference = 'BK-100003'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '19:45:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '19:45:00'),
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '18:20:00'),
 6.00, 'returned');

-- =========================================================
-- PROMOTIONS (Phase 4)
-- =========================================================
-- WELCOME10 is the code used in the demo; FLASH5 shows a fixed
-- discount. SUMMER20 has expired and MEMBER5 is deactivated,
-- so the validation endpoint rejects both with clear messages.

INSERT INTO promotions
    (code, title, description, discount_type, discount_value,
     valid_from, valid_until, usage_limit, used_count, is_active)
VALUES
('WELCOME10', 'Welcome 10% off',
 'New here? Take 10% off your next facility booking.',
 'percent', 10.00,
 DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 60 DAY),
 100, 2, TRUE),

('FLASH5', 'Flash $5 off',
 'A flat $5 off any booking this fortnight.',
 'fixed', 5.00,
 DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY),
 50, 0, TRUE),

('SUMMER20', 'Summer 20% off',
 'Last summer''s promotion — kept for the management history.',
 'percent', 20.00,
 DATE_SUB(CURDATE(), INTERVAL 120 DAY), DATE_SUB(CURDATE(), INTERVAL 30 DAY),
 NULL, 18, TRUE),

('MEMBER5', 'Members-only 5% off',
 'Deactivated while the membership discount is reviewed.',
 'percent', 5.00,
 DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 80 DAY),
 200, 7, FALSE);

-- =========================================================
-- REVIEWS (Phase 4)
-- =========================================================
-- Demo and Sophia review facilities they completed bookings
-- at; the other two are historical reviews without a link.

INSERT INTO reviews
    (facility_id, user_id, reservation_id, rating, comment, created_at)
VALUES
(1, 4, (SELECT id FROM reservations WHERE reference = 'BK-100001'),
 5,
 'Superb turf and floodlights. The bibs were waiting for us at the desk — will book the same slot next week.',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 4 DAY), '09:15:00')),

(4, 6, (SELECT id FROM reservations WHERE reference = 'BK-100002'),
 4,
 'Lovely clay courts and the coach gave us a few tips. Only gripe is that parking fills up quickly.',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '13:40:00')),

(1, 7, NULL,
 4,
 'Great pitch, though the changing rooms were busy after the 6 pm slot.',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 9 DAY), '20:10:00')),

(5, 8, NULL,
 5,
 'Clean lanes, perfect temperature and friendly lifeguards. Early-bird swimming is excellent value.',
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 7 DAY), '07:25:00'));

-- =========================================================
-- NOTIFICATIONS (Phase 4)
-- =========================================================
-- Unread rows drive the navbar bell count for each role.

INSERT INTO notifications
    (user_id, type, title, message, link, is_read, created_at)
VALUES
(4, 'reservation', 'Booking confirmed',
 'Your booking BK-100005 at Riverside Futsal Arena is confirmed for tomorrow evening.',
 '/bookings/BK-100005', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:20:00')),

(4, 'system', 'WELCOME10 is waiting',
 'Use code WELCOME10 at checkout for 10% off your next booking.',
 '/facilities/1/book', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '11:00:00')),

(4, 'membership', 'Peak Performer active',
 'Your 10% membership discount is applied automatically to new bookings.',
 '/memberships', TRUE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 10 DAY), '09:30:00')),

(4, 'payment', 'Payment received',
 'We received $60.00 for booking BK-100001. Thanks for playing!',
 '/bookings/BK-100001', TRUE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 5 DAY), '18:05:00')),

(2, 'maintenance', 'Maintenance request opened',
 'Clay Court Tennis Retreat was taken out of booking after a surface report.',
 '/maintenance', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 3 DAY), '10:45:00')),

(2, 'system', 'Unread reviews to moderate',
 'Four customer reviews are now visible on the facility pages.',
 '/', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '16:15:00')),

(3, 'reservation', 'Reminder: at-center payment',
 'Booking BK-100007 still has an outstanding at-center payment.',
 '/bookings/BK-100007', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00:00')),

(3, 'maintenance', 'Request assigned to the team',
 'Badminton court resurfacing is in progress and the hall stays closed.',
 '/maintenance', TRUE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '08:10:00')),

(5, 'maintenance', 'Your report was resolved',
 'Replacement hoop net on Maple Street Basketball Court is fixed.',
 '/maintenance', TRUE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '15:35:00')),

(6, 'payment', 'At-center payment due',
 'Booking BK-100007 is confirmed; please pay at the front desk when you arrive.',
 '/bookings/BK-100007', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '12:05:00')),

(7, 'reservation', 'Booking reminder',
 'Your booking BK-100008 at Sunrise Tennis Center is coming up in three days.',
 '/bookings/BK-100008', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 1 DAY), '18:00:00')),

(8, 'payment', 'Payment received',
 'We received $44.00 for booking BK-100009. Have a great doubles match!',
 '/bookings/BK-100009', FALSE,
 TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL 2 DAY), '11:42:00'));
