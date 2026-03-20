require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'booking-engine-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Static files for invoices and uploads
app.use('/invoices', express.static(path.join(__dirname, '../invoices')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/refunds', require('./routes/refunds'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/waivers', require('./routes/waivers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/packages', require('./routes/packages'));
app.use('/api/addons', require('./routes/addons'));
app.use('/api/addon-catalog', require('./routes/addon-catalog'));
app.use('/api/email-automations', require('./routes/email-automations'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/blocked-times', require('./routes/blocked-times'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/google-calendar', require('./routes/google-calendar'));
app.use('/api/customers', require('./routes/customers'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catch-all for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Handle malformed JSON
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
