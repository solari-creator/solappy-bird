require('dotenv').config();
const express = require('express');
const fs = require('fs');
const solanaWeb3 = require('@solana/web3.js');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Connection to Mainnet
const connection = new 
solanaWeb3.Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Load wallets
const potWallet = solanaWeb3.Keypair.fromSecretKey(
  
Uint8Array.from(JSON.parse(fs.readFileSync(process.env.POT_WALLET_PATH)))
);
const projectWallet = solanaWeb3.Keypair.fromSecretKey(
  
Uint8Array.from(JSON.parse(fs.readFileSync(process.env.PROJECT_WALLET_PATH)))
);

// Game price
const GAME_PRICE_SOL = 0.01;

// Endpoint: Player pays to play
app.post('/play', async (req, res) => {
  try {
    const { fromPubkey, signature } = req.body;

    if (!fromPubkey || !signature) return res.status(400).json({ error: 
'fromPubkey and signature required' });

    // Confirm transaction
    const tx = await connection.getTransaction(signature);
    if (!tx) return res.status(400).json({ error: 'Transaction not found' 
});

    // Check if transaction sends at least GAME_PRICE_SOL to Pot Wallet
    const lamportsSent = 
tx.transaction.message.accountKeys.includes(potWallet.publicKey.toBase58())
      ? 
tx.meta.postBalances[tx.transaction.message.accountKeys.indexOf(potWallet.publicKey.toBase58())] 
-
        
tx.meta.preBalances[tx.transaction.message.accountKeys.indexOf(potWallet.publicKey.toBase58())]
      : 0;

    if (lamportsSent < GAME_PRICE_SOL * solanaWeb3.LAMPORTS_PER_SOL) {
      return res.status(400).json({ error: 'Insufficient payment' });
    }

    res.json({ status: 'ok', message: 'Payment confirmed, player can play' 
});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint: Winner payout
app.post('/winner', async (req, res) => {
  try {
    const { winnerPubkey, totalPoolSol } = req.body;
    if (!winnerPubkey || !totalPoolSol) return res.status(400).json({ 
error: 'winnerPubkey and totalPoolSol required' });

    const winnerAmount = totalPoolSol * 0.3;
    const projectAmount = totalPoolSol * 0.7;

    // Create and send transaction to winner
    const winnerTx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: potWallet.publicKey,
        toPubkey: new solanaWeb3.PublicKey(winnerPubkey),
        lamports: winnerAmount * solanaWeb3.LAMPORTS_PER_SOL
      })
    );
    await solanaWeb3.sendAndConfirmTransaction(connection, winnerTx, 
[potWallet]);

    // Send remaining to project wallet
    const projectTx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: potWallet.publicKey,
        toPubkey: projectWallet.publicKey,
        lamports: projectAmount * solanaWeb3.LAMPORTS_PER_SOL
      })
    );
    await solanaWeb3.sendAndConfirmTransaction(connection, projectTx, 
[potWallet]);

    res.json({ status: 'ok', winnerAmount, projectAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payout failed' });
  }
});

app.listen(port, () => console.log(`Server running at 
http://localhost:${port}`));
