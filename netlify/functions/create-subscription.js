/*
 * Goatify – create-subscription.js  (solo Sandbox)
 */

const fetch = require('node-fetch')

const BASE_URL =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

// --- OAuth ----------------------------------------------------------
async function getAccessToken () {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method : 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization : `Basic ${auth}`
    },
    body: 'grant_type=client_credentials'
  })

  const json = await res.json()
  if (!res.ok) {
    console.error('OAuth error:', json)
    throw new Error('PayPal invalid_client – revisa ID y Secret')
  }
  return json.access_token
}

// --- Lambda ---------------------------------------------------------
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' }
  }

  // 1) Plan solicitado
  const { plan = 'boost', user_email = 'guest@goatify.app' } =
    JSON.parse(event.body || '{}')

  const PLAN_MAP = {
    boost: process.env.PAYPAL_BOOST_PLAN_ID,
    pro  : process.env.PAYPAL_PRO_PLAN_ID
  }
  const plan_id = PLAN_MAP[plan]

  if (!plan_id) {
    console.error(`Plan id not configured for "${plan}"`)
    return { statusCode: 400, body: 'Plan id not configured on server' }
  }

  try {
    // 2) Token
    const token = await getAccessToken()

    // 3) Crear suscripción
    const res = await fetch(`${BASE_URL}/v1/billing/subscriptions`, {
      method : 'POST',
      headers: {
        Authorization   : `Bearer ${token}`,
        'Content-Type'  : 'application/json',
        'PayPal-Request-Id': `sub-${Date.now()}`
      },
      body: JSON.stringify({
        plan_id,
        custom_id: user_email,
        subscriber: { email_address: user_email },
        application_context: {
          brand_name : 'Goatify IA',
          user_action: 'SUBSCRIBE_NOW',
          return_url : 'https://www.goatify.app?ok',
          cancel_url : 'https://www.goatify.app?cancel'
        }
      })
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('PayPal subscription error:', data)
      return { statusCode: res.status, body: JSON.stringify(data) }
    }

    const approvalUrl = data.links.find(l => l.rel === 'approve')?.href
    return { statusCode: 200, body: JSON.stringify({ approvalUrl }) }
  } catch (err) {
    console.error('Fatal error:', err)
    return { statusCode: 500, body: err.message }
  }
}
