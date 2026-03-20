const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { processRefund } = require('../utils/payment');
const { sendAutomatedEmail } = require('../utils/automation');

// List refunds for a booking
router.get('/', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    const where = {};
    if (bookingId) where.bookingId = parseInt(bookingId);

    const refunds = await req.prisma.refund.findMany({
      where,
      include: {
        transaction: true,
        booking: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(refunds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// Create refund
// BUG #10: Only accepts percentage, not exact amounts
// BUG #9: Refund transaction created but NOT visible in transaction list
router.post('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, percentage, amount: exactAmount, reason, cancellationFee } = req.body;

    // Support both percentage and exact dollar amount refunds
    if (!percentage && !exactAmount) {
      return res.status(400).json({ error: 'Either percentage or amount must be provided' });
    }
    if (percentage && (percentage <= 0 || percentage > 100)) {
      return res.status(400).json({ error: 'Percentage must be between 1 and 100' });
    }
    if (exactAmount && exactAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Get booking total
    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { package: true, addOns: true, transactions: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const totalPaid = booking.transactions
      .filter(t => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate refund from percentage or use exact amount
    const refundAmount = exactAmount ? exactAmount : Math.round(totalPaid * (percentage / 100));
    const fee = cancellationFee || 0;
    const netRefund = refundAmount - fee;

    if (netRefund <= 0) {
      return res.status(400).json({ error: 'Refund amount must be positive after cancellation fee' });
    }

    // Find the Stripe charge ID from the most recent card payment on this booking
    const cardPayment = booking.transactions
      .filter(t => t.type === 'PAYMENT' && t.notes && t.notes.includes('[stripe:'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    let stripeChargeId = null;
    if (cardPayment) {
      const match = cardPayment.notes.match(/\[stripe:(ch_[^\]]+)\]/);
      if (match) stripeChargeId = match[1];
    }

    // Process refund (real Stripe if charge ID exists, mock otherwise)
    const refundResult = await processRefund({
      originalTransactionId: stripeChargeId || 'mock',
      amount: netRefund,
    });

    if (!refundResult.success) {
      return res.status(400).json({ error: refundResult.error || 'Refund failed' });
    }

    // Create refund transaction
    // BUG #9: This transaction is type REFUND which is filtered out
    // of the transaction list query
    const transaction = await req.prisma.transaction.create({
      data: {
        bookingId,
        amount: netRefund,
        type: 'REFUND',
        paymentMethod: 'refund',
        notes: reason || 'Refund processed',
      },
    });

    const refund = await req.prisma.refund.create({
      data: {
        bookingId,
        transactionId: transaction.id,
        amount: netRefund,
        reason: reason || null,
        cancellationFee: fee,
      },
      include: { transaction: true },
    });

    // Automation: Refund Issued
    await sendAutomatedEmail({
      trigger: 'REFUND_ISSUED',
      to: booking.hostEmail,
      booking,
    });

    res.status(201).json(refund);
  } catch (error) {
    console.error('Error creating refund:', error);
    res.status(500).json({ error: 'Failed to create refund' });
  }
});

module.exports = router;
