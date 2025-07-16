// netlify/functions/load-chats.ts  (o .js si prefieres)

import { createClient } from '@supabase/supabase-js'

// 1) Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// 2) Cabeceras CORS comunes
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export const handler = async (event) => {
  // 3) Preflight de CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders }
  }

  // 4) Solo permitimos GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  }

  // 5) user_id en la query
  const userId = event.queryStringParameters?.user_id
  if (!userId) {
    return { statusCode: 400, headers: corsHeaders, body: 'Missing user_id' }
  }

  try {
    // 6) Traer la fila (o null si aún no existe)
    const { data, error } = await supabase
      .from('user_chats')
      .select('chats')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Supabase error →', error)            // ← lo verás en Netlify
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify(error) }
    }

    // 7) Devolver la lista (vacía si no hay registro)
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data?.chats ?? [])
    }
  } catch (e) {
    console.error('Runtime error →', e)
    return { statusCode: 500, headers: corsHeaders, body: e.message }
  }
}
