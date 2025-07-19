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

    // ✅ Si el perfil no existe aún (usuario nuevo), NO lo creamos aquí. Solo devolvemos null en profile.
    if (profileResult.error && profileResult.error.code === 'PGRST116') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ...(chatResult.data?.chats || {}),
          profile: null
        })
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
