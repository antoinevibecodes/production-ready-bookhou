const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { requireAuth } = require('../middleware/auth');

// Google OAuth config — set these env vars or replace with your credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/api/google-calendar/callback';

const getOAuth2Client = () => {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
};

// Check connection status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const token = await req.prisma.googleCalendarToken.findUnique({
      where: { userId: req.session.userId },
    });
    res.json({ connected: !!token, calendarId: token?.calendarId || null });
  } catch (error) {
    res.json({ connected: false });
  }
});

// Get Google OAuth authorization URL
router.get('/auth-url', requireAuth, (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(400).json({ error: 'Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' });
  }
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state: String(req.session.userId),
  });
  res.json({ url });
});

// OAuth callback — exchanges code for tokens
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    const userId = parseInt(state);
    if (!userId) return res.status(400).send('Invalid state');

    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    await req.prisma.googleCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresAt: new Date(tokens.expiry_date).toISOString(),
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || '',
        expiresAt: new Date(tokens.expiry_date).toISOString(),
      },
    });

    // Redirect back to calendar page
    const appUrl = process.env.APP_URL || 'http://localhost:5174';
    res.redirect(`${appUrl}/calendar`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).send('Failed to connect Google Calendar. ' + error.message);
  }
});

// Sync all events to Google Calendar
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const token = await req.prisma.googleCalendarToken.findUnique({
      where: { userId: req.session.userId },
    });
    if (!token) return res.status(400).json({ error: 'Google Calendar not connected' });

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
    });

    // Refresh token if expired
    oauth2Client.on('tokens', async (newTokens) => {
      await req.prisma.googleCalendarToken.update({
        where: { userId: req.session.userId },
        data: {
          accessToken: newTokens.access_token || token.accessToken,
          expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date).toISOString() : token.expiresAt,
        },
      });
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get bookings
    const bookings = await req.prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      include: { venue: true, package: true },
    });

    // Get blocked times
    const blockedTimes = await req.prisma.blockedTime.findMany();

    let synced = 0;

    // Sync bookings as calendar events
    for (const booking of bookings) {
      const startDateTime = `${booking.date}T${to24h(booking.startTime)}:00`;
      const endDateTime = `${booking.date}T${to24h(booking.endTime)}:00`;
      const timezone = booking.venue?.timezone || 'America/New_York';

      try {
        await calendar.events.insert({
          calendarId: token.calendarId || 'primary',
          requestBody: {
            summary: `${booking.type === 'BIRTHDAY' ? 'Birthday' : 'Field Trip'} — ${booking.hostName}`,
            description: [
              `Host: ${booking.hostName}`,
              booking.childName ? `Child: ${booking.childName}` : '',
              `Guests: ${booking.guestCount}`,
              `Room: ${booking.venue?.name || 'N/A'}`,
              `Package: ${booking.package?.name || 'N/A'}`,
              `Status: ${booking.status}`,
            ].filter(Boolean).join('\n'),
            location: booking.venue?.address || '',
            start: { dateTime: startDateTime, timeZone: timezone },
            end: { dateTime: endDateTime, timeZone: timezone },
            colorId: booking.status === 'CONFIRMED' ? '10' : '3', // green / purple
          },
        });
        synced++;
      } catch (err) {
        console.error(`Failed to sync booking ${booking.id}:`, err.message);
      }
    }

    // Sync blocked times
    for (const bt of blockedTimes) {
      const startDateTime = `${bt.date}T${to24h(bt.startTime)}:00`;
      const endDateTime = `${bt.date}T${to24h(bt.endTime)}:00`;

      try {
        await calendar.events.insert({
          calendarId: token.calendarId || 'primary',
          requestBody: {
            summary: `BLOCKED — ${bt.room}`,
            description: `Room: ${bt.room}\nTime: ${bt.startTime} - ${bt.endTime}${bt.reason ? '\nReason: ' + bt.reason : ''}`,
            start: { dateTime: startDateTime, timeZone: 'America/New_York' },
            end: { dateTime: endDateTime, timeZone: 'America/New_York' },
            colorId: '8', // gray
          },
        });
        synced++;
      } catch (err) {
        console.error(`Failed to sync blocked time ${bt.id}:`, err.message);
      }
    }

    res.json({ success: true, synced });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync. ' + error.message });
  }
});

// Disconnect Google Calendar
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    await req.prisma.googleCalendarToken.deleteMany({
      where: { userId: req.session.userId },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Helper: convert 12h time to 24h
function to24h(timeStr) {
  if (!timeStr) return '00:00';
  if (!timeStr.includes('AM') && !timeStr.includes('PM')) return timeStr;
  const [time, period] = timeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

module.exports = router;
