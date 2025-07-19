// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  let delta;
  try {
    const body = JSON.parse(event.body);
    delta = body.delta; // 'delta' es la cantidad a cambiar (ej: -1 para gastar un crédito)
    if (typeof delta !== 'number') {
      throw new Error('Delta must be a number.');
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request: Invalid delta.' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Obtenemos los créditos actuales para asegurarnos de no quedar en negativo
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Profile not found.' }) };
  }

  const currentCredits = profile.credits;

  // Si se intenta gastar más créditos de los disponibles, se rechaza la operación
  if (currentCredits + delta < 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Insufficient credits.', credits: currentCredits })
    };
  }

  // Actualizamos el contador de créditos en Supabase
  const { data: updatedProfile, error: updateError } = await supabase
    .from('profiles')
    .update({ credits: currentCredits + delta })
    .eq('id', userId)
    .select('credits')
    .single();

  if (updateError) {
    console.error('update-usage error:', updateError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error while updating credits.' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: updatedProfile.credits })
  };
};
