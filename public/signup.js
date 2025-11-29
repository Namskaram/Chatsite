
async function signup() {
    const username = document.getElementById("user").value;
    const password = document.getElementById("pass").value;
    const gender = document.getElementById("gender").value;

    const res = await fetch("/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, gender })
    });

    const data = await res.json();
    document.getElementById("result").innerText = data.message;

    if (data.success) {
        window.location.href = "login.html";
    }
}
