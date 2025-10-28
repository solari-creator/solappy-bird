import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config()
const app = express()
const port = process.env.PORT || 10000

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

let scores = []

app.post('/score', (req, res) => {
  const { signature, score } = req.body
  if (!signature || !score) return res.status(400).json({ error: 'Missing signature or score' })
  scores.push({ signature, score })
  scores.sort((a,b)=>b.score-a.score)
  if(scores.length>10) scores = scores.slice(0,10)
  console.log(`Score received: ${signature} ${score}`)
  res.json({ success: true })
})

app.get('/scores', (req,res)=>{
  res.json(scores)
})

app.listen(port, ()=>console.log(`Server running on port ${port}`))
