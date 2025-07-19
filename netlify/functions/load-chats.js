// netlify/functions/load-chats.js
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

    // Obtenemos en paralelo los chats y el perfil del usuario
    const [chatResult, profileResult] = await Promise.all([
      supabase
        .from('user_chats')
        .select('chats')
        .eq('user_id', user.sub)
        .single(),
      supabase
        .from('profiles')
        .select('credits, gamification_state') // Solo seleccionamos lo que necesitamos
        .eq('id', user.sub)
        .single()
    ]);

    // Si hay un error en el perfil (que no sea "no encontrado"), lo lanzamos.
    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      throw profileResult.error;
    }

    const stateData = chatResult.data?.chats || {};
    const profileData = profileResult.data || { credits: 0, gamification_state: {} }; // Si no hay perfil, devolvemos 0 créditos

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
