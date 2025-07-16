exports.handler = async () => {
  console.log('Push OK');
  return { statusCode: 200, body: 'sent' };
};
