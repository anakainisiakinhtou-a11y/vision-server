import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN;

async function queryImage(base64Image) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: base64Image
      })
    }
  );

  return await response.json();
}

app.post("/analyze", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image" });
    }

    // Αφαίρεση prefix από το base64
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

    // Κλήση στο BLIP‑BASE
    const result = await queryImage(cleanBase64);

    // Debug για να δούμε τι επιστρέφει το API
    console.log("🔍 RAW RESULT:", result);

    // Έλεγχος για caption
    if (Array.isArray(result) && result[0]?.generated_text) {
      return res.json({ caption: result[0].generated_text });
    }

    return res.json({
      caption: "Δεν μπόρεσα να περιγράψω την εικόνα."
    });

  } catch (err) {
    console.error("❌ Σφάλμα:", err);
    return res.status(500).json({
      caption: "Σφάλμα στον διακομιστή."
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
