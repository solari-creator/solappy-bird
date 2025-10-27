import express from "express"
import dotenv from "dotenv"
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from 
"@solana/web3.js"
import base58 from "bs58"

dotenv.config()
const app = express()
app.use(express.json())

// ✅ Frontend dosyalarını sunmak için
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html')
})

// ✅ Solana bağlantısı
const connection = new Connection("https://api.mainnet-beta.solana.com")

// ✅ Cüzdanlar environment değişkenlerinden alınacak
const gameWallet = 
Keypair.fromSecretKey(base58.decode(process.env.GAME_WALLET_PRIVATE_KEY))
const tokenWallet = 
Keypair.fromSecretKey(base58.decode(process.env.TOKEN_WALLET_PRIVATE_KEY))

// ✅ Skor kaydı (örnek endpoint)
app.post('/submit-score', async (req, res) => {
  const { score, player } = req.body
  console.log(`Yeni skor alındı: ${player} - ${score}`)

  // burada zincire yazma veya kaydetme işlemleri olacak
  res.json({ success: true, message: "Skor kaydedildi" })
})

// ✅ Skorları görmek için (geçici dummy sayfa)
app.get('/scores', (req, res) => {
  res.send(`
    <h1>Live Scores</h1>
    <table border="1" cellpadding="5">
      <tr><th>Rank</th><th>Score</th><th>Signature</th><th>Slot</th></tr>
    </table>
  `)
})

const PORT = process.env.PORT || 10000
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
})
