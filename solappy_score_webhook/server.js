import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const port = process.env.PORT || 10000

app.use(cors())
app.use(bodyParser.json())

const gameWallet = process.env.GAME_WALLET
const projectWallet = process.env.PROJECT_WALLET
const rpcEndpoint = process.env.SOLANA_RPC

app.get("/", (req, res) => {
  res.send("Server is running")
})

app.post("/submit-score", (req, res) => {
  const { signature, score, player } = req.body
  if (!signature || !score) return res.status(400).json({ error: "Missing signature or score" })

  console.log(`Player: ${player}, Score: ${score}, Signature: ${signature}`)

  // Here you would add on-chain submission logic using gameWallet, 
projectWallet, rpcEndpoint

  res.status(200).json({ message: "Score submitted successfully" })
})

app.get("/top-scores", (req, res) => {
  // Placeholder top scores
  const topScores = [
    { player: "Alice", score: 100 },
    { player: "Bob", score: 90 },
    { player: "Charlie", score: 80 },
  ]
  res.status(200).json(topScores)
})

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
