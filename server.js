// server.js
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import cron from 'node-cron'

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

// In-memory storage (test için)
let scores = []  // { wallet, score, date }
let rewards = [] // { wallet, lamports, date }

// Günlük arşiv klasörü
const archiveDir = path.resolve('./archives')
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir)

// 🕛 Her gece 00:00'da çalışacak cron job
cron.schedule('0 0 * * *', () => {
  const today = new Date().toISOString().slice(0, 10)
  const filePath = path.join(archiveDir, `scores_${today}.json`)

  // Günün skorlarını arşivle
  fs.writeFileSync(filePath, JSON.stringify(scores, null, 2))
  console.log(`✅ [${today}] Scores archived (${scores.length} entries)`)

  // Yeni güne başla
  scores = []
})

// 📩 Skor gönderme endpoint
app.post('/score', (req, res) => {
  const { wallet, score } = req.body
  if (!wallet || typeof score !== 'number') {
    return res.status(400).json({ error: 'Wallet or score missing/invalid' })
  }

  const today = new Date().toISOString().slice(0, 10)
  scores.push({ wallet, score, date: today })
  return res.json({ success: true })
})

// 📊 Leaderboard endpoint (günün en yüksek skorları)
app.get('/scores', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const todayScores = scores.filter(s => s.date === today)

  // Cüzdan başına en yüksek skoru bul
  const bestScores = {}
  todayScores.forEach(s => {
    if (!bestScores[s.wallet] || s.score > bestScores[s.wallet].score) {
      bestScores[s.wallet] = { ...s, plays: (bestScores[s.wallet]?.plays || 0) + 1 }
    } else {
      bestScores[s.wallet].plays = (bestScores[s.wallet]?.plays || 0) + 1
    }
  })

  // Skorları sırala
  const sorted = Object.values(bestScores).sort((a, b) => b.score - a.score)
  res.json(sorted.slice(0, 20)) // sadece top 20 gösteriliyor
})

// 💰 Reward endpointleri
app.get('/rewards', (req, res) => res.json(rewards))

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
