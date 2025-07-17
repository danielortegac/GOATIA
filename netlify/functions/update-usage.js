// netlify/functions/update-usage.js

// 1) Importa createClient de SupaBase
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 2) Obtiene el UUID del usuario
  const userId = context.clientContext.user?.sub;
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not logged in' })
    };
  }

  // 3) Parsea el body para obtener `delta`
  let delta;
  try {
    delta = JSON.parse(event.body).delta;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }
  if (typeof delta !== 'number') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Delta must be a number' })
    };
  }

  // 4) Inicializa el cliente de SupaBase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 5) Actualiza credits sumando delta (negativo para restar)
    const { data, error } = await supabase
      .from('profiles')
      .update({
        credits: supabase.raw('credits + ?', [delta]),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .single();

    if (error) throw error;

    // 6) Devuelve el nuevo saldo
    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    console.error('update-usage error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
