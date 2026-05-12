const mongoose = require("mongoose")

// MONGO_URI — Railway environment variable dan oladi
// Agar yo'q bo'lsa, localhost ishlatadi (local test uchun)
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/habitapp"

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err))

module.exports = mongoose