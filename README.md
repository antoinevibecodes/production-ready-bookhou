# Booking Engine — Party Booking SaaS (Debug Practice)

A local "booking engine" web app (mini clone of BookHou/Bookoo) designed for practicing debugging. Includes **26 intentional bugs** that mimic real production issues.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite with Prisma ORM
- **Frontend**: React (Vite)
- **Auth**: Cookie-based session auth (ADMIN and EMPLOYEE roles)
- **Payments**: Mock Stripe/Square simulation
- **Email/SMS**: Mocked providers (logged to console + stored in DB)
- **PDF Invoices**: Generated with PDFKit
- **Testing**: Jest (backend)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Setup (one-time)

```bash
# Install all dependencies
npm run install:all

# Run Prisma migration + seed
npm run setup
```

### Run the App

```bash
# Start both backend (port 3001) and frontend (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

### Login Credentials

| Role     | Email                        | Password     |
|----------|------------------------------|-------------|
| Admin    | admin@bookingengine.com      | admin123    |
| Employee | mike@bookingengine.com       | employee123 |
| Employee | jessica@bookingengine.com    | employee123 |

## Project Structure

```
/
├── package.json           # Root: concurrently runs server + client
├── README.md              # This file
├── BUGS.md                # Intentional bug list (26 bugs)
├── server/
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma  # Database models
│   │   └── seed.js        # Seed data (22 bookings, transactions, etc.)
│   ├── src/
│   │   ├── index.js       # Express app entry
│   │   ├── middleware/
│   │   │   └── auth.js    # Auth + role middleware
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── bookings.js
│   │   │   ├── transactions.js
│   │   │   ├── reports.js
│   │   │   ├── refunds.js
│   │   │   ├── invoices.js
│   │   │   ├── invitations.js
│   │   │   ├── waivers.js
│   │   │   ├── admin.js
│   │   │   ├── venues.js
│   │   │   ├── packages.js
│   │   │   └── addons.js
│   │   └── utils/
│   │       ├── email.js   # Mock email provider
│   │       ├── sms.js     # Mock SMS provider
│   │       ├── pdf.js     # Invoice PDF generation
│   │       └── payment.js # Mock payment processor
│   └── tests/
│       └── api.test.js    # Jest API tests
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── api/
        │   └── client.js     # API helper
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   └── Layout.jsx     # Sidebar + main layout
        └── pages/
            ├── LoginPage.jsx
            ├── DashboardPage.jsx
            ├── BookingsPage.jsx
            ├── BookingDetailPage.jsx
            ├── TransactionsPage.jsx
            ├── ReportsPage.jsx
            ├── InvoicesPage.jsx
            ├── InvitationsPage.jsx
            ├── WaiverPage.jsx
            ├── RsvpPage.jsx
            └── NewBookingPage.jsx
```

## Seed Data

The seed creates:

- **3 users** (1 admin, 2 employees)
- **2 venues** (NYC = America/New_York, Chicago = America/Chicago)
- **5 packages** (3 birthday, 2 field trip)
- **22 bookings** (birthdays + field trips, various statuses)
- **23 transactions** (payments + refunds, cash/card/apple_pay/cash_app)
- **4 refunds** (full and partial, with cancellation fees)
- **5 invoices**
- **9 invitations** (with RSVP statuses)
- **3 waivers** (signed and unsigned)
- **Email logs** (confirmation + invitation emails)

### Edge Cases in Seed Data

- Booking #13 (Oakwood Elementary): guestCount=15, missing from event list (BUG #13)
- Booking #10 (Lisa Martinez): paid with Apple Pay (BUG #6)
- Booking #19 (Daniel Kim): paid with Cash App (BUG #6)
- Booking #6 (Karen Brown): cancelled with refund
- Booking #11 (Thomas White): partial refund
- Booking #22 (Rachel Green): fully refunded
- Multiple venues with different timezones

## API Routes

| Method | Route                       | Description                    |
|--------|-----------------------------|--------------------------------|
| POST   | /api/auth/login             | Login                         |
| POST   | /api/auth/logout            | Logout                        |
| GET    | /api/auth/me                | Current user                  |
| GET    | /api/bookings               | List bookings                 |
| GET    | /api/bookings/:id           | Get booking detail            |
| POST   | /api/bookings               | Create booking                |
| PUT    | /api/bookings/:id           | Update booking                |
| POST   | /api/bookings/:id/cancel    | Cancel booking                |
| GET    | /api/transactions           | List transactions             |
| GET    | /api/transactions/:id       | Get transaction               |
| POST   | /api/transactions           | Record payment                |
| GET    | /api/reports/cash           | Cash report                   |
| GET    | /api/reports/summary        | Summary report                |
| GET    | /api/reports/export         | Export CSV                    |
| GET    | /api/refunds                | List refunds                  |
| POST   | /api/refunds                | Create refund                 |
| GET    | /api/invoices               | List invoices                 |
| GET    | /api/invoices/:id           | Get invoice                   |
| POST   | /api/invoices/generate      | Generate invoice PDF          |
| GET    | /api/invoices/:id/download  | Download PDF                  |
| GET    | /api/invitations            | List invitations              |
| POST   | /api/invitations            | Send invitation               |
| POST   | /api/invitations/rsvp/:token| RSVP (public)                 |
| GET    | /api/waivers                | List waivers                  |
| GET    | /api/waivers/token/:token   | Get waiver by token           |
| POST   | /api/waivers                | Create waiver                 |
| PUT    | /api/waivers/sign/:token    | Sign waiver                   |
| GET    | /api/admin/dashboard        | Dashboard stats               |
| GET    | /api/admin/emails           | Email logs                    |
| GET    | /api/venues                 | List venues                   |
| GET    | /api/packages               | List packages                 |
| GET    | /api/addons                 | List add-ons                  |
| POST   | /api/addons                 | Add add-on                    |
| DELETE | /api/addons/:id             | Remove add-on                 |

## UI Pages

| Route                | Page                | Access    |
|---------------------|---------------------|-----------|
| /login              | Login               | Public    |
| /                   | Dashboard           | All       |
| /bookings           | Events List         | All       |
| /bookings/new       | New Booking         | All       |
| /bookings/:id       | Booking Detail      | All       |
| /transactions       | Transactions List   | All       |
| /reports            | Reports             | All (bug) |
| /invoices           | Invoices List       | All       |
| /invitations        | Invitations List    | All       |
| /rsvp/:token        | RSVP Page           | Public    |
| /waiver/:token      | Waiver Form         | Public*   |

\* Waiver page should be public but currently requires login (BUG #24)

## Testing

```bash
# Run backend API tests
npm test

# Reset database and re-seed
npm run reset
```

## Debugging Guide

See **BUGS.md** for a complete list of 26 intentional bugs, each with:
- Description
- How to reproduce
- Expected correct behavior
- Files involved

Bugs are labeled in the source code with comments like `// BUG #1:` for easy searching.
