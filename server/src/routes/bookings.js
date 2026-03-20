const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { sendBookingConfirmation } = require('../utils/email');
const { sendAutomatedEmail } = require('../utils/automation');

// BUG #13: Event list query has a buggy filter that excludes
// bookings with status 'CONFIRMED' and type 'FIELD_TRIP' when
// guestCount is exactly 15 (one seeded booking matches this)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, type, venueId, startDate, endDate } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (venueId) where.venueId = parseInt(venueId);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const bookings = await req.prisma.booking.findMany({
      where,
      include: {
        venue: true,
        package: true,
        addOns: true,
        transactions: true,
        waivers: true,
        _count: {
          select: { transactions: true, invitations: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    const formatted = bookings.map(b => {
      const tz = b.venue?.timezone || 'America/New_York';
      const waiverSignedCount = (b.waivers || []).filter(w => w.signedAt).length;
      return {
        ...b,
        waiverSignedCount,
        displayDate: new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(new Date(b.date + 'T12:00:00')),
        displayTime: `${b.startTime} - ${b.endTime}`,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get single booking
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const booking = await req.prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        venue: true,
        package: true,
        addOns: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
        refunds: true,
        invitations: true,
        waivers: true,
        invoices: true,
        emailLogs: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// Create booking
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      type, hostName, hostEmail, hostPhone, childName, childAge,
      guestCount, extraPersons, date, startTime, endTime,
      venueId, packageId, notes,
    } = req.body;

    const pkg = await req.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) {
      return res.status(400).json({ error: 'Invalid package' });
    }

    // BUG #19: Extra persons pricing calculated but NOT auto-applied
    // until a second save is triggered
    const extraPersonPrice = type === 'FIELD_TRIP' ? 1500 : 0; // $15 per extra person for field trips

    const booking = await req.prisma.booking.create({
      data: {
        type,
        hostName,
        hostEmail,
        hostPhone,
        childName: childName || null,
        childAge: childAge || null,
        guestCount: guestCount || 10,
        extraPersons: extraPersons || 0,
        extraPersonPrice,
        date,
        startTime,
        endTime,
        notes: notes || null,
        venueId,
        packageId,
        userId: req.session.userId,
      },
      include: { venue: true, package: true },
    });

    // BUG #16: Send confirmation with wrong base URL
    await sendBookingConfirmation(booking);

    // Automation: Event Create
    await sendAutomatedEmail({
      trigger: 'EVENT_CREATE',
      to: booking.hostEmail,
      booking,
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Recover a deleted booking (check for conflicts first)
router.post('/:id/recover', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'DELETED') return res.status(400).json({ error: 'Booking is not deleted' });

    // Check if another booking exists at the same venue, date, and overlapping time
    const conflicting = await req.prisma.booking.findMany({
      where: {
        id: { not: bookingId },
        venueId: booking.venueId,
        date: booking.date,
        status: { in: ['REQUESTED', 'CONFIRMED', 'COMPLETED'] },
      },
      include: { venue: true },
    });

    // Check time overlap
    const toMins = (t) => {
      if (!t) return 0;
      if (t.includes('AM') || t.includes('PM')) {
        const [time, period] = t.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      }
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const bStart = toMins(booking.startTime);
    const bEnd = toMins(booking.endTime);
    const conflicts = conflicting.filter(c => {
      const cStart = toMins(c.startTime);
      const cEnd = toMins(c.endTime);
      return bStart < cEnd && cStart < bEnd;
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'conflict',
        message: 'Cannot recover this event — there is a scheduling conflict.',
        conflicts: conflicts.map(c => ({
          id: c.id,
          hostName: c.hostName,
          date: c.date,
          startTime: c.startTime,
          endTime: c.endTime,
          room: c.venue?.name || 'N/A',
          type: c.type,
        })),
      });
    }

    // Also check for blocked times
    const blockedConflicts = await req.prisma.blockedTime.findMany({
      where: { date: booking.date, room: booking.venue?.name || '' },
    });

    const blockedOverlaps = blockedConflicts.filter(bt => {
      const btStart = toMins(bt.startTime);
      const btEnd = toMins(bt.endTime);
      return bStart < btEnd && btStart < bEnd;
    });

    if (blockedOverlaps.length > 0) {
      return res.status(409).json({
        error: 'conflict',
        message: 'Cannot recover this event — the time slot is blocked.',
        conflicts: blockedOverlaps.map(bt => ({
          room: bt.room,
          date: bt.date,
          startTime: bt.startTime,
          endTime: bt.endTime,
          reason: bt.reason,
          type: 'BLOCKED',
        })),
      });
    }

    // No conflicts — recover: REQUESTED if no payments, CONFIRMED if has payments
    const payments = await req.prisma.transaction.count({
      where: { bookingId, type: 'PAYMENT' },
    });
    const recovered = await req.prisma.booking.update({
      where: { id: bookingId },
      data: { status: payments > 0 ? 'CONFIRMED' : 'REQUESTED' },
    });

    res.json(recovered);
  } catch (error) {
    console.error('Error recovering booking:', error);
    res.status(500).json({ error: 'Failed to recover booking' });
  }
});

// Update booking
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const existingBooking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existingBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updateData = {};
    const fields = [
      'hostName', 'hostEmail', 'hostPhone', 'childName', 'childAge',
      'guestCount', 'extraPersons', 'date', 'startTime', 'endTime',
      'notes', 'status', 'venueId', 'packageId',
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Recalculate extraPersonPrice for FIELD_TRIP when guestCount changes
    const bookingType = updateData.type || existingBooking.type;
    if (bookingType === 'FIELD_TRIP' && updateData.guestCount !== undefined) {
      updateData.extraPersonPrice = 1500; // $15 per extra person for field trips
    }

    const booking = await req.prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        venue: true,
        package: true,
        addOns: true,
        transactions: true,
      },
    });

    // Automation: Review Email when event is completed
    if (updateData.status === 'COMPLETED' && existingBooking.status !== 'COMPLETED') {
      await sendAutomatedEmail({
        trigger: 'REVIEW_POST_PARTY',
        to: booking.hostEmail,
        booking,
      });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Cancel booking
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking = await req.prisma.booking.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'CANCELLED' },
      include: { venue: true, invitations: true },
    });

    // Automation: Event Cancellation To Host
    await sendAutomatedEmail({
      trigger: 'EVENT_CANCELLATION_HOST',
      to: booking.hostEmail,
      booking,
    });

    // Automation: Event Cancellation To Guest — email each confirmed guest
    if (booking.invitations?.length) {
      for (const inv of booking.invitations) {
        if (inv.rsvpStatus === 'YES' && (inv.guestEmail || inv.guestPhone)) {
          await sendAutomatedEmail({
            trigger: 'EVENT_CANCELLATION_GUEST',
            to: inv.guestEmail || inv.guestPhone,
            booking,
            variables: { guestName: inv.guestName },
          });
        }
      }
    }

    res.json(booking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

module.exports = router;
