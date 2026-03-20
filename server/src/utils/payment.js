// Stripe payment integration (test mode)
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const VALID_METHODS = ['cash', 'card', 'apple_pay', 'cash_app'];

async function processPayment({ amount, method, cardNumber, cardholderName }) {
  console.log(`[PAYMENT] Processing ${method} payment of $${(amount / 100).toFixed(2)}`);

  if (!VALID_METHODS.includes(method)) {
    return { success: false, error: `Invalid payment method: ${method}` };
  }

  // For cash payments, no Stripe needed
  if (method === 'cash') {
    return {
      success: true,
      transactionId: `cash_${Date.now()}`,
      method,
      amount,
    };
  }

  // For card/apple_pay/cash_app — use real Stripe
  try {
    // Create a PaymentMethod using the test card token
    // In test mode, we use Stripe's test tokens
    const tokenMap = {
      '4242424242424242': 'tok_visa',
      '4000000000000002': 'tok_chargeDeclined',
      '4000000000003220': 'tok_threeDSecure2Required',
      '5555555555554444': 'tok_mastercard',
      '378282246310005': 'tok_amex',
    };

    const token = tokenMap[cardNumber] || 'tok_visa';

    // Create a charge via Stripe
    const charge = await stripe.charges.create({
      amount: amount,  // in cents
      currency: 'usd',
      source: token,
      description: `Booking payment - ${cardholderName || 'Customer'}`,
      metadata: { cardholderName: cardholderName || '' },
    });

    console.log(`[PAYMENT] Stripe charge created: ${charge.id} — $${(charge.amount / 100).toFixed(2)}`);

    const result = {
      success: true,
      transactionId: charge.id,
      stripeChargeId: charge.id,
      method,
      amount: charge.amount,
    };

    if (method === 'card' && charge.payment_method_details?.card) {
      result.cardLast4 = charge.payment_method_details.card.last4;
      result.cardholderName = cardholderName;
    } else if (cardNumber) {
      result.cardLast4 = cardNumber.slice(-4);
      result.cardholderName = cardholderName;
    }

    return result;
  } catch (err) {
    console.error(`[PAYMENT] Stripe error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function processRefund({ originalTransactionId, amount }) {
  console.log(`[REFUND] Processing refund of $${(amount / 100).toFixed(2)} for charge ${originalTransactionId}`);

  // If it's a real Stripe charge ID (starts with 'ch_'), refund via Stripe
  if (originalTransactionId && originalTransactionId.startsWith('ch_')) {
    try {
      const refund = await stripe.refunds.create({
        charge: originalTransactionId,
        amount: amount,  // partial refund in cents
      });

      console.log(`[REFUND] Stripe refund created: ${refund.id} — $${(refund.amount / 100).toFixed(2)}`);

      return {
        success: true,
        refundId: refund.id,
        stripeRefundId: refund.id,
        amount: refund.amount,
      };
    } catch (err) {
      console.error(`[REFUND] Stripe error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // Fallback for non-Stripe transactions (cash, old mock data)
  console.log(`[REFUND] Non-Stripe refund (mock) for txn ${originalTransactionId}`);
  return {
    success: true,
    refundId: `mock_refund_${Date.now()}`,
    amount,
  };
}

module.exports = { processPayment, processRefund, VALID_METHODS };
