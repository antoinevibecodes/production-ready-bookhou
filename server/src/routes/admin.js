const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Admin dashboard - requires admin access
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const bookingCount = await req.prisma.booking.count();
    const confirmedCount = await req.prisma.booking.count({
      where: { status: 'CONFIRMED' },
    });
    const cancelledCount = await req.prisma.booking.count({
      where: { status: 'CANCELLED' },
    });

    const transactions = await req.prisma.transaction.findMany();

    const totalPayments = transactions
      .filter(t => t.type === 'PAYMENT')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalRefunds = transactions
      .filter(t => t.type === 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = totalPayments - totalRefunds;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayPayments = transactions.filter(
      t => t.type === 'PAYMENT' && new Date(t.createdAt) >= todayStart
    );
    const todayRefunds = transactions.filter(
      t => t.type === 'REFUND' && new Date(t.createdAt) >= todayStart
    );
    const todayIncome = todayPayments.reduce((sum, t) => sum + t.amount, 0)
      - todayRefunds.reduce((sum, t) => sum + t.amount, 0);

    // Business metrics
    const totalBirthdaysBooked = await req.prisma.booking.count({
      where: { type: 'BIRTHDAY' },
    });
    const totalFieldTrips = await req.prisma.booking.count({
      where: { type: 'FIELD_TRIP' },
    });
    const totalPackages = await req.prisma.package.count();
    const totalAddOns = await req.prisma.addOn.count();

    res.json({
      totalBookings: bookingCount,
      confirmedBookings: confirmedCount,
      cancelledBookings: cancelledCount,
      totalIncome,
      todayIncome,
      totalTransactions: transactions.length,
      totalBirthdaysBooked,
      totalFieldTrips,
      totalPackages,
      totalAddOns,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// BUG #17: No endpoint to get email logs for a booking
// This endpoint exists but is not used by the UI
router.get('/emails', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    const where = {};
    if (bookingId) where.bookingId = parseInt(bookingId);

    const emails = await req.prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
    });

    res.json(emails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email logs' });
  }
});

module.exports = router;
