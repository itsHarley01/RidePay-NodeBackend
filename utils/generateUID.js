const crypto = require('crypto');

function generateUID() {
  return crypto.randomBytes(16).toString('hex'); // 32 characters
}

module.exports = { generateUID };