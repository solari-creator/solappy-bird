import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 10000;

// Basit in-memory top10 array
let topScores = [];

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Endpoint: yeni skor
app.post('/new-score', (req, res) => {
  const { signature, score } = req.body;

  if (!signature || typeof score !== 'number') {
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Top10 skorları güncelle
  topScores.push({ signature, score });
  topScores.sort((a, b) => b.score - a.score);
  if (topScores.length > 10) topScores = topScores.slice(0, 10);

  res.json({ top10: topScores });
});

// Endpoint: top10 skorları getir
app.get('/scores', (req, res) => {
  res.json(topScores);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
