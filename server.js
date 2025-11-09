import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage
let scores = []; // { wallet, date, plays, lastScores, score }
let rewards = []; // { wallet, lamports, date }

// Submit score
app.post('/score', (req, res) => {
  const { wallet, score } = req.body;
  if (!wallet || typeof score !== 'number') return res.status(400).json({ error: 'Wallet or score missing/invalid' });

  const today = new Date().toISOString().slice(0, 10);

  let entry = scores.find(s => s.wallet === wallet && s.date === today);
  if (!entry) {
    entry = { wallet, date: today, plays: 0, lastScores: [], score: 0 };
    scores.push(entry);
  }

  entry.plays += 1;
  entry.lastScores.push(score);
  entry.score = Math.max(entry.score, score);

  res.json({ success: true });
});

// Leaderboard
app.get('/scores', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const todayScores = scores.filter(s => s.date === today);
  const sorted = todayScores.sort((a, b) => b.score - a.score);
  res.json(sorted.slice(0, 20));
});

// Rewards
app.get('/rewards', (req, res) => {
  res.json(rewards);
});

app.post('/reward', (req, res) => {
  const { wallet, lamports } = req.body;
  if (!wallet || !lamports) return res.status(400).json({ error: 'Missing wallet or lamports' });
  rewards.push({ wallet, lamports, date: new Date().toISOString() });
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
