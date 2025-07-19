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
    const { stateToSave, profileToSave } = JSON.parse(event.body);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const promises = [];

    // Guardar chats
    if (stateToSave) {
      promises.push(
        supabase
          .from('user_chats')
          .upsert(
            {
              user_id: user.sub,
              chats: stateToSave,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          )
      );
    }

    // Guardar gamification_state (no credits, ya que se manejan en update-usage.js)
    if (profileToSave && profileToSave.gamificationState) {
      promises.push(
        supabase
          .from('profiles')
          .upsert(
            {
              id: user.sub,
              gamification_state: profileToSave.gamificationState,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          )
      );
    }

    const results = await Promise.all(promises);

    for (const res of results) {
      if (res.error) throw res.error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data saved successfully.' })
    };
  } catch (err) {
    console.error('Error in save-chats function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save data.', details: err.message })
    };
  }
};
