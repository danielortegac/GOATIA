/* netlify/functions/create-subscription.js
   Crea la orden de suscripción en PayPal                    */

import fetch from 'node-fetch'

const BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getAccessToken () {
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials',
    auth: {
      username: process.env.PAYPAL_CLIENT_ID,
      password: process.env.PAYPAL_SECRET
    }
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json.access_token
}

export const handler = async (event) => {
  try {
    const { plan_id, user_id } = JSON.parse(event.body || '{}')
    if (!plan_id || !user_id) {
      return { statusCode: 400, body: 'Missing plan_id or user_id' }
    }

    const token = await getAccessToken()

    const order = await fetch(`${BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id,
        custom_id: user_id          //  ⚑  te permite mapear usuario → subs
      })
    }).then(r => r.json())

    if (order.status === 'ACTIVE' || order.status === 'APPROVAL_PENDING') {
      return { statusCode: 200, body: JSON.stringify(order) }
    }

    // cualquier otra cosa es error
    return { statusCode: 502, body: JSON.stringify(order) }
  } catch (err) {
    return { statusCode: 500, body: err.message }
  }
}
