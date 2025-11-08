// 1️⃣ Import libraries
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import 'dotenv/config'
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, 
sendAndConfirmTransaction } from '@solana/web3.js'

// 2️⃣ Load wallets from env
const gameSecretKey = JSON.parse(process.env.GAME_WALLET)
const gameKeypair = Keypair.fromSecretKey(Uint8Array.from(gameSecretKey))

const potSecretKey = JSON.parse(process.env.TOKEN_WALLET)
const potKeypair = Keypair.fromSecretKey(Uint8Array.from(potSecretKey))

// 3️⃣ Express setup
const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))  // index.html ve main.js için

// 4️⃣ Scores arrays
let scoresArray = []
let dailyScores = []
let dailyRewards = []

// 5️⃣ POST /score route
app.post('/score', (req, res) => {
  const { signature, score, wallet } = req.body
  const entry = { wallet, signature, score, timestamp: Date.now() }
  scoresArray.push(entry)
  dailyScores.push(entry)
  res.json({ message: "Score received", signature, score })
})

// 6️⃣ GET / route (Leaderboard visible on homepage)
app.get('/', (req, res) => {
  const topScores = dailyScores.slice().sort((a,b) => b.score - 
a.score).slice(0,20)
  const top3 = topScores.slice(0,3)
  const rest = topScores.slice(3)
  res.json({ top3, others: rest })
})

// 7️⃣ GET /scores route (raw top 20)
app.get('/scores', (req, res) => {
  const topScores = dailyScores.slice().sort((a,b) => b.score - 
a.score).slice(0,20)
  res.json(topScores)
})

// 8️⃣ GET /rewards route
app.get('/rewards', (req, res) => {
  res.json(dailyRewards)
})

// 9️⃣ Reward top 3 function
async function rewardTop3() {
  const sortedTop = dailyScores.slice().sort((a,b) => b.score - a.score).slice(0,3)
  const connection = new Connection("https://api.mainnet-beta.solana.com", 
"confirmed")

  const payouts = []

  for (const player of sortedTop) {
    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: potKeypair.publicKey,
          toPubkey: new PublicKey(player.wallet),
          lamports: 1000000 // 0.001 SOL örnek
        })
      )
      await sendAndConfirmTransaction(connection, tx, [potKeypair])
      console.log(`Reward sent to ${player.wallet}`)
      payouts.push({ wallet: player.wallet, lamports: 1000000 })
    } catch (err) {
      console.log(`Failed to send reward to ${player.wallet}: ${err}`)
    }
  }

  if (payouts.length) {
    dailyRewards.push({ timestamp: Date.now(), payouts })
  }
}

// 🔟 Clear daily scores every 24h and reward top 3
setInterval(async () => {
  if (dailyScores.length) {
    await rewardTop3()
    dailyScores = []
  }
}, 24*60*60*1000) // 24 hours

// 1️⃣1️⃣ Manual trigger endpoint for testing rewards
app.post('/test-reward', async (req, res) => {
  try {
    await rewardTop3()
    dailyScores = []
    res.json({ message: "Test reward executed, dailyScores cleared." })
  } catch (err) {
    res.status(500).json({ message: "Error executing test reward", error: 
err.toString() })
  }
})

// 1️⃣2️⃣ Start server
const PORT = process.env.PORT || 10000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
