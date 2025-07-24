/* ------------------------------------------------------------------
   Goatify IA – update-usage
   Descuenta (o suma) créditos usando un delta. Nunca pisa valores a lo loco.
------------------------------------------------------------------- */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  try {
    // Autenticación del usuario (token de Netlify Identity)
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { statusCode: 401, body: 'Falta token' };

    const [, jwt] = authHeader.split(' ');
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
    const userId  = payload.sub;

    const body = JSON.parse(event.body || '{}');
    // delta negativo para gastar 1 crédito. Ej: { "delta": -1 }
    // si no viene, por defecto gastamos 1 crédito
    const delta = typeof body.delta === 'number' ? body.delta : (body.used ? -Math.abs(body.used) : -1);

    // Traemos créditos actuales
    const { data: profile, error: selErr } = await supabase
      .from('profiles')
      .select('credits, plan')
      .eq('id', userId)
      .single();

    if (selErr || !profile) {
      console.error('update-usage: no se pudo leer perfil =>', selErr);
      return { statusCode: 500, body: 'No se pudo leer créditos' };
    }

    let newCredits = profile.credits + delta;
    if (newCredits < 0) newCredits = 0;

    // Guardamos créditos actualizados
    const { data: updated, error: updErr } = await supabase
      .from('profiles')
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('credits, plan')
      .single();

    if (updErr) {
      console.error('update-usage: no se pudo actualizar =>', updErr);
      return { statusCode: 500, body: 'Error al actualizar créditos' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ credits: updated.credits, plan: updated.plan })
    };

  } catch (err) {
    console.error('[update-usage] fatal:', err);
    return { statusCode: 500, body: 'error interno' };
  }
};
