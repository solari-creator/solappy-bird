const express = require('express')
const solanaWeb3 = require('@solana/web3.js')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'))
})

// Environment variable’dan cüzdanları yükle
const gameWallet = solanaWeb3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.GAME_WALLET))
)
const tokenWallet = solanaWeb3.Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.TOKEN_WALLET))
)

let scores = []
let fetchedSignatures = new Set()

// Skor ekleme endpoint
app.post('/new-score', async (req, res) => {
  const { signature, score } = req.body
  if (!signature || !score) return res.status(400).json({ error: 'Missing fields' })

  if (!fetchedSignatures.has(signature)) {
    fetchedSignatures.add(signature)
    scores.push({ signature, score })
    scores.sort((a, b) => b.score - a.score)
  }

  res.json({ status: 'ok', top10: scores.slice(0,10) })
})

// Skorları frontend’e gönder
app.get('/scores', (req, res) => {
  res.json(scores.slice(0,10))
})

app.listen(port, () => console.log(`Server running at 
http://localhost:${port}`))
