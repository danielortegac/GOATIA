const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;

  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required.' })
    };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 🔄 Obtenemos en paralelo los chats y el perfil del usuario
    const [chatResult, profileResult] = await Promise.all([
      supabase
        .from('user_chats')
        .select('chats')
        .eq('user_id', user.sub)
        .single(),

      supabase
        .from('profiles')
        .select('credits, gamification_state')
        .eq('id', user.sub)
        .single()
    ]);

    // ✅ Si el perfil no existe aún (usuario nuevo), lo creamos con 100 créditos iniciales
    if (profileResult.error && profileResult.error.code === 'PGRST116') {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.sub,
          credits: 100, // ✅ SOLUCIÓN: Se otorgan 100 créditos iniciales
          gamification_state: {},
          last_credit_month: currentMonth,
          last_credits_granted_at: now,
          updated_at: now
        });

      if (insertError) throw insertError;

      // Creamos el objeto del perfil para retornarlo inmediatamente al frontend
      profileResult.data = {
        credits: 100, // ✅ Y AQUÍ TAMBIÉN: Se devuelve el valor correcto
        gamification_state: {},
        last_credit_month: currentMonth,
        last_credits_granted_at: now
      };
    } else if (profileResult.error) {
      throw profileResult.error;
    }

    // 🧠 Datos de chats y perfil
    const stateData = chatResult.data?.chats || {};
    const profileData = profileResult.data || null;

    const response = {
      ...stateData,
      profile: profileData
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (err) {
    console.error('Error in load-chats function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to load data.',
        details: err.message
      })
    };
  }
};


