// server.js (use this file as-is)
// only english in code, no turkish strings

import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import fs from 'fs'
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, 
sendAndConfirmTransaction } from '@solana/web3.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = parseInt(process.env.PORT || '10000', 10)

// ensure env secrets exist
if (!process.env.GAME_WALLET) {
  console.error('ERROR: GAME_WALLET env var not found')
  process.exit(1)
}
if (!process.env.TOKEN_WALLET) {
  console.error('ERROR: TOKEN_WALLET env var not found')
  process.exit(1)
}

// create Keypairs from env JSON arrays
let gameKeypair, tokenKeypair
try {
  gameKeypair = 
Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.GAME_WALLET)))
  tokenKeypair = 
Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.TOKEN_WALLET)))
} catch (e) {
  console.error('Invalid secret key JSON in env:', e.message)
  process.exit(1)
}

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed')

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public')) // serve frontend files from public/

// in-memory arrays (persist to DB later if needed)
let scoresArray = []
let dailyScores = []
let dailyRewards = []

// helper: return top N sorted by score desc
function topN(list, n = 20) {
  return list.slice().sort((a,b) => b.score - a.score).slice(0,n)
}

// POST /score
app.post('/score', (req, res) => {
  const { signature, score, wallet } = req.body
  if (!signature || typeof score !== 'number') {
    return res.status(400).json({ error: 'Missing signature or score (score must be number)' })
  }
  const entry = { wallet: wallet || 'Guest', signature, score, timestamp: Date.now() }
  scoresArray.push(entry)
  dailyScores.push(entry)
  res.json({ message: 'Score received', signature, score })
})

// GET /scores -> top 20 (for leaderboard api)
app.get('/scores', (req, res) => {
  const top20 = topN(dailyScores, 20)
  res.json(top20)
})

// GET / -> show top3 + others for homepage (json)
app.get('/', (req, res) => {
  const top20 = topN(dailyScores, 20)
  const top3 = top20.slice(0,3)
  const others = top20.slice(3)
  res.json({ top3, others })
})

// GET /rewards -> show daily rewards paid
app.get('/rewards', (req, res) => {
  res.json(dailyRewards)
})

// rewardTop3 function (sends small SOL amounts from tokenKeypair)
async function rewardTop3() {
  const sortedTop = topN(dailyScores, 3)
  if (sortedTop.length === 0) return

  const rewardsToSend = [] // keep record for frontend

  for (const p of sortedTop) {
    try {
      // amount in lamports (example: 0.001 SOL = 1_000_000 lamports)
      const lamports = 1000000
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: tokenKeypair.publicKey,
          toPubkey: new PublicKey(p.wallet),
          lamports
        })
      )
      const sig = await sendAndConfirmTransaction(connection, tx, [tokenKeypair])
      console.log(`Reward sent to ${p.wallet} tx: ${sig}`)
      rewardsToSend.push({ wallet: p.wallet, lamports, tx: sig })
    } catch (err) {
      console.error(`Failed to send reward to ${p.wallet}:`, err.toString())
    }
  }

  // record what was paid
  dailyRewards.unshift({ time: Date.now(), payouts: rewardsToSend })
  // trim stored rewards
  if (dailyRewards.length > 50) dailyRewards.splice(50)
}

// manual test endpoint
app.post('/test-reward', async (req, res) => {
  try {
    await rewardTop3()
    dailyScores = [] // clear daily
    res.json({ message: 'Test reward executed, dailyScores cleared.' })
  } catch (err) {
    res.status(500).json({ message: 'Error executing test reward', error: err.toString() 
})
  }
})

// schedule automatic reward every 24h using setInterval (server must stay running)
const ONE_DAY_MS = 24*60*60*1000
setInterval(async () => {
  try {
    await rewardTop3()
    dailyScores = []
    console.log('Daily reward job executed')
  } catch (err) {
    console.error('Daily reward job error', err.toString())
  }
}, ONE_DAY_MS)

// start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
