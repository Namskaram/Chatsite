
async function login() {
    const username = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    document.getElementById("result").innerText = data.message;

    if (data.success) {
        localStorage.setItem("username", data.username);
        localStorage.setItem("gender", data.gender);
        window.location.href = "chat.html";
    }
}
