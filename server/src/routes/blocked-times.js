const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// List blocked times (optionally filter by date)
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = {};
    if (req.query.date) where.date = req.query.date;
    const blocked = await req.prisma.blockedTime.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(blocked);
  } catch (error) {
    console.error('Error fetching blocked times:', error);
    res.status(500).json({ error: 'Failed to fetch blocked times' });
  }
});

// Check for event conflicts on a date for given slots
router.post('/check-conflicts', requireAuth, async (req, res) => {
  try {
    const { date, slots } = req.body; // slots = [{ room, startTime, endTime }]
    if (!date || !slots?.length) return res.json({ conflicts: [] });

    const bookings = await req.prisma.booking.findMany({
      where: {
        date,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      include: { venue: true, package: true },
    });

    const conflicts = [];
    for (const slot of slots) {
      for (const booking of bookings) {
        // Check if booking's venue name matches the room and times overlap
        if (booking.venue?.name === slot.room) {
          if (timesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime)) {
            conflicts.push({
              room: slot.room,
              slotStart: slot.startTime,
              slotEnd: slot.endTime,
              bookingId: booking.id,
              hostName: booking.hostName,
              eventType: booking.type,
              eventStart: booking.startTime,
              eventEnd: booking.endTime,
            });
          }
        }
      }
    }

    res.json({ conflicts });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Create blocked times (bulk)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { date, slots, reason } = req.body; // slots = [{ room, startTime, endTime }]
    if (!date || !slots?.length) {
      return res.status(400).json({ error: 'Date and at least one slot are required' });
    }

    const created = [];
    for (const slot of slots) {
      const bt = await req.prisma.blockedTime.create({
        data: {
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
          reason: reason || '',
        },
      });
      created.push(bt);
    }

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating blocked times:', error);
    res.status(500).json({ error: 'Failed to create blocked times' });
  }
});

// Update a blocked time
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, startTime, endTime, room, reason } = req.body;
    const updateData = {};
    if (date !== undefined) updateData.date = date;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (room !== undefined) updateData.room = room;
    if (reason !== undefined) updateData.reason = reason;

    const updated = await req.prisma.blockedTime.update({ where: { id }, data: updateData });
    res.json(updated);
  } catch (error) {
    console.error('Error updating blocked time:', error);
    res.status(500).json({ error: 'Failed to update blocked time' });
  }
});

// Delete a blocked time
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await req.prisma.blockedTime.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete blocked time' });
  }
});

// Helper: check if two time ranges overlap
function timesOverlap(s1, e1, s2, e2) {
  const toMins = (t) => {
    // Handle both "HH:mm" and "HH:mm AM/PM" formats
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
  const start1 = toMins(s1), end1 = toMins(e1);
  const start2 = toMins(s2), end2 = toMins(e2);
  return start1 < end2 && start2 < end1;
}

module.exports = router;
