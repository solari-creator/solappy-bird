// send_sol.js
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()

const connection = new Connection('https://api.mainnet-beta.solana.com')

const POT_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('pot-wallet.json','utf8')))
)

// Göndermek istediğin adres
const recipient = new PublicKey('56XZkr5cz8vqDUugp3XddfW33F7i5QQ9qWq8HPZLxow8')

// Gönderilecek miktar (0.1 SOL)
const lamports = 0.1 * LAMPORTS_PER_SOL

const main = async () => {
  try {
    console.log(`💰 Pot balance: ${await connection.getBalance(POT_KEYPAIR.publicKey) / LAMPORTS_PER_SOL} SOL`)
    console.log(`➡️ Sending 0.1 SOL to ${recipient.toBase58()}...`)

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: POT_KEYPAIR.publicKey,
        toPubkey: recipient,
        lamports
      })
    )

    const signature = await sendAndConfirmTransaction(connection, tx, [POT_KEYPAIR])
    console.log(`✅ Transfer successful! Tx signature: ${signature}`)
  } catch (err) {
    console.error('❌ Transfer failed:', err)
  }
}

main()
