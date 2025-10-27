const express = require('express');
const { Connection, Keypair, PublicKey, clusterApiUrl } = 
require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
app.use(express.json());
app.use(express.static('public'));

const connection = new Connection(clusterApiUrl('mainnet-beta'), 
'confirmed');

// Load wallets
const gameWallet = 
Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync('game-wallet.json'))));
const projectWallet = 
Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync('project-wallet.json'))));

// Track player payments and leaderboard
let playerSpent = {}; // { pubKey: totalSOLSpent }
let leaderboard = []; // sorted by totalSpent

// Pay game endpoint
app.post('/pay-game', (req, res) => {
  const { playerPublicKey } = req.body;
  if (!playerPublicKey) return res.status(400).json({ error: 
'playerPublicKey required' });

  const spent = 0.01;
  playerSpent[playerPublicKey] = (playerSpent[playerPublicKey] || 0) + 
spent;

  // Update leaderboard
  leaderboard = Object.entries(playerSpent)
    .map(([player, total]) => ({ player, total }))
    .sort((a, b) => b.total - a.total);

  res.json({ status: 'ok', totalSpent: playerSpent[playerPublicKey] });
});

// Leaderboard with filter
app.get('/leaderboard/:filter', (req, res) => {
  const filter = req.params.filter; // '1d', '1w', 'all'
  // Simplified: currently returns all-time, can extend later
  res.json(leaderboard.slice(0, 10));
});

// Airdrop info
app.get('/airdrop-amount/:player', (req, res) => {
  const player = req.params.player;
  const totalSpent = playerSpent[player] || 0;
  res.json({ player, airdropAmount: totalSpent });
});

// Launch airdrop
app.post('/launch-airdrop', async (req, res) => {
  // Token mint logic placeholder
  res.json({ status: 'airdrop complete' });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => console.log(`Server running at 
http://localhost:${port}`));
