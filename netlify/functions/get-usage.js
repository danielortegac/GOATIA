// netlify/functions/get-usage.js

// 1) Importa createClient de SupaBase
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 2) Obtiene el UUID del usuario desde Netlify Identity
  const userId = context.clientContext.user?.sub;
  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not logged in' })
    };
  }

  // 3) Inicializa el cliente de SupaBase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 4a) Intenta leer los créditos
    let { data, error, status } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    // 4b) Si no existe fila (status 406), créala con 100 créditos
    if (error && status === 406) {
      const { data: newProfile, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          credits: 100,
          state: {},
          gamification_state: {},
          updated_at: new Date().toISOString()
        })
        .single();
      if (insertErr) throw insertErr;

      return {
        statusCode: 200,
        body: JSON.stringify({ credits: newProfile.credits })
      };
    }

    // 4c) Si cualquier otro error, lánzalo
    if (error) throw error;

    // 4d) Devuelve los créditos actuales
    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    console.error('get-usage error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
