// RUTA: netlify/functions/send-push.js
// REEMPLAZA TODO EL CONTENIDO CON ESTE CÓDIGO

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:info@goatify.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  console.log('[send-push v2] Función iniciada.'); // Marcador de versión

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  try {
    const { userId, title = 'Goatify IA', body = '¡Tienes una nueva notificación!' } = JSON.parse(event.body);

    if (!userId) {
      console.error('[send-push v2] Error: Falta el ID del usuario (userId).');
      return { statusCode: 400, body: 'Falta el ID del usuario (userId).' };
    }

    console.log(`[send-push v2] Buscando suscripción para el usuario: ${userId}`);
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.push_subscription) {
      console.error('[send-push v2] No se encontró la suscripción push para el usuario:', userId, error);
      return { statusCode: 404, body: 'Suscripción no encontrada para este usuario.' };
    }

    const subscription = profile.push_subscription;
    console.log('[send-push v2] Suscripción encontrada. Enviando notificación...');
    
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body })
    );

    console.log('[send-push v2] Notificación enviada con éxito.');
    return { statusCode: 200, body: 'Push enviado correctamente.' };

  } catch (e) {
    console.error('[send-push v2] Error fatal en la función:', e);
    if (e.statusCode === 410) {
        console.warn('[send-push v2] La suscripción ha expirado o no es válida.');
    }
    return { statusCode: 500, body: e.message };
  }
};
