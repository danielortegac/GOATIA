/* ------------------------------------------------------------------
   Goatify IA – get-usage
------------------------------------------------------------------- */
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader) return { statusCode: 401, body: 'Falta token' };

    const [, jwt] = authHeader.split(' ');
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
    const userId  = payload.sub;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('credits, plan')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      console.error('get-usage: error:', error);
      return { statusCode: 500, body: 'No se pudo obtener créditos' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ credits: profile.credits, plan: profile.plan })
    };

  } catch (err) {
    console.error('[get-usage] fatal:', err);
    return { statusCode: 500, body: 'error interno' };
  }
};
