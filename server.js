import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 10000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Solappy Score Webhook is running')
})

app.post('/score', (req, res) => {
  const { signature, score } = req.body
  if (!signature || !score) return res.status(400).json({ error: 'Missing 
signature or score' })
  console.log(`New score received: ${score} from signature: ${signature}`)
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
