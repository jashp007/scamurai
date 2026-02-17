const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, "../../../.env")
});
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

let lastSeenChargeId = null;

const findAndProcessNewCharge = (startTime, ip, geoInfo) => {
  const interval = setInterval(async () => {
    try {
      const charges = await stripe.charges.list({ limit: 5 });
      const charge = charges.data.find(c =>
        c.created > startTime &&
        c.status === 'succeeded' &&
        !c.refunded &&
        c.amount_refunded === 0
      );

      if (!charge || charge.id === lastSeenChargeId) return;
      lastSeenChargeId = charge.id;

      const intent = await stripe.paymentIntents.retrieve(charge.payment_intent, {
        expand: ['customer', 'payment_method']
      });

      const output = {
        payment_intent_id: charge.payment_intent,
        charge_id: charge.id,
        amount: `$${(charge.amount / 100).toFixed(2)}`,
        timestamp: new Date(charge.created * 1000).toISOString(),
        user_ip: ip,

        // Geolocation
        geo_country: geoInfo.country || 'N/A',
        geo_city: geoInfo.city || 'N/A',
        geo_region: geoInfo.regionName || 'N/A',
        geo_zip: geoInfo.zip || 'N/A',

        // Charge details (flattened)
        charge_status: charge.status,
        charge_brand: charge.payment_method_details?.card?.brand || 'N/A',
        charge_last4: charge.payment_method_details?.card?.last4 || 'N/A',
        charge_country: charge.payment_method_details?.card?.country || 'N/A',
        risk_score: charge.outcome?.risk_score ?? 'N/A',
        risk_level: charge.outcome?.risk_level ?? 'N/A',
        seller_message: charge.outcome?.seller_message ?? 'N/A',

        // Billing details (flattened)
        billing_email: charge.billing_details?.email || intent.customer?.email || 'N/A',
        billing_name: charge.billing_details?.name || intent.customer?.name || 'N/A',
        billing_city: charge.billing_details?.address?.city || 'N/A',
        billing_country: charge.billing_details?.address?.country || 'N/A',
        billing_line1: charge.billing_details?.address?.line1 || 'N/A',
        billing_line2: charge.billing_details?.address?.line2 || '',
        billing_postal_code: charge.billing_details?.address?.postal_code || 'N/A',
        billing_state: charge.billing_details?.address?.state || 'N/A'
      };

      console.log('\n🧾 Flattened Stripe Payment Data:');
      console.dir(output, { depth: null });

      fs.writeFileSync('dashboard-view.json', JSON.stringify(output, null, 2));

      // Replace with real fraud detection logic later
      const is_fraud = false;

      if (is_fraud) {
        try {
          const refund = await stripe.refunds.create({ charge: charge.id });
          console.log(`💸 Refunded successfully (Refund ID: ${refund.id})`);
        } catch (err) {
          console.error('❌ Refund failed:', err.message);
        }
      }

      clearInterval(interval);
    } catch (err) {
      console.error('❌ Stripe polling error:', err.message);
    }
  }, 5000);
};

module.exports = { findAndProcessNewCharge };
