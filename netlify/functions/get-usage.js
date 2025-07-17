// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1) Captura token de la cabecera
  const auth = event.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  // 2) Verifica el user con SupaBase Auth
  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: jwtData, error: jwtErr } = await supabaseAuth.auth.getUser();
  if (jwtErr || !jwtData.user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }
  const userId = jwtData.user.id; // coincide con profiles.id

  // 3) Cliente admin para leer créditos
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('get-usage error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data.credits })
  };
};
