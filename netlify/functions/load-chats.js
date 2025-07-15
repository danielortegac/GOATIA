// netlify/functions/load-chats.js
const fs = require('fs');
const path = require('path');

exports.handler = async () => {
  try {
    const file = path.join(__dirname, 'chats.json');
    const data = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '[]';
    return { statusCode: 200, body: data };
  } catch (e) {
    return { statusCode: 500, body: '[]' };
  }
};
