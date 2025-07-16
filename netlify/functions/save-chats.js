// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required.' }) };
  }

  try {
    // Ahora esperamos tanto el estado del chat como el perfil del usuario
    const { stateToSave, profileToSave } = JSON.parse(event.body);

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const promises = [];

    // 1. Guardar el estado del chat (si se proporcionó)
    if (stateToSave) {
      promises.push(
        supabase.from('user_chats').upsert(
          {
            user_id: user.sub,
            chats: stateToSave,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      );
    }

    // 2. Actualizar el perfil del usuario (créditos y gamificación)
    if (profileToSave) {
      promises.push(
        supabase.from('profiles').update(
          {
            credits: profileToSave.credits,
            gamification_state: profileToSave.gamificationState,
            updated_at: new Date().toISOString(),
          }
        ).eq('id', user.sub)
      );
    }

    // Ejecutamos ambas operaciones en paralelo
    const results = await Promise.all(promises);

    // Verificamos si alguna de las operaciones falló
    for (const result of results) {
      if (result.error) {
        throw result.error;
      }
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'Data saved successfully.' }) };
  } catch (err) {
    console.error('Error in save-chats function:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save data.', details: err.message }),
    };
  }
};
