const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const userId = context.clientContext.user?.sub;
  console.log('UPDATE-USAGE: Received request for userId:', userId); // Añadir este log para depuración

  if (!userId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Not logged in or userId unavailable' }) // Mensaje más específico
    };
  }

  let delta;
  try {
    delta = JSON.parse(event.body).delta;
  } catch (e) { // Capturar el error de parseo
    console.error('UPDATE-USAGE: JSON parse error:', e);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }
  if (typeof delta !== 'number') {
    console.warn('UPDATE-USAGE: Delta is not a number:', delta);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Delta must be a number' })
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // Asegúrate de que el perfil exista antes de intentar actualizar
    // Esto es especialmente importante si get-usage aún no ha creado el perfil
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code === 'PGRST116') { // No rows found (Supabase specific code)
        console.warn(`UPDATE-USAGE: Profile for ${userId} not found before update. Attempting to create first.`);
        const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .insert({
                id: userId,
                credits: 100, // Default credits
                state: {},
                gamification_state: {},
                updated_at: new Date().toISOString()
            })
            .select('credits')
            .single();

        if (insertErr) {
            console.error('UPDATE-USAGE: Error creating profile before update:', insertErr);
            throw insertErr;
        }
        // Proceed with update on this newly created profile
    } else if (checkError) {
        console.error('UPDATE-USAGE: Error checking profile existence:', checkError);
        throw checkError;
    }


    const { data, error } = await supabase
      .from('profiles')
      .update({
        credits: supabase.raw('credits + ?', [delta]),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('credits') // Asegúrate de seleccionar los créditos actualizados
      .single();

    if (error) {
      console.error('UPDATE-USAGE: Supabase update error:', error);
      throw error;
    }

    console.log(`UPDATE-USAGE: Credits for ${userId} updated to: ${data.credits}`); // Log de actualización
    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    console.error('update-usage unhandled error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'An unknown error occurred' })
    };
  }
};
