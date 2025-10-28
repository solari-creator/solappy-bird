import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

let scores = []

app.post('/score', (req, res) => {
  const { signature, score } = req.body
  if (!signature || !score) return res.status(400).json({ error: 'Missing 
signature or score' })
  scores.push({ signature, score })
  scores.sort((a, b) => b.score - a.score)
  if (scores.length > 10) scores = scores.slice(0, 10)
  return res.json({ success: true, topScores: scores })
})

app.get('/top', (req, res) => {
  res.json(scores)
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
