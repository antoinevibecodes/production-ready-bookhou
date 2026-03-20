# Production Deployment Checklist

Everything that needs to change when moving from localhost demo to live environment.

---

## 1. Environment Variables (Create `.env` file)

The server needs these env vars set in production. NONE of these exist yet — they're all hardcoded for demo.

```bash
# Database (currently SQLite, needs MySQL)
DATABASE_URL=mysql://user:password@host:3306/booking_engine

# Stripe (currently test keys hardcoded in payment.js)
STRIPE_SECRET_KEY=sk_live_...

# SendGrid (currently hardcoded in email.js)
SENDGRID_API_KEY=SG.xxx...
SENDER_EMAIL=noreply@yourdomain.com    # currently: aiagentdemo123@gmail.com

# Twilio (currently hardcoded in sms.js)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Google Calendar (optional — not functional without these)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Session Security (currently hardcoded weak secret)
SESSION_SECRET=<random-32+-character-string>
NODE_ENV=production

# Server
PORT=3002
```

---

## 2. Files That Need Changes

### `server/prisma/schema.prisma` — Database switch
```
- provider = "sqlite"         →  provider = "mysql"
- url = "file:./dev.db"       →  url = env("DATABASE_URL")
```

### `server/src/index.js` — Security settings
| Line | Current | Change to |
|------|---------|-----------|
| 10 | `PORT = 3002` | `PORT = process.env.PORT \|\| 3002` |
| 14 | `origin: 'http://localhost:5174'` | `origin: 'https://yourdomain.com'` |
| 20 | `secret: 'booking-engine-secret-key'` | `secret: process.env.SESSION_SECRET` |
| 23 | `secure: false` | `secure: true` (HTTPS required) |

### `server/src/utils/payment.js` — Stripe key
| Line | Current | Change to |
|------|---------|-----------|
| 3 | `sk_test_51T9qcS...` (hardcoded) | `process.env.STRIPE_SECRET_KEY` |

### `server/src/utils/email.js` — SendGrid + URLs
| Line | Current | Change to |
|------|---------|-----------|
| 8 | `SG.JCUvJVpdR0K8G...` (hardcoded) | `process.env.SENDGRID_API_KEY` |
| 9 | `aiagentdemo123@gmail.com` | `process.env.SENDER_EMAIL` |
| 42 | `http://localhost:5174` (base URL) | `https://yourdomain.com` |

### `server/src/utils/sms.js` — Twilio credentials
| Line | Current | Change to |
|------|---------|-----------|
| 4 | `ACe37be534...` (hardcoded SID) | `process.env.TWILIO_ACCOUNT_SID` |
| 5 | `7d9fa6ad...` (hardcoded auth) | `process.env.TWILIO_AUTH_TOKEN` |
| 6 | `+13194633518` (hardcoded phone) | `process.env.TWILIO_PHONE_NUMBER` |

### `server/src/routes/invitations.js` — Invitation links
| Line | Current | Change to |
|------|---------|-----------|
| 50 | `http://localhost:5174/rsvp/${token}` | `https://yourdomain.com/rsvp/${token}` |

### `server/src/routes/google-calendar.js` — OAuth redirect
| Line | Current | Change to |
|------|---------|-----------|
| 9 | `http://localhost:3002/api/google-calendar/callback` | `https://yourdomain.com/api/google-calendar/callback` |
| 73 | `http://localhost:5174/calendar` | `https://yourdomain.com/calendar` |

### `server/src/utils/automation.js` — Business info in email templates
| Line | Current | Change to |
|------|---------|-----------|
| 31 | `helenfunfactory@gmail.com` | Real business email |
| 32 | `404-944-4499` | Real business phone |

### `client/vite.config.js` — Proxy targets (dev only)
| Line | Current | Change to |
|------|---------|-----------|
| 12 | `target: 'http://localhost:3002'` | Production API URL |
| 16 | `target: 'http://localhost:3002'` | Production API URL |

Note: In production, Vite dev server is NOT used. The client is built (`npm run build`) and served as static files. The proxy config only matters for development.

### `client/src/pages/RoomsPage.jsx` — Hardcoded API URLs
| Lines | Current | Change to |
|-------|---------|-----------|
| 193, 209 | `http://localhost:3002/api/venues/...` | `/api/venues/...` (relative) |
| 530 | `http://localhost:3002/uploads/room-images/...` | `/uploads/room-images/...` |

### `client/src/pages/PackagesPage.jsx` — Hardcoded API URLs
| Lines | Current | Change to |
|-------|---------|-----------|
| 247, 267 | `http://localhost:3002/api/packages/...` | `/api/packages/...` (relative) |
| 616 | `http://localhost:3002/uploads/package-images/...` | `/uploads/package-images/...` |

### `client/src/pages/NewBookingPage.jsx` — Hardcoded upload URL
| Line | Current | Change to |
|------|---------|-----------|
| 593 | `http://localhost:3002/uploads/addons/...` | `/uploads/addons/...` |

### `client/src/pages/LoginPage.jsx` — Demo credentials shown on screen
| Lines | Current | Action |
|-------|---------|--------|
| 36-58 | Shows `admin@bookingengine.com / admin123` | Remove demo login hints |

---

## 3. Database Migration

- Current: **SQLite** (`server/prisma/dev.db`) — demo only, single file
- Production: **MySQL** on AWS
- Steps:
  1. Update `schema.prisma` provider to `mysql`
  2. Set `DATABASE_URL` env var
  3. Run `npx prisma migrate deploy` (creates tables)
  4. Create admin user manually or via seed (do NOT use demo seed with fake data)
  5. Migrate real customer data from old Laravel system separately

---

## 4. Things That Already Work Correctly

These use dynamic detection and will work in production without changes:
- **Waiver links** in EventWaiversPage — uses `window.location.origin` (auto-detects domain)
- **Verification QR codes** in WaiverPage — uses `window.location.origin`
- **Waiver routes** in waivers.js — uses `req.headers['x-forwarded-proto']` for HTTPS detection
- **All frontend API calls** via `api/client.js` — uses relative `/api/` paths

---

## 5. Production Build Steps

```bash
# 1. Build the React frontend
cd client
npm run build          # creates client/dist/ folder

# 2. Serve dist/ folder via nginx or Express static middleware

# 3. Start the Node.js server
cd server
NODE_ENV=production node src/index.js
```

---

## 6. Required Third-Party Setup

| Service | What's needed | Status |
|---------|--------------|--------|
| **Stripe** | Switch from test keys to live keys | Need live keys |
| **SendGrid** | Authenticate sender domain (SPF/DKIM) | Emails currently "deferred" |
| **Twilio** | Upgrade from trial (can only SMS verified numbers) | Need paid account |
| **Google Calendar** | Register OAuth app, get Client ID/Secret | Not yet set up |
| **Roller** | Get API Key + Venue ID from client | Client hasn't bought subscription |

---

## 7. Nginx Config (Reverse Proxy)

Production needs nginx (or similar) to:
- Serve `client/dist/` static files
- Proxy `/api/*` requests to Node.js backend
- Set `X-Forwarded-Proto: https` header
- Handle SSL/HTTPS certificates

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    root /path/to/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    location /uploads/ {
        proxy_pass http://localhost:3002;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
