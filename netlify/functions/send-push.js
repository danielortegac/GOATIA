const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:tu‑email@goatify.app',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Only POST' };

  try {
    const { subscription, title = 'Goatify', body = '¡Nuevo mensaje!' } =
      JSON.parse(event.body);

    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body })
    );

    return { statusCode: 200, body: 'Push enviado' };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: e.message };
  }
};
