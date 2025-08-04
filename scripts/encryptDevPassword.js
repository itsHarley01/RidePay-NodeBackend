// this file is made to encrypt expocific things, nothing more.
// node scripts/encryptDevPassword.js

require('dotenv').config();
const { encrypt } = require('../utils/encrypt');

const plainPassword = ' ';
const encrypted = encrypt(plainPassword);

console.log('🔐 Encrypted password:', encrypted);
