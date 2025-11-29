const express = require("express");
const { Pool } = require("pg");
const http = require("http");
const cron = require("node-cron");
const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
const { encryptText } = require("./cryptoUtils");
const { runExporter } = require("./exporter");

app.use(express.json());
app.use(express.static("public"));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function getIp(req) {
    return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
}

/* SIGNUP (with gender) */
app.post("/signup", async (req, res) => {
    const { username, password, gender } = req.body;

    if (password.length < 8)
        return res.json({ success: false, message: "Password must be 8+ chars" });

    if (!gender)
        return res.json({ success: false, message: "Select a gender" });

    try {
        await pool.query(
            "INSERT INTO users (username, password, gender) VALUES ($1,$2,$3)",
            [username, password, gender]
        );

        res.json({ success: true, message: "Account created!" });

    } catch (err) {
        if (err.code === "23505")
            return res.json({ success: false, message: "Username exists" });

        res.json({ success: false, message: "Server Error" });
    }
});

/* LOGIN + IP BRUTE FORCE */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const ip = getIp(req);

    let ipRow = await pool.query("SELECT * FROM ip_security WHERE ip=$1", [ip]);
    if (ipRow.rows.length === 0) {
        await pool.query("INSERT INTO ip_security (ip) VALUES ($1)", [ip]);
        ipRow = await pool.query("SELECT * FROM ip_security WHERE ip=$1", [ip]);
    }

    const sec = ipRow.rows[0];

    if (sec.blocked_until && new Date(sec.blocked_until) > new Date()) {
        return res.json({
            success: false,
            message: `IP blocked until ${sec.blocked_until}`
        });
    }

    if (password.length < 8)
        return res.json({ success: false, message: "Password must be 8+ chars" });

    const user = await pool.query("SELECT * FROM users WHERE username=$1", [username]);

    if (user.rows.length === 0 || user.rows[0].password !== password) {
        let attempts = sec.attempts + 1;
        let blockCount = sec.block_count;
        let blocked = null;

        if (attempts >= 3) {
            attempts = 0;
            blockCount++;
            blocked = blockCount >= 3
                ? new Date(Date.now() + 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 3 * 60 * 1000);
        }

        await pool.query(
            "UPDATE ip_security SET attempts=$1, block_count=$2, blocked_until=$3 WHERE ip=$4",
            [attempts, blockCount, blocked, ip]
        );

        return res.json({ success: false, message: "Invalid login" });
    }

    await pool.query(
        "UPDATE ip_security SET attempts=0, block_count=0, blocked_until=NULL WHERE ip=$1",
        [ip]
    );

    res.json({
        success: true,
        username,
        gender: user.rows[0].gender
    });
});

/* ONLINE USERS */
app.get("/online-users", async (req, res) => {
    const users = await pool.query("SELECT username, gender, online, last_seen FROM users");
    res.json(users.rows);
});

/* SOCKET.IO — ENCRYPT MESSAGE */
io.on("connection", (socket) => {

    socket.on("userOnline", async (username) => {
        await pool.query("UPDATE users SET online=true WHERE username=$1", [username]);
        io.emit("onlineListUpdate");
    });

    socket.on("sendMsg", async (data) => {
        io.emit("receiveMsg", data);

        const encrypted = encryptText(JSON.stringify(data));

        await pool.query(
            "INSERT INTO messages (sender, room, content, iv, tag) VALUES ($1,$2,$3,$4,$5)",
            [data.user, data.room || "global", encrypted.encrypted, encrypted.iv, encrypted.tag]
        );
    });

    socket.on("private", async (data) => {
        io.emit("privateMsgReceive", data);

        const encrypted = encryptText(JSON.stringify(data));

        await pool.query(
            "INSERT INTO messages (sender, recipient,type,content, iv,tag) VALUES ($1,$2,'private',$3,$4,$5)",
            [data.from, data.to, encrypted.encrypted, encrypted.iv, encrypted.tag]
        );
    });
});


/* Export endpoint */
app.post("/export-now", async (req, res) => {
    await runExporter(pool);
    res.json({ ok: true });
});

/* Daily 12PM export */
cron.schedule("0 0 12 * * *", () => runExporter(pool), {
    timezone: "Asia/Kolkata"
});

server.listen(3000, () => console.log("Server running..."));
