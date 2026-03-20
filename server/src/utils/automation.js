const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendEmail } = require('./email');

// Check if an automation trigger is enabled, and if so, send the email
// using the automation's stored subject and body template
async function sendAutomatedEmail({ trigger, to, booking, variables = {} }) {
  try {
    const automation = await prisma.emailAutomation.findFirst({
      where: { trigger, enabled: true },
    });

    if (!automation) {
      console.log(`[AUTOMATION] Trigger "${trigger}" is disabled or not found — skipping email`);
      return { sent: false, reason: 'disabled' };
    }

    // Replace template variables in body
    let body = automation.body || '';
    let subject = automation.subject || '';

    const replacements = {
      '{GUEST_NAME}': variables.guestName || '',
      '{HOST_NAME}': booking?.hostName || '',
      '{CHILD_NAME}': booking?.childName || '',
      '{VENUE_NAME}': booking?.venue?.name || 'Tiny Towne',
      '{EVENT_DATE}': booking?.date || '',
      '{BOOKING_ID}': booking?.id?.toString() || '',
      '{TOTAL_COMING}': variables.totalComing?.toString() || '0',
      '{BUSINESS_NAME}': 'Tiny Towne',
      '{BUSINESS_EMAIL}': 'helenfunfactory@gmail.com',
      '{BUSINESS_NUMBER}': '404-944-4499',
    };

    for (const [key, val] of Object.entries(replacements)) {
      body = body.replaceAll(key, val);
      subject = subject.replaceAll(key, val);
    }

    // Build HTML version with footer
    const htmlBody = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 18px; font-weight: bold; font-style: italic; color: #333;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0;" />
        <div style="padding: 24px 16px;">
          ${body.split('\n').map(line => `<p style="font-size: 16px; color: #333;">${line}</p>`).join('')}
        </div>
        <div style="background: #c46a2b; padding: 20px 16px; color: white; margin-top: 24px;">
          <div>
            <div style="font-weight: bold; font-size: 16px;">Tiny Towne</div>
            <a href="mailto:helenfunfactory@gmail.com" style="color: #a8d4ff; font-size: 14px;">helenfunfactory@gmail.com</a>
            <div style="font-size: 14px; margin-top: 4px;">404-944-4499</div>
          </div>
        </div>
      </div>
    `;

    await sendEmail({
      to,
      subject,
      body,
      html: htmlBody,
      bookingId: booking?.id || null,
    });

    console.log(`[AUTOMATION] Sent "${trigger}" email to ${to}`);
    return { sent: true };
  } catch (error) {
    console.error(`[AUTOMATION] Error sending "${trigger}":`, error.message);
    return { sent: false, reason: error.message };
  }
}

// Check if a trigger is enabled (without sending)
async function isAutomationEnabled(trigger) {
  const automation = await prisma.emailAutomation.findFirst({
    where: { trigger, enabled: true },
  });
  return !!automation;
}

module.exports = { sendAutomatedEmail, isAutomationEnabled };
