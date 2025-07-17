// netlify/functions/update-usage.js

// 1) Import necesario
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 2) Autenticación
  const { user } = context.clientContext;
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not logged in' })
    };
  }

  // 3) Analiza el body para obtener delta (puede ser negativo)
  let delta;
  try {
    delta = JSON.parse(event.body).delta;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Bad request: delta missing' })
    };
  }

  // 4) Crea cliente de Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 5) Actualiza el campo credits sumando delta
    const { data, error } = await supabase
      .from('profiles')
      .update({ credits: supabase.raw('credits + ?', [delta]) })
      .eq('id', user.id)   // ¡OJO user.id, no user.sub!
      .single();

    if (error) {
      console.error('Error update-usage:', error);
      throw error;
    }

    // 6) Devuelve el nuevo saldo
    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update credits.' })
    };
  }
};
