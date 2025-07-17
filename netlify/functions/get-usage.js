const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const userId = context.clientContext.user?.sub;
  console.log('GET-USAGE: Received request for userId:', userId); // Añadir este log para depuración

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not logged in or userId unavailable' }) // Mensaje más específico
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    let { data, error, status } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error && status === 406) { // 406 Not Acceptable (Supabase custom for no rows)
      console.log(`GET-USAGE: Profile not found for ${userId}. Creating new.`); // Log de creación
      const { data: newProfile, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          credits: 100, // Créditos iniciales al crear el perfil
          state: {},
          gamification_state: {},
          updated_at: new Date().toISOString()
        })
        .select('credits') // Asegúrate de seleccionar los créditos del nuevo perfil
        .single();

      if (insertErr) {
        console.error('GET-USAGE: Error inserting new profile:', insertErr);
        throw insertErr;
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ credits: newProfile.credits })
      };
    }

    if (error) {
      console.error('GET-USAGE: Supabase select error:', error);
      throw error;
    }

    console.log(`GET-USAGE: Found credits for ${userId}: ${data.credits}`); // Log de créditos encontrados
    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    console.error('get-usage unhandled error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'An unknown error occurred' })
    };
  }
};
