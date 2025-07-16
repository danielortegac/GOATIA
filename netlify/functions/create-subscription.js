/*
 * Goatify – create‑subscription.js
 * Funciona en Netlify Functions sin Netlify Identity
 * Usa PayPal Sandbox si PAYPAL_ENV = "sandbox"
 *
 * Env vars necesarias en Netlify → Site settings → Environment:
 *  PAYPAL_ENV            sandbox
 *  PAYPAL_CLIENT_ID      TU_CLIENT_ID_SANDBOX
 *  PAYPAL_CLIENT_SECRET  TU_CLIENT_SECRET_SANDBOX
 *  URL                   https://www.goatify.app     ← dominio
 */

import fetch from 'node-fetch'

const BASE =
  process.env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

// --- obtiene token OAuth 2.0 -------------------------------------
async function getAccessToken () {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })

  const json = await res.json()
  if (!res.ok) {
    console.error('OAuth error:', json)
    throw new Error(json.error_description || 'OAuth failed')
  }
  return json.access_token
}

// --- endpoint -----------------------------------------------------
export const handler = async (event) => {
  try {
    /* ----------------------------------------------------------------
       Esperamos un JSON { plan_id: "P-XXXX", user_email?: "..." }
       Si no llega email, usamos guest@goatify.app
    -----------------------------------------------------------------*/
    const body = JSON.parse(event.body || '{}')
    const plan_id   = body.plan_id
    const user_mail = body.user_email || 'guest@goatify.app'

    if (!plan_id) {
      return { statusCode: 400, body: 'plan_id missing' }
    }

    // 1) token OAuth
    const token = await getAccessToken()

    // 2) crear suscripción
    const subRes = await fetch(`${BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id,
        custom_id: user_mail,            // lo guardarás luego en Supabase
        subscriber: { email_address: user_mail },
        application_context: {
          brand_name : 'Goatify',
          locale     : 'es-EC',
          user_action: 'SUBSCRIBE_NOW',
          return_url : `${process.env.URL}/thanks`,
          cancel_url : `${process.env.URL}/cancel`
        }
      })
    })

    const subJson = await subRes.json()
    if (!subRes.ok) {
      console.error('PayPal error:', subJson)
      return { statusCode: subRes.status, body: JSON.stringify(subJson) }
    }

    // 3) devolver approval URL
    const approval = subJson.links?.find(l => l.rel === 'approve')?.href
    return {
      statusCode: 200,
      body: JSON.stringify({ approval })
    }
  } catch (err) {
    console.error('create-subscription crashed:', err)
    return { statusCode: 500, body: err.message }
  }
}
