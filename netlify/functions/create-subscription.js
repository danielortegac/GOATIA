import fetch from 'node-fetch'

const BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getAccessToken () {
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json.access_token
}

export const handler = async (event, context) => {
  try {
    const { plan_id } = JSON.parse(event.body || '{}')
    const user = context.clientContext?.user
    if (!plan_id || !user) {
      return { statusCode: 400, body: 'Missing data' }
    }

    const token = await getAccessToken()

    const subRes = await fetch(`${BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id,
        custom_id: user.sub,            // lo unes luego con Supabase
        application_context: {
          brand_name: 'Goatify',
          locale: 'es-EC',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.URL}/thanks`,
          cancel_url: `${process.env.URL}/cancel`
        }
      })
    })
    const subJson = await subRes.json()
    if (!subRes.ok) throw new Error(JSON.stringify(subJson))

    const approval = subJson.links.find(l => l.rel === 'approve')?.href
    return { statusCode: 200, body: JSON.stringify({ approval }) }
  } catch (err) {
    console.error(err)
    return { statusCode: 500, body: err.message }
  }
}
