import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express()
const PORT = process.env.PORT || 5050

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public')) // public/index.html'i sun

// In-memory storage
let scores = [] // { wallet, score, date, plays, lastScores: [] }
let rewards = [] // { wallet, lamports, date }

// Skor gönderme endpoint
app.post('/score', (req, res) => {
  const { wallet, score } = req.body
  if (!wallet || typeof score !== 'number') return res.status(400).json({ error: 'Wallet or score missing/invalid' })

  const today = new Date().toISOString().slice(0, 10)
  const existing = scores.find(s => s.wallet === wallet && s.date === today)

  if (existing) {
    existing.score = Math.max(existing.score, score)
    existing.plays += 1
    existing.lastScores.push(score)
  } else {
    scores.push({ wallet, score, date: today, plays: 1, lastScores: [score] })
  }

  res.json({ success: true })
})

// Leaderboard endpoint (top 20 by highest score)
app.get('/scores', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const todayScores = scores.filter(s => s.date === today)
  const sorted = todayScores.sort((a, b) => b.score - a.score)
  res.json(sorted.slice(0, 20))
})

// Rewards endpoint
app.get('/rewards', (req, res) => res.json(rewards))

// Örnek reward ekleme
app.post('/reward', (req, res) => {
  const { wallet, lamports } = req.body
  if (!wallet || !lamports) return res.status(400).json({ error: 'Missing wallet or lamports' })
  rewards.push({ wallet, lamports, date: new Date().toISOString() })
  res.json({ success: true })
})

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`))
