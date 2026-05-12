// API URL — localhost emas, nisbiy yo'l
// Railway da avtomatik to'g'ri ishlaydi
const API = ""

async function register() {
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  const res = await fetch(API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()
  alert(data.message)
}

async function login() {
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value

  const res = await fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  })
  const data = await res.json()

  if (data.token) {
    localStorage.setItem("token", data.token)
    window.location = "dashboard.html"
  } else {
    const errEl = document.getElementById("error")
    if (errEl) errEl.innerText = "Login failed"
  }
}