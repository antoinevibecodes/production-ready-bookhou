const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { sendInvitation } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const { sendAutomatedEmail } = require('../utils/automation');

// List invitations for a booking
router.get('/', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.query;
    const where = {};
    if (bookingId) where.bookingId = parseInt(bookingId);

    const invitations = await req.prisma.invitation.findMany({
      where,
      include: { waivers: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Create invitation
// BUG #14: Sends via email instead of SMS
// BUG #22: Generic invitation text instead of personalized
router.post('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, guestName, guestEmail, guestPhone } = req.body;

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true },
    });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const token = uuidv4();

    // Personalized invitation message
    const childInfo = booking.childName ? `${booking.childName}'s birthday party` : 'a party';
    const venueInfo = booking.venue?.name || 'our venue';
    const dateInfo = booking.date || '';
    const appUrl = process.env.APP_URL || 'http://localhost:5174';
    const message = `${booking.hostName} has invited you to ${childInfo} at ${venueInfo} on ${dateInfo}! RSVP here: ${appUrl}/rsvp/${token}`;

    // Phone-first: use SMS when phone available, email as fallback
    const deliveryMethod = guestPhone ? 'sms' : 'email';

    const invitation = await req.prisma.invitation.create({
      data: {
        bookingId,
        guestName,
        guestEmail: guestEmail || null,
        guestPhone: guestPhone || null,
        method: deliveryMethod,
        message,
        token,
      },
    });

    // Send via SMS when phone available, email as fallback
    if (deliveryMethod === 'sms') {
      const smsResult = await sendSMS({ to: guestPhone, message });
      if (!smsResult.success) {
        console.log(`[INVITATION] SMS failed, falling back to email for ${guestName}`);
        await sendInvitation(invitation, booking);
      }
    } else {
      await sendInvitation(invitation, booking);
    }

    res.status(201).json(invitation);
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ error: 'Failed to create invitation' });
  }
});

// RSVP endpoint (public - uses token)
// BUG #23: RSVP yes does NOT update waiverSigned status
router.post('/rsvp/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { status } = req.body; // YES or NO

    const invitation = await req.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const updateData = {
      rsvpStatus: status,
    };
    // When RSVP is YES, set waiverSigned to false (needs to be signed later)
    if (status === 'YES') {
      updateData.waiverSigned = false;
    }

    const updated = await req.prisma.invitation.update({
      where: { token },
      data: updateData,
      include: { booking: { include: { venue: true, invitations: true } } },
    });

    // Automation: RSVP Confirmation or Declined → email to host
    if (status === 'YES') {
      const totalComing = updated.booking?.invitations?.filter(i => i.rsvpStatus === 'YES').length || 1;
      await sendAutomatedEmail({
        trigger: 'RSVP_CONFIRMATION',
        to: updated.booking.hostEmail,
        booking: updated.booking,
        variables: { guestName: invitation.guestName, totalComing },
      });
    } else if (status === 'NO') {
      await sendAutomatedEmail({
        trigger: 'RSVP_DECLINED',
        to: updated.booking.hostEmail,
        booking: updated.booking,
        variables: { guestName: invitation.guestName },
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

module.exports = router;
