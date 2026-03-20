// Twilio SMS integration
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendSMS({ to, message }) {
  try {
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    });

    console.log(`[SMS] Sent to ${to} | SID: ${result.sid} | Status: ${result.status}`);
    return { success: true, sid: result.sid, status: result.status };
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

module.exports = { sendSMS };
