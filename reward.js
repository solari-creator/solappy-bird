import fs from 'fs';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import cron from 'node-cron';
import fetch from 'node-fetch';

// === 1️⃣ Solana bağlantısı ===
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// === 2️⃣ Pot wallet keypair ===
const potSecret = JSON.parse(fs.readFileSync('./POT_WALLET.json', 'utf8'));
const potWallet = Keypair.fromSecretKey(Uint8Array.from(potSecret));

console.log('✅ Pot wallet loaded:', potWallet.publicKey.toBase58());

// === 3️⃣ Günün birincisini getiren fonksiyon ===
// Backend’in /scores endpoint’ini okuyup en yüksek skoru buluyor
async function getDailyWinner() {
  try {
    const res = await fetch('https://solappy-bird.onrender.com/scores');
    const data = await res.json();
    if (!data || data.length === 0) return null;

    const walletMap = {};
    data.forEach(p => {
      if (!walletMap[p.wallet] || p.score > walletMap[p.wallet]) {
        walletMap[p.wallet] = p.score;
      }
    });

    // Skor sıralaması
    const sorted = Object.entries(walletMap)
      .sort((a, b) => b[1] - a[1])
      .map(([wallet, score]) => ({ wallet, score }));

    const winner = sorted[0];
    console.log(`🏆 Günün birincisi: ${winner.wallet} (${winner.score})`);
    return winner.wallet;
  } catch (err) {
    console.error('❌ getDailyWinner error:', err);
    return null;
  }
}

// === 4️⃣ Ödül gönderim fonksiyonu ===
async function sendReward(winnerPubkey, amountSol) {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: potWallet.publicKey,
        toPubkey: new PublicKey(winnerPubkey),
        lamports: amountSol * LAMPORTS_PER_SOL,
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [potWallet]);
    console.log(`✅ Sent ${amountSol} SOL to ${winnerPubkey}`);
    console.log('Signature:', signature);

    // Ödül geçmişini kaydet
    saveRewardHistory({ winner: winnerPubkey, tx: signature, amount: amountSol, time: new Date().toISOString() });
    return signature;
  } catch (e) {
    console.error('❌ Reward send failed:', e);
    return null;
  }
}

// === 5️⃣ Son ödül geçmişini kaydeden fonksiyon ===
function saveRewardHistory(entry) {
  fs.writeFileSync('./lastReward.json', JSON.stringify(entry, null, 2));
  console.log('💾 Reward info saved:', entry);
}

// === 6️⃣ Cron job — her gece 23:59’da çalışır ===
cron.schedule('59 23 * * *', async () => {
  console.log('⏰ Midnight reward job started...');
  const winner = await getDailyWinner();
  if (!winner) return console.log('No winner found today.');

  const potBalanceSol = await connection.getBalance(potWallet.publicKey) / LAMPORTS_PER_SOL;
  const rewardAmount = Math.floor(potBalanceSol * 10) / 10; // örn. 0.12 → 0.1 SOL gönder
  const sendAmount = Math.max(0.1, rewardAmount);

  console.log(`🎁 Sending ${sendAmount} SOL from pot wallet`);
  const tx = await sendReward(winner, sendAmount);
  if (tx) console.log(`✅ Reward sent to ${winner}: ${tx}`);
});
