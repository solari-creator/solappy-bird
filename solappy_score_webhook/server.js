const express = require('express');
const app = express();
const port = 3000;

let scores = []; // Skorlar burada tutulacak

app.use(express.static('public'));
app.use(express.json()); // JSON POST verileri için

app.get('/scores', (req, res) => {
  res.json(scores);
});

app.post('/score-update', (req, res) => {
  const { signature, score, slot } = req.body;
  if (!signature || !score) return res.status(400).json({ error: 'Missing 
signature or score' });

  if (!scores.find(s => s.signature === signature)) {
    scores.push({ signature, score, slot });
    scores.sort((a, b) => b.score - a.score);
    console.log(`New score added: ${score}, signature: ${signature}`);
  }

  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
