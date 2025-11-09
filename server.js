import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

// Memory storage
let scores = [] // { wallet, score, date }
let rewards = [] // { wallet, lamports, date }

// Submit score
app.post('/score', (req, res) => {
  const { wallet, score } = req.body
  if (!wallet || typeof score !== 'number') {
    return res.status(400).json({ error: 'Wallet or score missing/invalid' })
  }
  const today = new Date().toISOString().slice(0,10)
  scores.push({ wallet, score, date: today })
  return res.json({ success:true })
})

// Get leaderboard & stats
app.get('/scores', (req,res)=>{
  const today = new Date().toISOString().slice(0,10)
  const todayScores = scores.filter(s => s.date === today)

  // Count games per wallet
  const walletCounts = {}
  todayScores.forEach(s => { walletCounts[s.wallet] = (walletCounts[s.wallet]||0)+1 })

  // Reduce to highest score per wallet + play count
  const walletHighScores = {}
  todayScores.forEach(s => {
    if (!walletHighScores[s.wallet] || s.score > walletHighScores[s.wallet].score) {
      walletHighScores[s.wallet] = { ...s, plays: walletCounts[s.wallet], lastScores: todayScores.filter(x=>x.wallet===s.wallet).map(x=>x.score) }
    }
  })

  const leaderboard = Object.values(walletHighScores).sort((a,b)=>b.score-a.score)
  const totalPlays = todayScores.length
  const totalPlayers = Object.keys(walletCounts).length

  res.json({ leaderboard, totalPlays, totalPlayers })
})

// Rewards endpoints
app.get('/rewards',(req,res)=>res.json(rewards))
app.post('/reward',(req,res)=>{
  const { wallet, lamports } = req.body
  if(!wallet || !lamports) return res.status(400).json({ error:'Missing wallet or lamports' })
  rewards.push({ wallet, lamports, date: new Date().toISOString() })
  res.json({ success:true })
})

app.listen(PORT, ()=>console.log(`✅ Server running on port ${PORT}`))
