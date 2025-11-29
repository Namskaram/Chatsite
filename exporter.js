const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const Archiver = require("archiver");
const { decryptText } = require("./cryptoUtils");

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

async function runExporter(pool) {
    console.log("Running exporter...");

    const res = await pool.query(
        "SELECT * FROM messages WHERE exported=false ORDER BY created_at ASC"
    );

    if (res.rows.length === 0) {
        console.log("No new messages.");
        return;
    }

    const tmp = path.join(__dirname, "temp");
    if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);

    const fileList = [];

    for (const r of res.rows) {
        const decrypted = decryptText(r.content, r.iv, r.tag);
        const fname = `msg_${r.id}.json`;
        const fpath = path.join(tmp, fname);

        fs.writeFileSync(fpath, decrypted, "utf8");
        fileList.push({ id: r.id, p: fpath });
    }

    const zipName = "messages.zip";
    const zipPath = path.join(tmp, zipName);

    await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(zipPath);
        const arch = Archiver("zip");
        out.on("close", resolve);
        arch.on("error", reject);
        arch.pipe(out);

        fileList.forEach(f => arch.file(f.p, { name: path.basename(f.p) }));

        arch.finalize();
    });

    const form = new FormData();
    form.append("chat_id", CHAT);
    form.append("document", fs.createReadStream(zipPath));

    await axios.post(
        `https://api.telegram.org/bot${TOKEN}/sendDocument`,
        form,
        { headers: form.getHeaders() }
    );

    await pool.query("UPDATE messages SET exported=true WHERE exported=false");
    await pool.query("DELETE FROM messages WHERE created_at < NOW() - INTERVAL '2 days'");

    fs.rmSync(tmp, { recursive: true, force: true });
}

module.exports = { runExporter };
