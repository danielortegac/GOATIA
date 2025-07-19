// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const currentMonth = new Date().toISOString().slice(0, 7); // Formato YYYY-MM

  // 1. Obtenemos el perfil actual del usuario.
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits, last_credit_month')
    .eq('id', userId)
    .single();

  // Si hay un error que no sea "perfil no encontrado", lo devolvemos.
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching profile:', profileError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error fetching profile' }) };
  }

  // 2. Si el perfil no existe, es un usuario nuevo. Lo creamos con 100 créditos.
  if (!profile) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        credits: 100,
        last_credit_month: currentMonth
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to create user profile.' }) };
    }
    profile = newProfile;
  }
  // 3. Si el perfil ya existe, revisamos si necesita sus créditos mensuales.
  else if (profile.last_credit_month !== currentMonth) {
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        credits: 100,
        last_credit_month: currentMonth
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating monthly credits:', updateError);
      // No devolvemos error aquí, simplemente usamos los créditos que ya tenía.
    } else {
      profile = updatedProfile;
    }
  }

  // 4. Devolvemos la cantidad de créditos final y sincronizada.
  return {
    statusCode: 200,
    body: JSON.stringify({ credits: profile.credits })
  };
};
