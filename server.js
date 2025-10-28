import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(bodyParser.json())

const PORT = process.env.PORT || 10000

// Root endpoint
app.get('/', (req, res) => {
  res.send('Server is running')
})

// Score submission endpoint
app.post('/score', (req, res) => {
  const { signature, score } = req.body
  if (!signature || !score) {
    return res.status(400).json({ error: 'Missing signature or score' })
  }

  console.log(`Score received: ${signature} ${score}`)
  res.json({ message: 'Score received', signature, score })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
