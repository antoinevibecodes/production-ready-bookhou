const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { processPayment } = require('../utils/payment');
const { sendBalanceSettledEmail } = require('../utils/email');
const { sendAutomatedEmail } = require('../utils/automation');

// Helper: format date in venue timezone
function formatInTimezone(date, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

// Transaction list with filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, startDate, endDate, paymentMethod } = req.query;
    const isEmployee = req.session.role === 'EMPLOYEE';

    const where = {};

    if (bookingId) where.bookingId = parseInt(bookingId);
    if (req.query.type) where.type = req.query.type;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    const transactions = await req.prisma.transaction.findMany({
      where,
      include: {
        booking: {
          include: {
            venue: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = transactions.map(t => {
      const tz = t.booking?.venue?.timezone || 'America/New_York';
      const row = {
        id: t.id,
        bookingId: t.bookingId,
        type: t.type,
        paymentMethod: t.paymentMethod,
        notes: t.notes,
        cardLast4: t.cardLast4,
        cardholderName: t.cardholderName,
        createdAt: t.createdAt,
        booking: t.booking,
        displayDate: formatInTimezone(t.createdAt, tz),
      };
      // Employees can see transactions but not dollar amounts
      if (isEmployee) {
        row.amount = null;
        row.amountHidden = true;
      } else {
        row.amount = t.amount;
      }
      return row;
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get single transaction
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const transaction = await req.prisma.transaction.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        booking: { include: { venue: true } },
        refund: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// Create transaction (payment)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, amount, paymentMethod, notes, cardNumber, cardholderName } = req.body;

    // Calculate remaining balance and block overpayment
    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true, addOns: true, transactions: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const packagePrice = booking.package?.price || 0;
    const addOnsTotal = (booking.addOns || []).reduce((s, a) => s + a.price * a.quantity, 0);
    const extraPersonsCost = (booking.type === 'FIELD_TRIP') ? (booking.extraPersons || 0) * (booking.extraPersonPrice || 0) : 0;
    const subtotal = packagePrice + addOnsTotal + extraPersonsCost;
    const tax = Math.round(subtotal * 0.06);
    const totalDue = subtotal + tax;

    const totalPaid = booking.transactions.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
    const totalRefunded = booking.transactions.filter(t => t.type === 'REFUND').reduce((s, t) => s + t.amount, 0);
    const balance = totalDue - (totalPaid - totalRefunded);

    if (balance <= 0) {
      return res.status(400).json({ error: 'Balance is already fully paid. No payment needed.' });
    }

    if (amount > balance) {
      return res.status(400).json({ error: `Payment amount ($${(amount / 100).toFixed(2)}) exceeds remaining balance ($${(balance / 100).toFixed(2)}). Maximum allowed: $${(balance / 100).toFixed(2)}` });
    }

    // Process payment (real Stripe for cards, mock for cash)
    const paymentResult = await processPayment({
      amount,
      method: paymentMethod,
      cardNumber,
      cardholderName,
    });

    if (!paymentResult.success) {
      return res.status(400).json({ error: paymentResult.error || 'Payment failed' });
    }

    // Store Stripe charge ID in notes for refund lookup
    const txnNotes = paymentResult.stripeChargeId
      ? `${notes || ''} [stripe:${paymentResult.stripeChargeId}]`.trim()
      : (notes || null);

    const transaction = await req.prisma.transaction.create({
      data: {
        bookingId,
        amount,
        type: 'PAYMENT',
        paymentMethod,
        notes: txnNotes,
        cardLast4: paymentResult.cardLast4 || null,
        cardholderName: paymentResult.cardholderName || null,
      },
      include: {
        booking: true,
      },
    });

    // If booking was REQUESTED (no prior payment), confirm it now
    if (booking.status === 'REQUESTED') {
      await req.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      });
    }

    // Check if balance is now settled after this payment
    const newNetPaid = (totalPaid + amount) - totalRefunded;
    if (newNetPaid >= totalDue) {
      await sendBalanceSettledEmail(booking);
    }

    // Automation: Payment Made
    await sendAutomatedEmail({
      trigger: 'PAYMENT_MADE',
      to: booking.hostEmail,
      booking,
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

module.exports = router;
