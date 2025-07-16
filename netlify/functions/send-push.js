const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

// Configura los detalles de VAPID (esto está bien como lo tienes)
webpush.setVapidDetails(
  'mailto:info@goatify.app', // Deberías cambiar esto por tu email real
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Only POST allowed' };
  }

  try {
    const { userId, title = 'Goatify IA', body = '¡Tienes una nueva notificación!' } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: 'Falta el ID del usuario (userId)' };
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // 1. Conectar a Supabase para obtener la suscripción del usuario
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 2. Buscar la suscripción guardada en la tabla de perfiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (error || !profile?.push_subscription) {
      console.error('No se encontró la suscripción push para el usuario:', userId, error);
      return { statusCode: 404, body: 'Suscripción no encontrada para este usuario.' };
    }

    const subscription = profile.push_subscription;
    // --- FIN DE LA CORRECCIÓN ---

    // 3. Enviar la notificación usando la suscripción encontrada
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body })
    );

    return { statusCode: 200, body: 'Push enviado correctamente.' };
  } catch (e) {
    console.error('Error en send-push:', e);
    // Si la suscripción ha expirado, el código de error suele ser 410
    if (e.statusCode === 410) {
        console.warn('La suscripción ha expirado o no es válida.');
        // Aquí podrías añadir lógica para eliminar la suscripción caducada de la DB.
    }
    return { statusCode: 500, body: e.message };
  }
};
