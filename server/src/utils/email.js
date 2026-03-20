const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendSMS } = require('./sms');
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

sgMail.setApiKey(SENDGRID_API_KEY);

// Real email via SendGrid + log to DB
async function sendEmail({ to, subject, body, html, bookingId = null }) {
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);

  // Send real email via SendGrid
  try {
    const msg = { to, from: SENDER_EMAIL, subject, text: body };
    if (html) msg.html = html;
    await sgMail.send(msg);
    console.log(`[EMAIL] Sent successfully via SendGrid to ${to}`);
  } catch (err) {
    console.error(`[EMAIL] SendGrid error: ${err.message}`);
  }

  // Store in DB
  await prisma.emailLog.create({
    data: {
      to,
      subject,
      body,
      bookingId,
    },
  });

  return { success: true, provider: 'sendgrid' };
}

// Fixed: Uses correct base URL
async function sendBookingConfirmation(booking) {
  const baseUrl = process.env.APP_URL || 'http://localhost:5174';
  const link = `${baseUrl}/bookings/${booking.id}`;

  await sendEmail({
    to: booking.hostEmail,
    subject: `Booking Confirmation - ${booking.childName || booking.hostName}'s Event`,
    body: `Your booking has been confirmed!\n\nDate: ${booking.date}\nVenue: ${booking.venue?.name || 'TBD'}\n\nView your booking: ${link}`,
    html: `<p>Your booking has been confirmed!</p><p>Date: ${booking.date}<br>Venue: ${booking.venue?.name || 'TBD'}</p><p>View your booking: <a href="${link}" style="color: #2563eb; font-weight: bold;">${link}</a></p>`,
    bookingId: booking.id,
  });
}

// Fixed: Called when balance reaches zero
async function sendBalanceSettledEmail(booking) {
  await sendEmail({
    to: booking.hostEmail,
    subject: `Balance Settled - ${booking.childName || booking.hostName}'s Event`,
    body: `Your balance has been fully settled. Thank you for your payment!\n\nBooking #${booking.id}`,
    bookingId: booking.id,
  });
}

// Fixed: Sends via SMS with personalized message
async function sendInvitation(invitation, booking) {
  const appUrl = process.env.APP_URL || 'http://localhost:5174';
  const personalizedMessage = `${booking.hostName} has invited you to ${booking.childName}'s birthday party at ${booking.venue?.name || 'our venue'} on ${booking.date}! RSVP here: ${appUrl}/rsvp/${invitation.token}`;

  // Send via SMS
  if (invitation.guestPhone) {
    await sendSMS({
      to: invitation.guestPhone,
      message: personalizedMessage,
    });
  }

  // Also log as email for record keeping
  await sendEmail({
    to: invitation.guestEmail || invitation.guestPhone || 'no-contact@placeholder.com',
    subject: `Party Invitation from ${booking.hostName}`,
    body: personalizedMessage,
    bookingId: booking.id,
  });
}

async function sendInvoiceEmail({ to, booking, pdfPath }) {
  console.log(`[EMAIL] Sending invoice to ${to} for booking #${booking.id}`);

  const pdfContent = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfContent.toString('base64');
  const filename = path.basename(pdfPath);

  // Logo as inline attachment
  const logoPath = path.join(__dirname, 'tiny-towne-logo.png');
  const logoBase64 = fs.existsSync(logoPath) ? fs.readFileSync(logoPath).toString('base64') : null;

  const venueName = booking.venue?.name || 'Tiny Towne';
  const venueAddress = booking.venue?.address || '2055 Beaver Ruin Road, Norcross, GA 30071, USA';
  const hostName = booking.hostName || 'Valued Customer';
  const childName = booking.childName || '';
  const eventDate = booking.date || '';
  const startTime = booking.startTime || '';
  const endTime = booking.endTime || '';
  const todayDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const htmlBody = `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
      <div style="text-align: center; padding: 20px 0;">
        ${logoBase64 ? '<img src="cid:tinytownelogo" alt="Tiny Towne" style="max-width: 160px; margin-bottom: 8px;" />' : ''}
        <div style="font-size: 18px; font-weight: bold; font-style: italic; color: #333;">${todayDate}</div>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0;" />
      <div style="padding: 24px 16px;">
        <p style="font-size: 16px; color: #333;">Hi ${hostName},</p>
        <p style="font-size: 16px; color: #333;">Attached is a copy of your receipt for ${childName ? childName + "'s event" : 'your event'} at:</p>
        <p style="font-size: 16px; color: #333; margin-top: 16px;">
          <strong>${venueName}</strong><br />
          ${venueAddress}<br />
          Date and time: ${eventDate}${startTime ? ', ' + startTime : ''}${endTime ? '-' + endTime : ''}
        </p>
        <p style="font-size: 16px; color: #333; margin-top: 24px;">
          Best Regards,<br />
          Tiny Towne
        </p>
      </div>
      <div style="background: #c46a2b; padding: 20px 16px; color: white; margin-top: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: bold; font-size: 16px;">Tiny Towne</div>
            <a href="mailto:helenfunfactory@gmail.com" style="color: #a8d4ff; font-size: 14px;">helenfunfactory@gmail.com</a>
            <div style="font-size: 14px; margin-top: 4px;">404-944-4499</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const attachments = [
    {
      content: pdfBase64,
      filename,
      type: 'application/pdf',
      disposition: 'attachment',
    },
  ];

  if (logoBase64) {
    attachments.push({
      content: logoBase64,
      filename: 'tiny-towne-logo.png',
      type: 'image/png',
      disposition: 'inline',
      content_id: 'tinytownelogo',
    });
  }

  try {
    await sgMail.send({
      to,
      from: SENDER_EMAIL,
      subject: `Invoice - ${booking.childName || booking.hostName}'s Event (Booking #${booking.id})`,
      text: `Hi ${hostName},\n\nAttached is a copy of your receipt for ${childName ? childName + "'s event" : 'your event'} at:\n\n${venueName}\n${venueAddress}\nDate and time: ${eventDate}${startTime ? ', ' + startTime : ''}${endTime ? '-' + endTime : ''}\n\nBest Regards,\nTiny Towne`,
      html: htmlBody,
      attachments,
    });
    console.log(`[EMAIL] Invoice sent successfully to ${to}`);
  } catch (err) {
    console.error(`[EMAIL] SendGrid error sending invoice: ${err.message}`);
  }

  await prisma.emailLog.create({
    data: {
      to,
      subject: `Invoice - Booking #${booking.id}`,
      body: `Invoice PDF sent as attachment (${filename})`,
      bookingId: booking.id,
    },
  });

  return { success: true };
}

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendBalanceSettledEmail,
  sendInvitation,
  sendInvoiceEmail,
};
