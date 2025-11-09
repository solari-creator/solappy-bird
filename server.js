// server.js
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express()
const PORT = process.env.PORT || 5050

// Middleware
app.use(cors())  // CORS sorununu önler
app.use(bodyParser.json())
app.use(express.static('public'))  // public klasöründeki index.html'i sunar

// In-memory score/reward storage (local test için, deployda DB ile değiştir)
let scores = []  // { wallet, score, date }
let rewards = [] // { wallet, lamports, date }

// Skor gönderme endpoint
app.post('/score', (req, res) => {
  const { wallet, score } = req.body
  if (!wallet || typeof score !== 'number') {
    return res.status(400).json({ error: 'Wallet or score missing/invalid' })
  }

  const today = new Date().toISOString().slice(0, 10)
  scores.push({ wallet, score, date: today })
  return res.json({ success: true })
})

// Leaderboard endpoint
app.get('/scores', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  // Bugün oynananlar
  const todayScores = scores.filter(s => s.date === today)
  // En yüksek skor
  const sorted = todayScores.sort((a, b) => b.score - a.score)
  res.json(sorted.slice(0, 10))
})

// Rewards endpoint
app.get('/rewards', (req, res) => {
  res.json(rewards)
})

// Örnek reward ekleme (local test)
app.post('/reward', (req, res) => {
  const { wallet, lamports } = req.body
  if (!wallet || !lamports) return res.status(400).json({ error: 'Missing wallet or lamports' })
  rewards.push({ wallet, lamports, date: new Date().toISOString() })
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
