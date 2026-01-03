const bcrypt = require('bcrypt');
const crypto = require('crypto');

const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

/**
 * Generates a strong temporary password.
 * Rules: Min 8 chars, Uppercase, Lowercase, Number, Special char.
 */
function generateTempPassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let password = "";

    // Ensure strict compliance
    password += "A"; // Upper
    password += "a"; // Lower
    password += "1"; // Number
    password += "!"; // Special

    // Fill rest random
    for (let i = 4; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Shuffle
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

module.exports = { hashPassword, verifyPassword, generateTempPassword };
