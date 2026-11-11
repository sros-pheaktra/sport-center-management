# Sport Center — Facility Listings

A full-stack web application where members register, log in and manage
listings of sport facilities (the "records"). Anyone can browse the
facilities, search them by keyword and filter them by category and
status. Each facility has a title, description, category,
available/unavailable status and one optional photo.

Built with **Node.js + Express**, **MySQL**, and a **React (Vite)**
frontend that talks to the REST API with `fetch`.

## Features

- **Registration, login, logout** — unique email addresses, passwords
  hashed with bcrypt, session-based login (express-session).
- **Browse & view details** — list of facilities plus a detail page
  per facility.
- **Create a record** — title, description, category and a
  topic-specific status (`available` / `unavailable`).
- **Update & delete** — only the record's owner can change or delete
  it (checked on the **server**, not just by hiding buttons).
  Deletion must be confirmed in a dialog.
- **Search & filter** — keyword search across title/description,
  plus category and status filters (both implemented).
- **One image per record** — optional JPEG/PNG upload, 2 MB limit,
  server-generated filenames, and a placeholder when no image exists.
- **Clear feedback** — success toasts, inline validation errors,
  empty-result messages and a friendly page for missing records.

## Database

Three related tables (see `backend/database/`):

| Table         | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `users`       | Accounts. Emails are unique; passwords are bcrypt hashes only. |
| `categories`  | Facility categories (Football, Basketball, …). |
| `facilities`  | The main records. Foreign keys to its owner (`users.id`) and its `categories.id`. |

- `backend/database/schema.sql` — creates the database and the three tables.
- `backend/database/seed.sql` — seeds 4 users, 7 categories and **10 fictional
  sample facilities**.

## Demo account

You can either register your own account through the **Register** page,
or use the pre-seeded demo account:

```
email:    demo@sportcenter.test
password: Demo1234!
```

The seed file stores **only a bcrypt hash** of that password — no
plaintext password is ever stored in the database. (The three sample
owners — Sophia, Marcus and Aisha — share the password `Owner1234!`,
also stored as a hash, which is handy for testing the ownership
rules: log in as one of them and try to edit the demo user's records,
or vice versa.)

To create additional demo accounts, simply register through the UI;
the password is hashed with bcrypt (10 salt rounds) on the server
before it is inserted.

## Getting started

### Prerequisites

- Node.js (v18 or newer)
- A MySQL server (v8+) running locally

### 1. Configure the environment

Copy `.env.example` to `.env` inside the `backend/` folder and fill in
your own MySQL credentials:

```
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

Real credentials are never committed — only `.env.example` (with
placeholders) is versioned.

### 2. Create and seed the database

From the `backend/` folder:

```
npm run db:setup
```

This runs `database/schema.sql` followed by `database/seed.sql` using
the credentials from `backend/.env`. (You can also run the two files
manually with the MySQL CLI: `mysql -u your_user -p < backend/database/schema.sql`
etc.)

### 3. Install and start the API server

From the `backend/` folder:

```
npm install
npm run dev
```

The API runs at `http://localhost:5000` (use `npm start` without
nodemon).

### 4. Install and start the frontend

In a second terminal, from the `frontend/` folder:

```
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The Vite dev server proxies
`/api` and `/uploads` to the backend, so session cookies work without
extra CORS setup.

## Project structure

```
├── backend/                  Express REST API
│   ├── app.js                Entry point
│   ├── config/
│   │   ├── db.js             MySQL connection pool (credentials from .env)
│   │   └── session.js        Session middleware
│   ├── routes/
│   │   ├── authRoutes.js     Registration / login / logout / current user
│   │   ├── facilityRoutes.js Main resource (browse, search, CRUD)
│   │   └── categoryRoutes.js Categories for forms and filters
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── facilityController.js
│   │   └── categoryController.js
│   ├── middleware/
│   │   ├── authMiddleware.js Session check (req.user)
│   │   └── uploadMiddleware.js Multer: JPEG/PNG only, ≤ 2 MB, UUID filenames
│   ├── database/
│   │   ├── schema.sql        Creates the three related tables
│   │   └── seed.sql          Sample categories, users and 10 facilities
│   ├── uploads/              Uploaded images (runtime, gitignored)
│   ├── scripts/setupDb.js   npm run db:setup
│   ├── .env / .env.example  Environment settings (real file gitignored)
│   └── package.json
└── frontend/                 React + Vite SPA (fetch-based)
    └── src/
        ├── api.js            fetch wrapper (cookies included)
        ├── context/          Auth + toast (feedback) providers
        ├── components/       Navbar, cards, badges, confirm dialog, …
        └── pages/            Browse, detail, create/edit, login, register
```

## API overview

| Method | Endpoint                  | Access      | Purpose                              |
| ------ | ------------------------- | ----------- | ------------------------------------ |
| POST   | `/api/auth/register`      | public      | Create an account (bcrypt hash)     |
| POST   | `/api/auth/login`         | public      | Start a session                     |
| POST   | `/api/auth/logout`        | logged in   | Destroy the session                 |
| GET    | `/api/auth/me`            | public      | Current user or 401                 |
| GET    | `/api/facilities`         | public      | List; `?search=&category_id=&status=` |
| GET    | `/api/facilities/:id`     | public      | One facility or 404                  |
| POST   | `/api/facilities`         | logged in   | Create (multipart, optional image)  |
| PUT    | `/api/facilities/:id`     | owner only  | Update (ownership re-checked)      |
| DELETE | `/api/facilities/:id`     | owner only  | Delete (ownership re-checked)       |
| GET    | `/api/categories`         | public      | Categories + facility counts        |

## Security notes

- **Passwords** are hashed with bcrypt (10 salt rounds); plaintext
  passwords are never stored or logged, and login uses the same
  generic error for unknown email and wrong password.
- **All SQL uses parameterized queries** (`?` placeholders) — no
  string-concatenated user input.
- **Server-side validation**: required fields, numeric IDs, allowed
  status values (`available`/`unavailable`), and submitted categories
  must exist.
- **Ownership is enforced on the server** for every update and delete
  (403 "You can only edit or delete your own facilities") — hiding
  the buttons in the UI alone would not be enough.
- **Image uploads** go through multer with a mimetype whitelist
  (JPEG/PNG), a 2 MB size limit, and server-generated UUID filenames;
  replaced/deleted images have their files removed.
- **Errors** are logged server-side and answered with short, generic
  JSON messages — no stack traces, passwords or DB credentials are
  ever exposed to clients.
- **Database credentials** live in `backend/.env` (gitignored); only
  `.env.example` with placeholder values is committed.
- Sessions use the express-session default in-memory store (as taught
  in class) — fine for development; restarting the server logs
  everyone out.
