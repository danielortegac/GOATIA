// netlify/functions/load-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required.' }) };
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Hacemos dos peticiones a la vez para ser más eficientes
    const [chatResult, profileResult] = await Promise.all([
      supabase.from('user_chats').select('chats').eq('user_id', user.sub).single(),
      supabase.from('profiles').select('credits, gamification_state').eq('id', user.sub).single()
    ]);

    // Manejo de errores
    if (chatResult.error && chatResult.error.code !== 'PGRST116') throw chatResult.error;
    if (profileResult.error && profileResult.error.code !== 'PGRST116') throw profileResult.error;

    // El objeto de estado completo { state, currentChatId } está en chatResult.data.chats
    const stateData = chatResult.data?.chats || {};
    // El perfil con los créditos está en profileResult.data
    const profileData = profileResult.data || null;

    // Combinamos todo en una sola respuesta para el cliente
    const response = {
      ...stateData, // Esto expande el objeto a: state: {...}, currentChatId: '...'
      profile: profileData // Y añadimos el perfil: profile: { credits: X, ... }
    };

    return { statusCode: 200, body: JSON.stringify(response) };
  } catch (err) {
    console.error('Error in load-chats function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to load data.', details: err.message }),
    };
  }
};
