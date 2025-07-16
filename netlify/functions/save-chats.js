// netlify/functions/save-chats.ts  (o .js)

import { createClient } from '@supabase/supabase-js'

// 1) Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// 2) Cabeceras CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const handler = async (event) => {
  // 3) Pre‑flight de CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders }
  }

  // 4) Solo permitimos POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  }

  // 5) Parsear el cuerpo
  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: 'Body must be JSON' }
  }

  const { user_id, chats } = body
  if (!user_id || !chats) {
    return { statusCode: 400, headers: corsHeaders, body: 'Missing user_id or chats' }
  }

  try {
    // 6) UPSERT (crea o actualiza la fila)
    const { error } = await supabase
      .from('user_chats')
      .upsert({
        user_id,
        chats,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Supabase error →', error)
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify(error) }
    }

    return { statusCode: 200, headers: corsHeaders, body: 'OK' }
  } catch (e) {
    console.error('Runtime error →', e)
    return { statusCode: 500, headers: corsHeaders, body: e.message }
  }
}
