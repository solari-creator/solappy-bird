import express from "express"
import cors from "cors"

const app = express()
const PORT = process.env.PORT || 10000

// Middleware
app.use(cors())
app.use(express.json()) // JSON body parse için gerekli

// Scores saklamak için basit bir array (Render’da kalıcı değil, sadece 
örnek)
let scores = []

// Skor ekleme endpoint
app.post("/score", (req, res) => {
  const { signature, score } = req.body
  console.log("Received body:", req.body) // debug için

  if (!signature || !score) {
    return res.status(400).json({ error: "Missing signature or score" })
  }

  scores.push({ signature, score, date: new Date().toISOString() })
  scores.sort((a, b) => b.score - a.score) // büyükten küçüğe
  if (scores.length > 10) scores = scores.slice(0, 10) // sadece top 10

  return res.json({ message: "Score added", topScores: scores })
})

// Top 10 skorları alma endpoint
app.get("/top", (req, res) => {
  return res.json({ topScores: scores })
})

// Statik dosyaları sun (index.html, main.js vs.)
app.use(express.static("public"))

app.listen(PORT, () => console.log(`Server running at 
http://localhost:${PORT}`))
