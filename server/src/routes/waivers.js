const express = require('express');
const router = express.Router();
const fs = require('fs');
const { requireAuth, requireAuthOrToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../utils/email');
const { generateWaiverPDF } = require('../utils/pdf');
const { sendAutomatedEmail } = require('../utils/automation');

// ─── Dashboard Stats ───
router.get('/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayStart = new Date(todayStr + 'T00:00:00');
    const todayEnd = new Date(todayStr + 'T23:59:59');

    const now = new Date();

    const [totalSigned, signedToday, pendingVerification, walkinCount, bookingCount, expiredCount] = await Promise.all([
      req.prisma.waiver.count({ where: { signedAt: { not: null } } }),
      req.prisma.waiver.count({ where: { signedAt: { gte: todayStart, lte: todayEnd } } }),
      req.prisma.waiver.count({ where: { signedAt: { not: null }, status: 'signed' } }),
      req.prisma.waiver.count({ where: { type: 'walkin', signedAt: { not: null } } }),
      req.prisma.waiver.count({ where: { type: 'booking', signedAt: { not: null } } }),
      req.prisma.waiver.count({ where: { signedAt: { not: null }, expiresAt: { lt: now } } }),
    ]);

    res.json({ totalSigned, signedToday, pendingVerification, walkinCount, bookingCount, expiredCount });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── List waivers (supports filtering) ───
router.get('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, type, venueId, status, search, startDate, endDate, page = 1, limit = 50 } = req.query;
    const where = { signedAt: { not: null } }; // only show signed waivers

    if (bookingId) where.bookingId = parseInt(bookingId);
    if (type && type !== 'all') where.type = type;
    if (venueId) where.venueId = parseInt(venueId);
    if (status && status !== 'all') where.status = status;

    if (search) {
      where.OR = [
        { guestName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.signedAt = { ...where.signedAt };
      if (startDate) where.signedAt.gte = new Date(startDate + 'T00:00:00');
      if (endDate) where.signedAt.lte = new Date(endDate + 'T23:59:59');
    }

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const skip = (parsedPage - 1) * parsedLimit;

    const [waivers, total] = await Promise.all([
      req.prisma.waiver.findMany({
        where,
        include: {
          booking: { include: { venue: true } },
          venue: true,
          invitation: true,
        },
        orderBy: { signedAt: 'desc' },
        skip,
        take: parsedLimit,
      }),
      req.prisma.waiver.count({ where }),
    ]);

    // Attach venue name and expiration status for display
    const now = new Date();
    const formatted = waivers.map(w => ({
      ...w,
      venueName: w.venue?.name || w.booking?.venue?.name || 'N/A',
      expired: w.expiresAt ? new Date(w.expiresAt) < now : false,
    }));

    res.json({ waivers: formatted, total, page: parsedPage, limit: parsedLimit });
  } catch (error) {
    console.error('Error fetching waivers:', error);
    res.status(500).json({ error: 'Failed to fetch waivers' });
  }
});

// ─── Get waiver by token (public access via valid token) ───
router.get('/token/:token', requireAuthOrToken, async (req, res) => {
  try {
    const waiver = await req.prisma.waiver.findUnique({
      where: { token: req.params.token },
      include: {
        booking: { include: { venue: true } },
        venue: true,
        invitation: true,
      },
    });

    if (!waiver) {
      return res.status(404).json({ error: 'Waiver not found' });
    }

    res.json(waiver);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch waiver' });
  }
});

// ─── Create waiver (booking or walk-in) ───
router.post('/', requireAuth, async (req, res) => {
  try {
    const { bookingId, invitationId, guestName, venueId, type } = req.body;
    const token = uuidv4();

    const data = {
      guestName: guestName || 'Guest',
      token,
      type: type || (bookingId ? 'booking' : 'walkin'),
    };

    if (bookingId) data.bookingId = bookingId;
    if (invitationId) data.invitationId = invitationId;
    if (venueId) data.venueId = venueId;

    const waiver = await req.prisma.waiver.create({ data });

    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';

    res.status(201).json({
      ...waiver,
      link: `${protocol}://${host}/waiver/${token}`,
    });
  } catch (error) {
    console.error('Error creating waiver:', error);
    res.status(500).json({ error: 'Failed to create waiver' });
  }
});

// ─── Create walk-in waiver link for a venue ───
router.post('/create-walkin', requireAuth, async (req, res) => {
  try {
    const { venueId } = req.body;
    const token = uuidv4();

    const waiver = await req.prisma.waiver.create({
      data: {
        guestName: 'Walk-in Guest',
        token,
        type: 'walkin',
        venueId: venueId ? parseInt(venueId) : null,
      },
    });

    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';

    res.json({
      token: waiver.token,
      link: `${protocol}://${host}/waiver/${waiver.token}`,
    });
  } catch (error) {
    console.error('Error creating walk-in waiver:', error);
    res.status(500).json({ error: 'Failed to create walk-in waiver' });
  }
});

// ─── Get walk-in waiver link for a venue (returns existing unsigned or creates new) ───
router.get('/walkin-link/:venueId', requireAuth, async (req, res) => {
  try {
    const venueId = parseInt(req.params.venueId);
    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';

    // The walk-in link is actually a venue-based URL, not a specific waiver token
    // Each scan creates a new waiver. The link is /waiver/walkin/{venueId}
    const link = `${protocol}://${host}/waiver/walkin/${venueId}`;

    res.json({ venueId, link });
  } catch (error) {
    console.error('Error getting walk-in link:', error);
    res.status(500).json({ error: 'Failed to get walk-in link' });
  }
});

// ─── Initialize walk-in waiver (public — called from WaiverPage when visiting /waiver/walkin/:venueId) ───
router.post('/init-walkin/:venueId', async (req, res) => {
  try {
    const venueId = parseInt(req.params.venueId);
    const venue = await req.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) return res.status(404).json({ error: 'Venue not found' });

    const token = uuidv4();
    const waiver = await req.prisma.waiver.create({
      data: {
        guestName: 'Walk-in Guest',
        token,
        type: 'walkin',
        venueId,
      },
      include: { venue: true },
    });

    res.json({ token: waiver.token, waiver });
  } catch (error) {
    console.error('Error initializing walk-in waiver:', error);
    res.status(500).json({ error: 'Failed to initialize walk-in waiver' });
  }
});

// ─── Sign waiver (public access via token) ───
router.put('/sign/:token', requireAuthOrToken, async (req, res) => {
  try {
    const { guestName, guardianName, signature, data, marketingOptIn } = req.body;

    const originalWaiver = await req.prisma.waiver.findUnique({
      where: { token: req.params.token },
    });

    if (!originalWaiver) {
      return res.status(404).json({ error: 'Waiver not found' });
    }

    // Extract email/phone from form data for top-level storage
    const formData = data || {};
    const email = formData.email || null;
    const phone = formData.phone || null;

    // Log IP address
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;

    // Set expiration to 1 year from now
    const signedAt = new Date();
    const expiresAt = new Date(signedAt);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // ─── Customer Profile: create or update by phone ───
    let customerId = null;
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length >= 7) {
        const names = (guestName || '').split(' ');
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        let customer = await req.prisma.customer.findFirst({
          where: { phone: { contains: normalizedPhone.slice(-10) } },
        });

        if (customer) {
          // Update existing customer with latest info
          customer = await req.prisma.customer.update({
            where: { id: customer.id },
            data: {
              email: email || customer.email,
              address: formData.address || customer.address,
              emergencyContact: formData.emergencyContact || customer.emergencyContact,
              marketingOptIn: marketingOptIn ?? customer.marketingOptIn,
            },
          });
        } else {
          // Create new customer
          customer = await req.prisma.customer.create({
            data: {
              firstName,
              lastName,
              phone: normalizedPhone,
              email: email || null,
              address: formData.address || null,
              dob: formData.dob || null,
              emergencyContact: formData.emergencyContact || null,
              marketingOptIn: marketingOptIn || false,
            },
          });
        }
        customerId = customer.id;

        // Sync children to customer profile
        const minors = formData.minors || [];
        if (minors.length > 0) {
          for (const minor of minors) {
            if (!minor.name) continue;
            const existing = await req.prisma.child.findFirst({
              where: { customerId: customer.id, name: minor.name },
            });
            if (!existing) {
              await req.prisma.child.create({
                data: { customerId: customer.id, name: minor.name, dob: minor.dob || null },
              });
            }
          }
        }
      }
    }

    // If waiver is already signed, create a new waiver entry for this guest
    let waiver;
    const waiverData = {
      guestName,
      guardianName: guardianName || null,
      signature: signature || null,
      data: data ? JSON.stringify(data) : null,
      email,
      phone,
      customerId,
      marketingOptIn: marketingOptIn || false,
      signedAt,
      expiresAt,
      ipAddress,
    };

    if (originalWaiver.signedAt) {
      const newToken = uuidv4();
      waiver = await req.prisma.waiver.create({
        data: {
          ...waiverData,
          bookingId: originalWaiver.bookingId,
          invitationId: originalWaiver.invitationId,
          type: originalWaiver.type,
          venueId: originalWaiver.venueId,
          token: newToken,
        },
      });
    } else {
      waiver = await req.prisma.waiver.update({
        where: { token: req.params.token },
        data: waiverData,
      });
    }

    // Update invitation waiverSigned status (booking waivers only)
    if (waiver.invitationId || originalWaiver.invitationId) {
      await req.prisma.invitation.update({
        where: { id: waiver.invitationId || originalWaiver.invitationId },
        data: { waiverSigned: true },
      });
    }

    // ─── Send confirmation to the signer ───
    try {
      if (email) {
        await sendEmail({
          to: email,
          subject: 'Waiver Confirmation — Tiny Towne',
          body: `Hi ${guestName},\n\nYour waiver has been successfully signed. This waiver is valid for 1 year.\n\nThank you!\nTiny Towne`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#7c3aed">Waiver Confirmed</h2>
            <p>Hi <strong>${guestName}</strong>,</p>
            <p>Your waiver has been successfully signed. This waiver is valid for <strong>1 year</strong> from today.</p>
            <p>Thank you!<br><strong>Tiny Towne</strong></p></div>`,
        });
      }
      if (phone) {
        const { sendSMS } = require('../utils/sms');
        await sendSMS({
          to: phone,
          body: `Waiver confirmed! Hi ${guestName}, your waiver for Tiny Towne has been signed. Valid for 1 year. Thank you!`,
        }).catch(() => {}); // Don't fail if SMS fails (trial mode)
      }
    } catch (notifErr) {
      console.log('Confirmation notification error (non-fatal):', notifErr.message);
    }

    // Automation: Waiver Confirmation — email to host (booking waivers only)
    const bookingId = waiver.bookingId || originalWaiver.bookingId;
    if (bookingId) {
      const waiverBooking = await req.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { venue: true },
      });
      if (waiverBooking) {
        await sendAutomatedEmail({
          trigger: 'WAIVER_CONFIRMATION',
          to: waiverBooking.hostEmail,
          booking: waiverBooking,
          variables: { guestName },
        });
      }
    }

    // Return token for QR code generation on client
    res.json({ ...waiver, verifyToken: waiver.token });
  } catch (error) {
    console.error('Error signing waiver:', error);
    res.status(500).json({ error: 'Failed to sign waiver' });
  }
});

// ─── Verify waiver (public — for front desk QR scan) ───
router.get('/verify/:token', async (req, res) => {
  try {
    const waiver = await req.prisma.waiver.findUnique({
      where: { token: req.params.token },
      include: {
        booking: { include: { venue: true } },
        venue: true,
      },
    });

    if (!waiver) return res.status(404).json({ error: 'Waiver not found' });
    if (!waiver.signedAt) return res.status(400).json({ error: 'Waiver not signed yet' });

    const venueName = waiver.venue?.name || waiver.booking?.venue?.name || 'N/A';

    const expired = waiver.expiresAt ? new Date(waiver.expiresAt) < new Date() : false;

    res.json({
      valid: !expired,
      guestName: waiver.guestName,
      email: waiver.email,
      phone: waiver.phone,
      signedAt: waiver.signedAt,
      expiresAt: waiver.expiresAt,
      expired,
      venueName,
      status: expired ? 'expired' : waiver.status,
      verifiedAt: waiver.verifiedAt,
      type: waiver.type,
    });
  } catch (error) {
    console.error('Error verifying waiver:', error);
    res.status(500).json({ error: 'Failed to verify waiver' });
  }
});

// ─── Mark waiver as verified (staff action) ───
router.put('/verify/:token', requireAuth, async (req, res) => {
  try {
    const waiver = await req.prisma.waiver.update({
      where: { token: req.params.token },
      data: {
        status: 'verified',
        verifiedAt: new Date(),
        verifiedBy: req.session.userId,
      },
    });

    res.json(waiver);
  } catch (error) {
    console.error('Error marking waiver verified:', error);
    res.status(500).json({ error: 'Failed to verify waiver' });
  }
});

// ─── CSV Export ───
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { type, venueId, startDate, endDate, search } = req.query;
    const where = { signedAt: { not: null } };

    if (type && type !== 'all') where.type = type;
    if (venueId) where.venueId = parseInt(venueId);
    if (search) {
      where.OR = [
        { guestName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (startDate || endDate) {
      where.signedAt = { ...where.signedAt };
      if (startDate) where.signedAt.gte = new Date(startDate + 'T00:00:00');
      if (endDate) where.signedAt.lte = new Date(endDate + 'T23:59:59');
    }

    const waivers = await req.prisma.waiver.findMany({
      where,
      include: {
        booking: { include: { venue: true } },
        venue: true,
      },
      orderBy: { signedAt: 'desc' },
    });

    const csvHeader = 'Name,Email,Phone,Type,Venue,Date Signed,Status,Marketing Opt-In\n';
    const csvRows = waivers.map(w => {
      const venueName = w.venue?.name || w.booking?.venue?.name || 'N/A';
      const signedDate = w.signedAt ? new Date(w.signedAt).toLocaleDateString('en-US') : 'N/A';
      const escapeCsv = (val) => `"${(val || '').replace(/"/g, '""')}"`;
      return [
        escapeCsv(w.guestName),
        escapeCsv(w.email),
        escapeCsv(w.phone),
        w.type,
        escapeCsv(venueName),
        signedDate,
        w.status,
        w.marketingOptIn ? 'Yes' : 'No',
      ].join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="waivers_export.csv"');
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error('Error exporting waivers:', error);
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ─── Marketing Send (campaign-style: sends to all opted-in customers, with optional filters) ───
router.post('/marketing/send', requireAuth, async (req, res) => {
  try {
    const { method, subject, body: msgBody, campaignName, type, venueId, startDate, endDate } = req.body;

    if (!msgBody?.trim()) return res.status(400).json({ error: 'Message body is required' });

    // Find all opted-in signed waivers matching optional filters
    const where = { marketingOptIn: true, signedAt: { not: null } };
    if (type && type !== 'all') where.type = type;
    if (venueId) where.venueId = parseInt(venueId);
    if (startDate || endDate) {
      where.signedAt = { ...where.signedAt };
      if (startDate) where.signedAt.gte = new Date(startDate + 'T00:00:00');
      if (endDate) where.signedAt.lte = new Date(endDate + 'T23:59:59');
    }

    const waivers = await req.prisma.waiver.findMany({ where });

    if (waivers.length === 0) {
      return res.status(400).json({ error: 'No opted-in customers found matching filters' });
    }

    // Deduplicate by email or phone to avoid sending duplicates
    const seen = new Set();
    let sentCount = 0;
    for (const w of waivers) {
      const target = method === 'email' ? w.email : w.phone;
      if (!target || seen.has(target)) continue;
      seen.add(target);

      try {
        if (method === 'email') {
          await sendEmail({
            to: target,
            subject: subject || 'Special Offer from Tiny Towne',
            body: msgBody,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${msgBody.replace(/\n/g, '<br>')}</div>`,
          });
        } else {
          const { sendSMS } = require('../utils/sms');
          const smsTo = target.startsWith('+') ? target : `+1${target.replace(/\D/g, '')}`;
          await sendSMS({ to: smsTo, message: msgBody });
        }
        sentCount++;
      } catch (sendErr) {
        console.error(`Failed to send to ${target}:`, sendErr.message);
      }
    }

    // Log campaign
    await req.prisma.marketingCampaign.create({
      data: {
        name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        type: method,
        subject: method === 'email' ? subject : null,
        body: msgBody,
        recipientCount: sentCount,
        sentAt: new Date(),
      },
    });

    res.json({ success: true, sentCount, totalOptedIn: waivers.length });
  } catch (error) {
    console.error('Error sending marketing:', error);
    res.status(500).json({ error: 'Failed to send marketing' });
  }
});

// ─── Resend waiver link to host email ───
router.post('/resend', requireAuth, async (req, res) => {
  try {
    const { bookingId, email } = req.body;

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true, waivers: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let waiver = booking.waivers?.[0];
    if (!waiver) {
      const token = uuidv4();
      waiver = await req.prisma.waiver.create({
        data: { bookingId, guestName: booking.hostName, token },
      });
    }

    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const waiverLink = `${protocol}://${host}/waiver/${waiver.token}`;
    const venueName = booking.venue?.name || 'Tiny Towne';
    const eventName = booking.childName || booking.hostName;

    await sendEmail({
      to: email || booking.hostEmail,
      subject: `Waiver - ${eventName}'s Event`,
      body: `Please sign the waiver for your upcoming event at ${venueName}.\n\nSign here: ${waiverLink}\n\nThank you!`,
      html: `<p>Please sign the waiver for your upcoming event at <strong>${venueName}</strong>.</p><p>Sign here: <a href="${waiverLink}" style="color: #2563eb; font-weight: bold;">${waiverLink}</a></p><p>Thank you!</p>`,
      bookingId: booking.id,
    });

    res.json({ success: true, sentTo: email || booking.hostEmail });
  } catch (error) {
    console.error('Error resending waiver:', error);
    res.status(500).json({ error: 'Failed to resend waiver' });
  }
});

// ─── View signed waiver as PDF (by bookingId) ───
router.get('/pdf/:bookingId', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true, waivers: { orderBy: { createdAt: 'desc' } } },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const signedWaiver = booking.waivers.find(w => w.signedAt);
    if (!signedWaiver) return res.status(404).json({ error: 'No signed waiver found' });

    const pdfPath = await generateWaiverPDF(signedWaiver, booking);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="waiver_${bookingId}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (error) {
    console.error('Error generating waiver PDF:', error);
    res.status(500).json({ error: 'Failed to generate waiver PDF' });
  }
});

// ─── Get guest waiver status for a booking (Event Waivers admin) ───
router.get('/booking/:bookingId/guests', requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        venue: true,
        waivers: { orderBy: { createdAt: 'asc' } },
        invitations: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    const guestMap = new Map();

    for (const inv of booking.invitations) {
      guestMap.set(inv.id, {
        id: inv.id,
        type: 'invitation',
        name: inv.guestName,
        email: inv.guestEmail || null,
        phone: inv.guestPhone || null,
        signed: inv.waiverSigned || false,
        signedAt: null,
        waiverId: null,
      });
    }

    for (const w of booking.waivers) {
      if (w.signedAt) {
        const matchingInv = booking.invitations.find(
          inv => inv.guestName?.toLowerCase() === w.guestName?.toLowerCase() ||
                 inv.guestEmail?.toLowerCase() === (w.email || '')?.toLowerCase()
        );

        if (matchingInv && guestMap.has(matchingInv.id)) {
          const existing = guestMap.get(matchingInv.id);
          existing.signed = true;
          existing.signedAt = w.signedAt;
          existing.waiverId = w.id;
        } else {
          guestMap.set(`waiver-${w.id}`, {
            id: w.id,
            type: 'waiver',
            name: w.guestName,
            email: w.email || null,
            phone: w.phone || null,
            signed: true,
            signedAt: w.signedAt,
            waiverId: w.id,
          });
        }
      }
    }

    const guests = Array.from(guestMap.values());
    const signedCount = guests.filter(g => g.signed).length;

    let waiverToken = booking.waivers.find(w => !w.signedAt)?.token;
    if (!waiverToken) {
      const newToken = uuidv4();
      await req.prisma.waiver.create({
        data: { bookingId, guestName: 'Guest', token: newToken },
      });
      waiverToken = newToken;
    }

    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const waiverLink = `${protocol}://${host}/waiver/${waiverToken}`;

    res.json({ bookingId, totalGuests: booking.guestCount || 0, signedCount, guests, waiverLink });
  } catch (error) {
    console.error('Error fetching guest waivers:', error);
    res.status(500).json({ error: 'Failed to fetch guest waivers' });
  }
});

// ─── View a specific guest's signed waiver as PDF ───
router.get('/guest/:waiverId/pdf', requireAuth, async (req, res) => {
  try {
    const waiverId = parseInt(req.params.waiverId);

    const waiver = await req.prisma.waiver.findUnique({
      where: { id: waiverId },
      include: {
        booking: { include: { venue: true } },
        venue: true,
      },
    });

    if (!waiver) return res.status(404).json({ error: 'Waiver not found' });
    if (!waiver.signedAt) return res.status(404).json({ error: 'Waiver not signed yet' });

    const pdfPath = await generateWaiverPDF(waiver, waiver.booking);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="waiver_guest_${waiverId}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (error) {
    console.error('Error generating guest waiver PDF:', error);
    res.status(500).json({ error: 'Failed to generate waiver PDF' });
  }
});

// ─── Resend waiver to a specific guest ───
router.post('/resend-guest', requireAuth, async (req, res) => {
  try {
    const { bookingId, guestId, method, target } = req.body;

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true, waivers: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let waiverToken = booking.waivers.find(w => !w.signedAt)?.token;
    if (!waiverToken) {
      const newToken = uuidv4();
      await req.prisma.waiver.create({
        data: { bookingId, guestName: 'Guest', token: newToken },
      });
      waiverToken = newToken;
    }

    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const waiverLink = `${protocol}://${host}/waiver/${waiverToken}`;
    const eventName = booking.childName || booking.hostName;
    const venueName = booking.venue?.name || 'Tiny Towne';

    if (method === 'email') {
      await sendEmail({
        to: target,
        subject: `Waiver Required - ${eventName}'s Event at ${venueName}`,
        body: `You are invited to ${eventName}'s event at ${venueName}. Please sign the waiver before arriving.\n\nSign here: ${waiverLink}`,
        html: `<p>You are invited to <strong>${eventName}'s</strong> event at <strong>${venueName}</strong>.</p><p>Please sign the waiver before arriving:</p><p><a href="${waiverLink}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Sign Waiver</a></p>`,
        bookingId: booking.id,
      });
    } else {
      const { sendSMS } = require('../utils/sms');
      await sendSMS({
        to: target,
        body: `You're invited to ${eventName}'s event at ${venueName}. Please sign the waiver: ${waiverLink}`,
      });
    }

    res.json({ success: true, method, sentTo: target });
  } catch (error) {
    console.error('Error resending waiver to guest:', error);
    res.status(500).json({ error: 'Failed to resend waiver' });
  }
});

// ─── Resend waiver to all unsigned guests ───
router.post('/resend-all-unsigned', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await req.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { venue: true, waivers: true, invitations: true },
    });

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    let waiverToken = booking.waivers.find(w => !w.signedAt)?.token;
    if (!waiverToken) {
      const newToken = uuidv4();
      await req.prisma.waiver.create({
        data: { bookingId, guestName: 'Guest', token: newToken },
      });
      waiverToken = newToken;
    }

    const host = req.headers.host || (process.env.APP_URL || 'http://localhost:5174').replace(/^https?:\/\//, '');
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const waiverLink = `${protocol}://${host}/waiver/${waiverToken}`;
    const eventName = booking.childName || booking.hostName;
    const venueName = booking.venue?.name || 'Tiny Towne';

    const unsigned = booking.invitations.filter(inv => !inv.waiverSigned);
    let sentCount = 0;

    for (const inv of unsigned) {
      const target = inv.guestEmail || inv.guestPhone;
      if (!target) continue;

      const isEmail = inv.guestEmail && target === inv.guestEmail;

      if (isEmail) {
        await sendEmail({
          to: target,
          subject: `Waiver Required - ${eventName}'s Event at ${venueName}`,
          body: `Please sign the waiver for ${eventName}'s event at ${venueName}.\n\nSign here: ${waiverLink}`,
          html: `<p>Please sign the waiver for <strong>${eventName}'s</strong> event at <strong>${venueName}</strong>.</p><p><a href="${waiverLink}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:white;text-decoration:none;border-radius:8px;font-weight:600;">Sign Waiver</a></p>`,
          bookingId: booking.id,
        });
      } else {
        const { sendSMS } = require('../utils/sms');
        await sendSMS({
          to: target,
          body: `Please sign the waiver for ${eventName}'s event at ${venueName}: ${waiverLink}`,
        });
      }
      sentCount++;
    }

    res.json({ success: true, sentCount });
  } catch (error) {
    console.error('Error resending waivers to unsigned guests:', error);
    res.status(500).json({ error: 'Failed to resend waivers' });
  }
});

module.exports = router;
