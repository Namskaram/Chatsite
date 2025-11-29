const fs = require("fs");
const crypto = require("crypto");

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "base64");

function decryptAES(cipher_b64, iv_b64, tag_b64) {
    const cipher = Buffer.from(cipher_b64, "base64");
    const iv = Buffer.from(iv_b64, "base64");
    const tag = Buffer.from(tag_b64, "base64");

    const dec = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    dec.setAuthTag(tag);

    return Buffer.concat([dec.update(cipher), dec.final()]).toString();
}

function decryptFile(file) {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    console.log("Decrypted →");
    console.log(decryptAES(data.content_base64, data.iv_base64, data.tag_base64));
}

decryptFile(process.argv[2]);
