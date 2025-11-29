const crypto = require('crypto');

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'base64'); // 32 bytes

function encryptText(plainText) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { encrypted, iv, tag };
}

function decryptText(encrypted, iv, tag) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
}

module.exports = { encryptText, decryptText };
