// netlify/functions/save-chats.js
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

    // 1. Guardar (o actualizar) el chat
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

    // 2. Upsert del perfil (asegura que la fila exista y se actualice)
    if (profileToSave && typeof profileToSave.credits === 'number') {
      promises.push(
        supabase
          .from('profiles')
          .upsert(
            {
              id: user.sub,
              credits: profileToSave.credits,
              gamification_state: profileToSave.gamificationState || {},
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          )
      );
    }

    // 3. Ejecuta ambas operaciones
    const results = await Promise.all(promises);

    // 4. Revisa errores
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
