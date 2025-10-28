import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const scores = []

app.post('/score', (req, res) => {
  const { signature, score } = req.body
  if (!signature || score === undefined) return res.status(400).json({ error: 
'Missing signature or score' })
  const slot = Date.now()
  scores.push({ signature, score, slot })
  scores.sort((a,b) => b.score - a.score)
  res.json({ success: true })
})

app.get('/top10', (req, res) => {
  res.json(scores.slice(0,10))
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => console.log(`Server running at 
http://localhost:${PORT}`))
