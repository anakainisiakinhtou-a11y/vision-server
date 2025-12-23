import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN;

// Μοντέλα με σειρά προτεραιότητας
const MODELS = [
  "Salesforce/blip2-flan-t5-xl",
  "Salesforce/blip-image-captioning-large",
  "nlpconnect/vit-gpt2-image-captioning"
];

async function queryModel(model, buffer) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: buffer
    }
  );

  return await response.json();
}

app.post("/analyze", async (req, res) => {
  console.log("📸 Λήφθηκε αίτημα από HTML");

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image" });

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    // Δοκιμάζουμε τα μοντέλα ένα-ένα
    for (const model of MODELS) {
      console.log("🔍 Δοκιμή μοντέλου:", model);

      let result = await queryModel(model, buffer);

      // Αν το μοντέλο φορτώνει, περιμένουμε και ξαναδοκιμάζουμε
      if (result.error && result.error.includes("loading")) {
        console.log("⏳ Το μοντέλο φορτώνει... ξαναδοκιμή σε 3s");
        await new Promise(r => setTimeout(r, 3000));
        result = await queryModel(model, buffer);
      }

      // Αν υπάρχει caption
      if (Array.isArray(result) && result[0]?.generated_text) {
        console.log("✅ Επιτυχία με μοντέλο:", model);
        return res.json({ caption: result[0].generated_text });
      }

      console.log("⚠ Αποτυχία μοντέλου:", model, "Απάντηση:", result);
    }

    // Αν κανένα μοντέλο δεν δώσει caption
    console.log("❌ Κανένα μοντέλο δεν έδωσε περιγραφή");
    return res.json({ caption: null });

  } catch (err) {
    console.error("❌ Σφάλμα:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Vision Server running on port " + PORT));
