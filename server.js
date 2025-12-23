// server.js (FREE VERSION - HuggingFace)
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// Επιτρέπουμε μεγάλα JSON (μέχρι 10MB)
app.use(express.json({ limit: "10mb" }));

// Πλήρες CORS για να δέχεται αιτήματα από κινητά & HTTPS sites
app.use(cors({
  origin: "*",
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const HF_TOKEN = process.env.HF_TOKEN; // ΔΩΡΕΑΝ token από HuggingFace

app.post("/analyze", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Δεν στάλθηκε εικόνα." });
    }

    // Αφαιρούμε το header του Base64
    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // Κλήση στο HuggingFace Vision Model
    const response = await fetch(
      "https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream"
        },
        body: buffer
      }
    );

    const result = await response.json();

    let caption = "Δεν βρέθηκε περιγραφή";

    if (Array.isArray(result) && result[0]?.generated_text) {
      caption = result[0].generated_text;
    }

    res.json({ caption });

  } catch (error) {
    console.error("HF Error:", error);
    res.status(500).json({ error: "Σφάλμα στον server." });
  }
});

// Εκκίνηση server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("FREE Vision Server running on port " + PORT));
