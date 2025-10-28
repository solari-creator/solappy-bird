import express from 'express'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const app = express()

app.use(express.json())
app.use(express.static(path.join(process.cwd(), 'public')))

const GAME_WALLET = process.env.GAME_WALLET
const POT_WALLET = process.env.POT_WALLET
const PROJECT_WALLET = process.env.PROJECT_WALLET

console.log('Wallets:', { GAME_WALLET, POT_WALLET, PROJECT_WALLET })

app.post('/score', (req, res) => {
  const { signature, score } = req.body
  if (!signature || !score) return res.status(400).json({ error: 'Missing signature or score' })

  console.log('New score submitted:', { score, signature })
  res.json({ success: true })
})

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'))
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => console.log(`Server running at 
http://localhost:${PORT}`))
