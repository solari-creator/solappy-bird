import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Public klasörünü static olarak sun
app.use(express.static(path.join(__dirname, 'public')));

// Score endpoint
app.post('/score', (req, res) => {
  const { signature, score } = req.body;
  if (!signature || !score) return res.status(400).json({ error: 'Missing signature or score' });

  console.log('Score received', signature, score);
  res.json({ success: true });
});

// Tüm diğer istekleri index.html’e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
