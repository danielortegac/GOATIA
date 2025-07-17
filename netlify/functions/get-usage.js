// netlify/functions/get-usage.js

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

  // 3) Crea cliente de Supabase con tus variables de entorno
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 4) Lee los créditos actuales (solo lectura)
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)    // ¡OJO user.id, no user.sub!
      .single();

    if (error) {
      console.error('Error get-usage:', error);
      throw error;
    }

    // 5) Devuelve los créditos
    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to read credits.' })
    };
  }
};
