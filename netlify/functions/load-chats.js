// /netlify/functions/load-chats.js
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

    // Su única responsabilidad ahora es cargar los chats.
    const { data, error } = await supabase
      .from('user_chats')
      .select('chats')
      .eq('user_id', user.sub)
      .single();

    if (error && error.code !== 'PGRST116') { // Ignora el error si no se encuentra la fila
        throw error;
    }

    const stateData = data?.chats || {};

    return {
      statusCode: 200,
      body: JSON.stringify(stateData)
    };

  } catch (err) {
    console.error('Error in load-chats function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to load chat data.',
        details: err.message
      })
    };
  }
};
