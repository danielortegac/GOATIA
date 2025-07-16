// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Auth required' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Mes actual tipo 2025‑07
  const monthKey = new Date().toISOString().slice(0, 7);

  // Traemos créditos y, si es la 1ª vez, insertamos 100 FREE
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', user.sub)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  // Si no existe fila, creamos con 100 créditos gratis
  if (!data) {
    await supabase.from('profiles').insert({
      id: user.sub,
      credits: 100
    });
    return { statusCode: 200, body: JSON.stringify({ credits: 100, month: monthKey }) };
  }

  return { statusCode: 200, body: JSON.stringify({ credits: data.credits, month: monthKey }) };
};
