import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.post("/score", (req, res) => {
  const { signature, score } = req.body;
  if (!signature || !score) return res.status(400).json({ error: "Missing signature or score" });
  console.log("Score received:", signature, score);
  res.json({ status: "ok" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
