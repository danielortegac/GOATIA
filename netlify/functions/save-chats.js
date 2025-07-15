// netlify/functions/save-chats.js
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  try {
    const file = path.join(__dirname, 'chats.json');
    fs.writeFileSync(file, event.body || '[]');
    return { statusCode: 200, body: 'OK' };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
