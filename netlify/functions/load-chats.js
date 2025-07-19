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

    // Hacemos las dos peticiones a la vez para más eficiencia.
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

    // Si hay un error que NO sea "no se encontró la fila", es un problema real.
    if (profileResult.error && profileResult.error.code !== 'PGRST116') {
      throw profileResult.error;
    }

    // Si no se encuentra el perfil, el trigger del Paso 1 aún no ha terminado.
    // Devolvemos 100 créditos de forma optimista para que el usuario no vea 0.
    // La base de datos se pondrá al día en segundos.
    const profileData = profileResult.data || { credits: 100, gamification_state: {} };
    const stateData = chatResult.data?.chats || {};

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
