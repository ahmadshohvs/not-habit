const express = require("express")
const bcrypt  = require("bcryptjs")
const jwt     = require("jsonwebtoken")
const cors    = require("cors")
const path    = require("path")

const User = require("./User")

const app = express()

app.use(cors())
app.use(express.json())

// ── HTML/CSS/JS fayllarni serve qilish ──
// Barcha frontend fayllar server.js bilan bir papkada
app.use(express.static(path.join(__dirname)))

const SECRET = process.env.JWT_SECRET || "supersecretkey"

// ── API routes ──
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body
    const hashed = await bcrypt.hash(password, 10)
    const user = new User({ username, password: hashed })
    await user.save()
    res.json({ message: "User created" })
  } catch (err) {
    res.status(400).json({ message: "User exists" })
  }
})

app.post("/login", async (req, res) => {
  const { username, password } = req.body
  const user = await User.findOne({ username })
  if (!user) return res.status(401).json({ message: "User not found" })
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ message: "Wrong password" })
  const token = jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" })
  res.json({ token })
})

// ── Barcha boshqa so'rovlar index.html ga ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))