// server.js
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import cron from 'node-cron'
import dotenv from 'dotenv'
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

dotenv.config() // .env yükle

const app = express()
const PORT = process.env.PORT || 5050

app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

// 🔗 Solana bağlantısı
const connection = new Connection('https://api.mainnet-beta.solana.com')

// 🪙 Pot wallet adresi ve keypair env’den al
const POT_WALLET = new PublicKey(process.env.POT_WALLET_ADDRESS || '')
if(!process.env.POT_KEY) throw new Error('POT_KEY env missing')
const POT_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.POT_KEY))
)

// 📦 SQLite DB aç
const db = await open({
  filename: './solappy.db',
  driver: sqlite3.Database
})

// Tablo oluştur (yoksa)
await db.exec(`
CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT,
  score INTEGER,
  date TEXT
);
`)
await db.exec(`
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT,
  lamports REAL,
  tx TEXT,
  date TEXT
);
`)

// 🕛 Günlük arşiv klasörü
const archiveDir = path.resolve('./archives')
if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir)

// 🕛 Her gece 00:00'da skorları arşivle
cron.schedule('0 0 * * *', async () => {
  const today = new Date().toISOString().slice(0, 10)
  const rows = await db.all('SELECT * FROM scores WHERE date = ?', [today])
  const filePath = path.join(archiveDir, `scores_${today}.json`)
  fs.writeFileSync(filePath, JSON.stringify(rows, null, 2))
  console.log(`✅ [${today}] Scores archived (${rows.length} entries)`)
})

// admin token doğrulama middleware
function verifyAdmin(req,res,next){
  const token = req.headers['x-admin-token']
  if(!token || token !== process.env.ADMIN_TOKEN) return res.status(403).json({error:'Forbidden: Invalid admin token'})
  next()
}

// 📩 Skor gönderme endpoint
app.post('/score', async (req,res)=>{
  const {wallet,score} = req.body
  if(!wallet || typeof score!=='number') return res.status(400).json({error:'Wallet or score missing/invalid'})
  const today = new Date().toISOString().slice(0,10)
  await db.run('INSERT INTO scores (wallet, score, date) VALUES (?, ?, ?)', [wallet,score,today])
  res.json({success:true})
})

// 📊 Leaderboard endpoint
app.get('/scores', async (req,res)=>{
  const today = new Date().toISOString().slice(0,10)
  const rows = await db.all('SELECT * FROM scores WHERE date = ?', [today])
  const bestScores = {}
  rows.forEach(s=>{
    if(!bestScores[s.wallet] || s.score>bestScores[s.wallet].score){
      bestScores[s.wallet]={...s, plays:(bestScores[s.wallet]?.plays||0)+1}
    } else {
      bestScores[s.wallet].plays=(bestScores[s.wallet]?.plays||0)+1
    }
  })
  const sorted = Object.values(bestScores).sort((a,b)=>b.score-a.score)
  res.json(sorted.slice(0,20))
})

// 💰 Pot wallet bakiyesi otomatik güncelleme
let potBalance={pot_wallet:POT_WALLET.toBase58(), balance:'0.000', reward:'0.0'}
async function updatePotBalance(){
  try{
    const balanceLamports = await connection.getBalance(POT_WALLET)
let balanceSol = balanceLamports / LAMPORTS_PER_SOL
balanceSol = Math.floor(balanceSol*10)/10 // 0.1 adımlarına yuvarla
const rewardAmount = balanceSol.toFixed(1)
potBalance = { pot_wallet: POT_WALLET.toBase58(), balance: balanceSol.toFixed(1), reward: rewardAmount }
    console.log(`🔄 Pot wallet updated: ${potBalance.balance} SOL, reward: ${potBalance.reward} SOL`)
  }catch(err){ console.error('❌ Pot wallet fetch error:',err) }
}
updatePotBalance()
setInterval(updatePotBalance,60*1000)

// 📡 Endpoint artık saklanan güncel değeri döndürüyor
app.get('/pot-balance',(req,res)=>res.json(potBalance))

// 🏆 Reward kayıtları
app.get('/rewards', async (req,res)=>{
  const rows = await db.all('SELECT * FROM rewards')
  res.json(rows)
})
app.post('/reward', verifyAdmin, async (req,res)=>{
  const {wallet,lamports,tx} = req.body
  if(!wallet || !lamports) return res.status(400).json({error:'Missing wallet or lamports'})
  await db.run('INSERT INTO rewards (wallet,lamports,tx,date) VALUES (?,?,?,?)',[wallet,lamports,tx||null,new Date().toISOString()])
  res.json({success:true})
})

// 🔥 Günün birincisine otomatik 0.1 SOL ödül gönderimi
cron.schedule('59 23 * * *', async ()=>{
  const today = new Date().toISOString().slice(0,10)
  const rows = await db.all('SELECT * FROM scores WHERE date = ?', [today])
  if(rows.length===0) return console.log('⚠️ No scores today, skipping reward')

  const bestScoreObj = rows.reduce((prev,curr)=>curr.score>prev.score?curr:prev)
  const winnerWallet = new PublicKey(bestScoreObj.wallet)

  const lamports = 0.1*LAMPORTS_PER_SOL
  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey:POT_KEYPAIR.publicKey,
    toPubkey:winnerWallet,
    lamports
  }))

  try{
    const signature = await sendAndConfirmTransaction(connection,tx,[POT_KEYPAIR])
    console.log(`🏆 Reward sent to ${winnerWallet.toBase58()} — tx: ${signature}`)
    await db.run('INSERT INTO rewards (wallet,lamports,tx,date) VALUES (?,?,?,?)',
      [winnerWallet.toBase58(),0.1,signature,new Date().toISOString()])
    updatePotBalance()
  }catch(err){ console.error('❌ Failed to send reward:',err) }
})

// 🚀 Server başlat
app.listen(PORT,()=>console.log(`✅ Server running on port ${PORT}`))
