const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');

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

// Charge by Cash report - admin only
router.get('/cash', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod, type, userId } = req.query;

    const where = {};

    // Filter by transaction type (PAYMENT, REFUND, or both)
    if (type && type !== 'all') {
      where.type = type;
    } else {
      where.type = 'PAYMENT';
    }

    // Filter by payment method
    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Filter by team member
    if (userId && userId !== 'all') {
      where.booking = { is: { userId: parseInt(userId) } };
    }

    const transactions = await req.prisma.transaction.findMany({
      where,
      include: {
        booking: {
          include: {
            venue: true,
            package: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Also get refunds for the same period
    const refundWhere = {};
    refundWhere.type = 'REFUND';
    if (paymentMethod && paymentMethod !== 'all') {
      // Refunds don't filter by payment method the same way
    }
    if (startDate || endDate) {
      refundWhere.createdAt = {};
      if (startDate) refundWhere.createdAt.gte = new Date(startDate);
      if (endDate) refundWhere.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }
    const refunds = await req.prisma.transaction.findMany({ where: refundWhere });
    const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0);

    const rows = transactions.map(t => {
      const tz = t.booking?.venue?.timezone || 'America/New_York';
      return {
        id: t.id,
        bookingId: t.bookingId,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        date: formatInTimezone(t.createdAt, tz),
        hostName: t.booking?.hostName,
        eventType: t.booking?.type,
        venueName: t.booking?.venue?.name,
        packageName: t.booking?.package?.name,
        notes: t.notes || '',
      };
    });

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalTax = Math.round(totalAmount * 0.06);
    res.json({
      rows,
      totalAmount,
      totalTax,
      totalRefunded,
      netAmount: totalAmount - totalRefunded,
      count: rows.length,
    });
  } catch (error) {
    console.error('Error fetching cash report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// General reports - admin only
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const payments = await req.prisma.transaction.findMany({
      where: { ...where, type: 'PAYMENT' },
    });

    const refunds = await req.prisma.transaction.findMany({
      where: { ...where, type: 'REFUND' },
    });

    const totalSales = payments.reduce((sum, t) => sum + t.amount, 0);
    const totalRefunded = refunds.reduce((sum, t) => sum + t.amount, 0);
    const cashSales = payments
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);
    const cardSales = payments
      .filter(t => t.paymentMethod === 'card')
      .reduce((sum, t) => sum + t.amount, 0);
    const applePaySales = payments
      .filter(t => t.paymentMethod === 'apple_pay')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashAppSales = payments
      .filter(t => t.paymentMethod === 'cash_app')
      .reduce((sum, t) => sum + t.amount, 0);

    // Business metrics
    const bookingWhere = {};
    if (startDate || endDate) {
      bookingWhere.createdAt = {};
      if (startDate) bookingWhere.createdAt.gte = new Date(startDate);
      if (endDate) bookingWhere.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const totalBirthdaysBooked = await req.prisma.booking.count({
      where: { ...bookingWhere, type: 'BIRTHDAY' },
    });
    const totalFieldTrips = await req.prisma.booking.count({
      where: { ...bookingWhere, type: 'FIELD_TRIP' },
    });
    const totalAddOns = await req.prisma.addOn.count();
    const totalPackages = await req.prisma.package.count();

    const totalTax = Math.round(totalSales * 0.06);

    res.json({
      totalSales,
      totalRefunded,
      netSales: totalSales - totalRefunded,
      cashSales,
      cardSales,
      applePaySales,
      cashAppSales,
      transactionCount: payments.length,
      totalBirthdaysBooked,
      totalFieldTrips,
      totalAddOns,
      totalPackages,
      totalTax,
    });
  } catch (error) {
    console.error('Error fetching report summary:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Export - admin only
router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, paymentMethod } = req.query;

    const where = { type: 'PAYMENT' };
    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const transactions = await req.prisma.transaction.findMany({
      where,
      include: {
        booking: {
          include: { venue: true, package: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

    const csv = [
      'ID,Date,Booking,Host,Amount,Method,Venue,Package,Notes',
      ...transactions.map(t => {
        const tz = t.booking?.venue?.timezone || 'America/New_York';
        return `${t.id},"${formatInTimezone(t.createdAt, tz)}",${t.bookingId},"${t.booking?.hostName || ''}",${(t.amount / 100).toFixed(2)},${t.paymentMethod},"${t.booking?.venue?.name || ''}","${t.booking?.package?.name || ''}","${(t.notes || '').replace(/"/g, '""')}"`;
      }),
      `,,,,${(totalAmount / 100).toFixed(2)},TOTAL,,,`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// Analytics dashboard data
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, compareStartDate, compareEndDate } = req.query;

    async function getMetrics(sd, ed) {
      const dateWhere = {};
      if (sd || ed) {
        dateWhere.createdAt = {};
        if (sd) dateWhere.createdAt.gte = new Date(sd);
        if (ed) dateWhere.createdAt.lte = new Date(ed + 'T23:59:59.999Z');
      }

      // Parties by status
      const allBookings = await req.prisma.booking.findMany({ where: { ...dateWhere, status: { not: 'DELETED' } }, select: { status: true, userId: true } });
      const requested = allBookings.length;
      const accepted = allBookings.filter(b => b.status === 'CONFIRMED').length;
      const completed = allBookings.filter(b => b.status === 'COMPLETED').length;
      const cancelled = allBookings.filter(b => b.status === 'CANCELLED').length;
      const byBusiness = allBookings.filter(b => b.userId != null).length;
      const byClientPage = allBookings.filter(b => b.userId == null).length;

      // Tips (no tip field yet — return 0)
      const tipsTotal = 0;
      const tipsAverage = 0;

      // Add-ons
      const bookingIds = (await req.prisma.booking.findMany({ where: dateWhere, select: { id: true } })).map(b => b.id);
      const addonsCount = bookingIds.length > 0 ? await req.prisma.addOn.count({ where: { bookingId: { in: bookingIds } } }) : 0;

      // Revenue
      const payments = await req.prisma.transaction.findMany({ where: { ...dateWhere, type: 'PAYMENT' } });
      const totalRevenue = payments.reduce((s, t) => s + t.amount, 0);
      const refunds = await req.prisma.transaction.findMany({ where: { ...dateWhere, type: 'REFUND' } });
      const totalRefunded = refunds.reduce((s, t) => s + t.amount, 0);

      return {
        parties: { requested, accepted, completed, cancelled, rejected: 0, byBusiness, byClientPage },
        tips: { total: tipsTotal, average: tipsAverage },
        addons: { total: addonsCount, online: addonsCount, inPerson: 0 },
        revenue: { total: totalRevenue, refunded: totalRefunded, net: totalRevenue - totalRefunded, count: payments.length },
      };
    }

    const current = await getMetrics(startDate, endDate);
    let comparison = null;
    if (compareStartDate && compareEndDate) {
      comparison = await getMetrics(compareStartDate, compareEndDate);
    }

    res.json({ current, comparison });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Team members list for reports filter
router.get('/team-members', requireAdmin, async (req, res) => {
  try {
    const users = await req.prisma.user.findMany({ select: { id: true, name: true, role: true } });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

module.exports = router;
