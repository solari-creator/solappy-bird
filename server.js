import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send("Server is running and ready to receive scores");
});

app.post("/score", (req, res) => {
  const { signature, score } = req.body;
  if (!signature || !score) {
    return res.status(400).json({ error: "Missing signature or score" });
  }
  console.log("Received score:", score, "Signature:", signature);
  return res.status(200).json({ success: true, received: { signature, 
score } });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
