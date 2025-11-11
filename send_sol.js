import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ⚠️ Alıcı adresi buraya yaz
const RECEIVER = '56XZkr5cz8vqDUugp3XddfW33F7i5QQ9qWq8HPZLxow8';

// Solana mainnet bağlantısı
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Pot wallet Keypair’i
const POT_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync('pot-wallet.json', 'utf8')))
);

async function sendSol() {
  try {
    const lamports = 0.1 * LAMPORTS_PER_SOL;

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: POT_KEYPAIR.publicKey,
        toPubkey: new PublicKey(RECEIVER),
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, tx, [POT_KEYPAIR]);
    console.log(`✅ 0.1 SOL sent successfully to ${RECEIVER}`);
    console.log(`Transaction signature: ${signature}`);
  } catch (err) {
    console.error('❌ Transfer failed:', err.message);
    if (err.transactionLogs) console.log('Logs:', err.transactionLogs);
  }
}

sendSol();
