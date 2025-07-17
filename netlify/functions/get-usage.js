// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1) Obtenemos el user.sub
  const userId = context.clientContext.user?.sub;
  if (!userId) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Not logged in' }) };
  }

  // 2) Creamos el cliente SupaBase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // 3) Intentamos leer la fila
    let { data, error, status } = await supabase
      .from('profiles')
      .select('credits')
      .eq('ident_id', userId)
      .single();

    // 4) Si NO existe aún (status 406 o error.code PGRST116), creamos el perfil
    if (error && status === 406) {
      const { data: newProfile, error: insErr } = await supabase
        .from('profiles')
        .insert({
          ident_id: userId,
          credits: 100,
          state: {}.  // asegúrate de que estas columnas existan
          gamification_state: {},
          updated_at: new Date().toISOString()
        })
        .single();
      if (insErr) throw insErr;
      return { statusCode: 200, body: JSON.stringify({ credits: newProfile.credits }) };
    }
    if (error) throw error;

    // 5) Si todo bien, devolvemos el saldo
    return { statusCode: 200, body: JSON.stringify({ credits: data.credits }) };

  } catch (err) {
    console.error('🛑 get-usage error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
