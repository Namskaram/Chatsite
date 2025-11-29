const socket = io();
const username = localStorage.getItem("username");
const gender = localStorage.getItem("gender");

let activePrivateUser = null;

/* ----- SIDEBAR TOGGLE (MOBILE) ----- */
function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("show");
}

/* ----- ONLINE USERS ----- */
socket.emit("userOnline", username);

socket.on("onlineListUpdate", loadOnlineUsers);

async function loadOnlineUsers() {
    const res = await fetch("/online-users");
    const users = await res.json();

    const box = document.getElementById("online-users");
    box.innerHTML = "";

    users.forEach(u => {
        if (u.username === username) return;

        box.innerHTML += `
            <p class="user-item" onclick="openPrivateChat('${u.username}')">
                🟢 ${u.username} (${u.gender})
            </p>
        `;
    });
}

/* -----------------------------
   GLOBAL CHAT
------------------------------*/
function sendMessage() {
    const msg = document.getElementById("msgBox").value;
    if (!msg) return;

    socket.emit("sendMsg", {
        type: "global",
        room: "global",
        user: username,
        gender: gender,
        msg: msg
    });

    document.getElementById("msgBox").value = "";
}

socket.on("receiveMsg", (data) => {
    if (data.type === "private") return;

    const div = document.createElement("div");
    div.className = `message-bubble ${data.user === username ? 'me' : 'other'}`;
    div.innerHTML = `<b>${data.user}:</b><br>${data.msg}`;

    document.getElementById("messages").appendChild(div);
});


/* -----------------------------
   PRIVATE CHAT
------------------------------*/

function openPrivateChat(targetUser) {
    activePrivateUser = targetUser;

    document.getElementById("private-username").innerText = targetUser;
    document.getElementById("private-panel").classList.remove("hidden");
}

function closePrivateChat() {
    document.getElementById("private-panel").classList.add("hidden");
    activePrivateUser = null;
}

function sendPrivate() {
    const msg = document.getElementById("privateMsgBox").value;
    if (!msg || !activePrivateUser) return;

    socket.emit("privateMsg", {
        type: "private",
        from: username,
        to: activePrivateUser,
        msg: msg
    });

    addPrivateBubble(msg, true);
    document.getElementById("privateMsgBox").value = "";
}

socket.on("privateMsgReceive", (data) => {
    if (data.from === activePrivateUser) {
        addPrivateBubble(data.msg, false);
    }
});

function addPrivateBubble(text, isMe) {
    const div = document.createElement("div");

    div.className = isMe ? "private-bubble-me" : "private-bubble-other";
    div.innerText = text;

    document.getElementById("private-messages").appendChild(div);
}



