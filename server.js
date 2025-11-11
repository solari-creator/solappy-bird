// server.js
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import cron from 'node-cron'
import dotenv from 'dotenv'
import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import fetch from 'node-fetch'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

// 🔗 Solana bağlantısı
const connection = new Connection('https://api.mainnet-beta.solana.com')

// 🪙 Pot wallet env’den yükleniyor
const POT_WALLET = new PublicKey(process.env.POT_WALLET_ADDRESS || '')
if (!process.env.POT_KEY) throw new Error('POT_KEY env missing')
const POT_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.POT_KEY))
)

// ⚙️ Adil skor katsayısı
const FAIR_K = parseFloat(process.env.FAIR_K || '0.25')

// 📦 SQLite
const db = await open({
  filename: './solappy.db',
  driver: sqlite3.Database
})

// 📊 Tablolar
await db.exec(`
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT,
  score INTEGER,
  date TEXT
);
`)
await db.exec(`
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT,
  lamports REAL,
  tx TEXT,
  date TEXT
);
`)
await db.exec(`
CREATE TABLE IF NOT EXISTS totals (
  id INTEGER PRIMARY KEY,
  totalPlays INTEGER DEFAULT 0,
  totalPlayers INTEGER DEFAULT 0
);
`)
const totalsRow = await db.get('SELECT * FROM totals WHERE id=1')
if (!totalsRow)
  await db.run('INSERT INTO totals (id, totalPlays, totalPlayers) VALUES (1, 0, 0)')

// 🔒 Admin doğrulama
function verifyAdmin(req, res, next) {
  const token = req.headers['x-admin-token']
  if (!token || token !== process.env.ADMIN_TOKEN)
    return res.status(403).json({ error: 'Forbidden: Invalid admin token' })
  next()
}

// 🧠 Totals güncelle
async function updateTotals(newScores) {
  const totals = await db.get('SELECT * FROM totals WHERE id=1')
  let totalPlays = totals.totalPlays
  let totalPlayers = totals.totalPlayers

  const existingWallets = await db.all('SELECT DISTINCT wallet FROM scores')
  const existingWalletSet = new Set(existingWallets.map(w => w.wallet))

  newScores.forEach(s => {
    totalPlays += 1
    if (!existingWalletSet.has(s.wallet)) {
      totalPlayers += 1
      existingWalletSet.add(s.wallet)
    }
  })

  await db.run('UPDATE totals SET totalPlays=?, totalPlayers=? WHERE id=1', [
    totalPlays,
    totalPlayers
  ])
}

// 📩 Skor gönderme (Python güvenlik katmanlı)
app.post('/score', async (req, res) => {
  const { wallet, score } = req.body
  if (!wallet || typeof score !== 'number')
    return res.status(400).json({ error: 'Wallet or score missing/invalid' })

  const PYTHON_API_URL = 'https://solappy-score-api.onrender.com/save_score'

  try {
    const response = await fetch(PYTHON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player: wallet, score })
    })

    const data = await response.json()
    if (!response.ok) {
      console.error(`❌ Python API rejected score for ${wallet}`, data.message)
      return res.status(401).json({
        error: 'Score validation failed on secure backend',
        details: data.message
      })
    }

    const today = new Date().toISOString().slice(0, 10)
    await db.run('INSERT INTO scores (wallet, score, date) VALUES (?, ?, ?)', [
      wallet,
      score,
      today
    ])

    await updateTotals([{ wallet, score }])
    res.json({ success: true, message: 'Score validated and recorded.' })
  } catch (err) {
    console.error('❌ Error forwarding score to Python API:', err)
    res.status(500).json({
      error: 'Internal Server Error during validation',
      details: err.message
    })
  }
})

// 🏆 Scores endpoint — adil skor (fair score) dahil
app.get('/scores', async (req, res) => {
  try {
    const range = req.query.range || 'daily'
    const today = new Date()
    let rows = []

    if (range === 'daily') {
      const date = today.toISOString().slice(0, 10)
      rows = await db.all('SELECT * FROM scores WHERE date = ?', [date])
    } else if (range === 'weekly') {
      const start = new Date(today)
      start.setDate(today.getDate() - 6)
      rows = await db.all('SELECT * FROM scores WHERE date BETWEEN ? AND ?', [
        start.toISOString().slice(0, 10),
        today.toISOString().slice(0, 10)
      ])
    } else if (range === 'monthly') {
      const start = new Date(today)
      start.setMonth(today.getMonth() - 1)
      rows = await db.all('SELECT * FROM scores WHERE date BETWEEN ? AND ?', [
        start.toISOString().slice(0, 10),
        today.toISOString().slice(0, 10)
      ])
    }

    const agg = {}
    rows.forEach(s => {
      if (!agg[s.wallet]) {
        agg[s.wallet] = {
          wallet: s.wallet,
          rawScore: s.score,
          plays: 1
        }
      } else {
        agg[s.wallet].plays += 1
        agg[s.wallet].rawScore = Math.max(agg[s.wallet].rawScore, s.score)
      }
    })

    const results = Object.values(agg).map(p => {
      const fairScore = +(
        p.rawScore * (1 + FAIR_K * Math.log10(p.plays + 1))
      ).toFixed(4)
      return { ...p, fairScore }
    })

    results.sort((a, b) => b.fairScore - a.fairScore)

    res.json(results.slice(0, 20))
  } catch (err) {
    console.error('❌ /scores error', err)
    res.status(500).json({ error: 'Cannot fetch scores' })
  }
})

// 📈 Totals endpoint
app.get('/totals', async (req, res) => {
  try {
    const totals = await db.get(
      'SELECT totalPlays,totalPlayers FROM totals WHERE id=1'
    )
    res.json(totals)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Cannot fetch totals' })
  }
})

// 💰 Pot wallet bakiyesi
let potBalance = {
  pot_wallet: POT_WALLET.toBase58(),
  balance: '0.000',
  reward: '0.0'
}
async function updatePotBalance() {
  try {
    const balanceLamports = await connection.getBalance(POT_WALLET)
    let balanceSol = balanceLamports / LAMPORTS_PER_SOL
    balanceSol = Math.floor(balanceSol * 10) / 10
    const rewardAmount = balanceSol.toFixed(1)
    potBalance = {
      pot_wallet: POT_WALLET.toBase58(),
      balance: balanceSol.toFixed(1),
      reward: rewardAmount
    }
    console.log(`🔄 Pot wallet updated: ${potBalance.balance} SOL`)
  } catch (err) {
    console.error('❌ Pot wallet fetch error:', err)
  }
}
updatePotBalance()
setInterval(updatePotBalance, 60 * 1000)
app.get('/pot-balance', (req, res) => res.json(potBalance))

// 🏆 Rewards
app.get('/rewards', async (req, res) => {
  const rows = await db.all('SELECT * FROM rewards')
  res.json(rows)
})
app.post('/reward', verifyAdmin, async (req, res) => {
  const { wallet, lamports, tx } = req.body
  if (!wallet || !lamports)
    return res.status(400).json({ error: 'Missing wallet or lamports' })
  await db.run(
    'INSERT INTO rewards (wallet,lamports,tx,date) VALUES (?,?,?,?)',
    [wallet, lamports, tx || null, new Date().toISOString()]
  )
  res.json({ success: true })
})

// 🕛 Günlük otomatik ödül (UTC 23:59)
cron.schedule(
  '59 23 * * *',
  async () => {
    const today = new Date().toISOString().slice(0, 10)
    const rows = await db.all('SELECT * FROM scores WHERE date = ?', [today])
    if (rows.length === 0)
      return console.log('⚠️ No scores today, skipping reward')

    const agg = {}
    rows.forEach(s => {
      if (!agg[s.wallet]) {
        agg[s.wallet] = { wallet: s.wallet, rawScore: s.score, plays: 1 }
      } else {
        agg[s.wallet].plays += 1
        agg[s.wallet].rawScore = Math.max(agg[s.wallet].rawScore, s.score)
      }
    })

    const ranked = Object.values(agg).map(p => {
      const fair = +(
        p.rawScore * (1 + FAIR_K * Math.log10(p.plays + 1))
      ).toFixed(4)
      return { ...p, fairScore: fair }
    })

    ranked.sort((a, b) => b.fairScore - a.fairScore)
    const winner = ranked[0]
    const winnerWallet = new PublicKey(winner.wallet)
    const lamports = 0.1 * LAMPORTS_PER_SOL

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: POT_KEYPAIR.publicKey,
        toPubkey: winnerWallet,
        lamports
      })
    )

    try {
      const signature = await sendAndConfirmTransaction(connection, tx, [
        POT_KEYPAIR
      ])
      console.log(`🏆 Reward sent to ${winner.wallet} — tx: ${signature}`)
      await db.run(
        'INSERT INTO rewards (wallet,lamports,tx,date) VALUES (?,?,?,?)',
        [winner.wallet, 0.1, signature, new Date().toISOString()]
      )
      updatePotBalance()
    } catch (err) {
      console.error('❌ Failed to send reward:', err)
    }
  },
  { timezone: 'UTC' }
)

// 🚀 Server start
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT} | FAIR_K=${FAIR_K}`)
)
