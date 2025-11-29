
const socket = io();
const username = localStorage.getItem("username");
const gender = localStorage.getItem("gender");

socket.emit("userOnline", username);

socket.on("onlineListUpdate", loadOnlineUsers);

async function loadOnlineUsers() {
    const res = await fetch("/online-users");
    const users = await res.json();

    const box = document.getElementById("online-users");
    box.innerHTML = "";

    users.forEach(u => {
        box.innerHTML += `
            <p style="color:${u.online ? '#00ff9d' : '#ff0044'}">
                ${u.online ? '🟢' : '⚪'} ${u.username} (${u.gender})
            </p>
        `;
    });
}

function sendMessage() {
    const msg = document.getElementById("msgBox").value;
    if (!msg) return;

    socket.emit("sendMsg", {
        room: "global",
        user: username,
        gender: gender,
        msg: msg
    });

    document.getElementById("msgBox").value = "";
}

socket.on("receiveMsg", (data) => {
    const div = document.createElement("div");
    const isMe = data.user === username;

    div.className = `message-bubble ${isMe ? 'me' : 'other'}`;
    div.innerHTML = `<b>${data.user} (${data.gender}):</b><br>${data.msg}`;

    document.getElementById("messages").appendChild(div);
});

