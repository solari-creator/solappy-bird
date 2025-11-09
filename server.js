// server.js
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

let scores = [] // { wallet, score, date }
let rewards = [] // { wallet, lamports, date }

// Skor kaydetme
app.post('/score', (req, res) => {
  const { wallet, score } = req.body
  if (!wallet || typeof score !== 'number')
    return res.status(400).json({ error: 'Invalid wallet or score' })

  const today = new Date().toISOString().slice(0, 10)
  scores.push({ wallet, score, date: today })
  res.json({ success: true })
})

// Top 20 leaderboard + istatistikler
app.get('/scores', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const todayScores = scores.filter(s => s.date === today)

  // Wallet bazlı en yüksek skor + son skor geçmişi
  const playerMap = {}
  todayScores.forEach(s => {
    if (!playerMap[s.wallet]) playerMap[s.wallet] = { wallet: s.wallet, score: 0, lastScores: [] }
    playerMap[s.wallet].lastScores.push(s.score)
    playerMap[s.wallet].score = Math.max(playerMap[s.wallet].score, s.score)
  })

  const players = Object.values(playerMap)
  const sorted = players.sort((a, b) => b.score - a.score)

  const totalPlays = todayScores.length
  const totalPlayers = players.length
  const top20 = sorted.slice(0, 20)

  res.json(top20.map(p => ({
    wallet: p.wallet,
    score: p.score,
    lastScores: p.lastScores.slice(-5)
  })))
})

// Rewards endpoint
app.get('/rewards', (req, res) => {
  res.json(rewards)
})

// Test amaçlı ödül ekleme
app.post('/reward', (req, res) => {
  const { wallet, lamports } = req.body
  if (!wallet || !lamports)
    return res.status(400).json({ error: 'Missing wallet or lamports' })
  rewards.push({ wallet, lamports, date: new Date().toISOString() })
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
