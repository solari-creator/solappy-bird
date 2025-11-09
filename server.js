// server.js
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import cron from 'node-cron'
import dotenv from 'dotenv'
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'

dotenv.config() // .env yükle

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

// 🔗 Solana bağlantısı
const connection = new Connection('https://api.mainnet-beta.solana.com')

// 🪙 Pot wallet adresi ve keypair env’den al
const POT_WALLET = new PublicKey(process.env.POT_WALLET_ADDRESS || 'CJdNqhZBpzQibJxdQYi3gxDUpzUejqxWZfPU8PnQrQh7')
const POT_KEYPAIR_ARRAY = process.env.POT_KEY?.split(',').map(Number)
const POT_KEYPAIR = Keypair.fromSecretKey(Uint8Array.from(POT_KEYPAIR_ARRAY))

// In-memory storage
let scores = []  // { wallet, score, date }
let rewards = [] // { wallet, lamports, tx, date }

// Günlük arşiv klasörü
const archiveDir = path.resolve('./archives')
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir)

// 🕛 Her gece 00:00'da skorları arşivle
cron.schedule('0 0 * * *', () => {
  const today = new Date().toISOString().slice(0, 10)
  const filePath = path.join(archiveDir, `scores_${today}.json`)
  fs.writeFileSync(filePath, JSON.stringify(scores, null, 2))
  console.log(`✅ [${today}] Scores archived (${scores.length} entries)`)
  scores = []
})

// admin token doğrulama middleware
function verifyAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden: Invalid admin token' })
  }
  next()
}

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

// 📊 Leaderboard endpoint
app.get('/scores', (req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const todayScores = scores.filter(s => s.date === today)
  const bestScores = {}
  todayScores.forEach(s => {
    if (!bestScores[s.wallet] || s.score > bestScores[s.wallet].score) {
      bestScores[s.wallet] = { ...s, plays: (bestScores[s.wallet]?.plays || 0) + 1 }
    } else {
      bestScores[s.wallet].plays = (bestScores[s.wallet]?.plays || 0) + 1
    }
  })
  const sorted = Object.values(bestScores).sort((a, b) => b.score - a.score)
  res.json(sorted.slice(0, 20))
})

// 💰 Pot wallet bakiyesi otomatik güncelleme
let potBalance = { pot_wallet: POT_WALLET.toBase58(), balance: '0.000', reward: '0.0' }

async function updatePotBalance() {
  try {
    const balanceLamports = await connection.getBalance(POT_WALLET)
    const balanceSol = balanceLamports / LAMPORTS_PER_SOL
    const rewardAmount = Math.floor(balanceSol * 10) / 10 // en yakın 0.1
    potBalance = {
      pot_wallet: POT_WALLET.toBase58(),
      balance: balanceSol.toFixed(3),
      reward: rewardAmount.toFixed(1)
    }
    console.log(`🔄 Pot wallet updated: ${potBalance.balance} SOL, reward: ${potBalance.reward} SOL`)
  } catch (err) {
    console.error('❌ Pot wallet fetch error:', err)
  }
}

// İlk başta güncelle ve sonra her saat başı tekrar et
updatePotBalance()
setInterval(updatePotBalance, 60 * 60 * 1000) // 1 saat

// 📡 Endpoint artık saklanan güncel değeri döndürüyor
app.get('/pot-balance', (req, res) => {
  res.json(potBalance)
})

// 🏆 Reward kayıtları
// GET artık admin token istemiyor, frontend Total Rewards kutusu için
app.get('/rewards', (req, res) => res.json(rewards))

// POST hâlâ admin token ile korunuyor
app.post('/reward', verifyAdmin, (req, res) => {
  const { wallet, lamports, tx } = req.body
  if (!wallet || !lamports) return res.status(400).json({ error: 'Missing wallet or lamports' })
  rewards.push({ wallet, lamports, tx: tx || null, date: new Date().toISOString() })
  res.json({ success: true })
})

// 🔥 Her gün 23:59’da günün birincisine otomatik 0.1 SOL ödül gönderimi
cron.schedule('59 23 * * *', async () => {
  const today = new Date().toISOString().slice(0, 10)
  if (scores.length === 0) return console.log('⚠️ No scores today, skipping reward')

  // Günün birincisini bul
  let bestScoreObj = scores.reduce((prev, curr) => (curr.score > prev.score ? curr : prev))
  const winnerWallet = new PublicKey(bestScoreObj.wallet)

  // 0.1 SOL gönder
  const lamports = 0.1 * LAMPORTS_PER_SOL
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: POT_KEYPAIR.publicKey,
      toPubkey: winnerWallet,
      lamports
    })
  )

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [POT_KEYPAIR])
    console.log(`🏆 Reward sent to ${winnerWallet.toBase58()} — tx: ${signature}`)
    rewards.push({ wallet: winnerWallet.toBase58(), lamports: 0.1, tx: signature, date: new Date().toISOString() })
    updatePotBalance()
  } catch (err) {
    console.error('❌ Failed to send reward:', err)
  }
})

// 🚀 Server başlat
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
})
