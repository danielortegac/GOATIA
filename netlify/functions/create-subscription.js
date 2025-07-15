const fetch = require('node-fetch');

async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const rsp = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: 'grant_type=client_credentials',
  });

  const data = await rsp.json();
  if (!rsp.ok) throw new Error(`PayPal token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

exports.handler = async (event) => {
  if (!event.clientContext || !event.clientContext.user) {
    return { statusCode: 401, body: 'No autorizado' };
  }

  try {
    const { plan } = JSON.parse(event.body);
    const planId =
      plan === 'boost'
        ? process.env.PAYPAL_PLAN_ID_BOOST
        : process.env.PAYPAL_PLAN_ID_PRO;

    const accessToken = await getPayPalAccessToken();

    const rsp = await fetch(
      'https://api.sandbox.paypal.com/v1/billing/subscriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          custom_id: event.clientContext.user.sub,
          application_context: {
            return_url: 'https://www.goatify.app/success.html',
            cancel_url: 'https://www.goatify.app/',
          },
        }),
      }
    );

    const data = await rsp.json();
    console.log('PayPal response →', data);      // LOG DETALLADO

    if (!rsp.ok) throw new Error(JSON.stringify(data));

    const approval = data.links.find((l) => l.rel === 'approve');
    return { statusCode: 200, body: JSON.stringify({ approvalUrl: approval.href }) };
  } catch (err) {
    console.error('create‑subscription ERROR →', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
