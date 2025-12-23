import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN;

async function queryImage(buffer) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/git-large-coco",
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

    let result = await queryImage(buffer);

    if (result.error && result.error.includes("loading")) {
      console.log("⏳ Το μοντέλο φορτώνει... ξαναδοκιμή σε 2s");
      await new Promise(r => setTimeout(r, 2000));
      result = await queryImage(buffer);
    }

    if (Array.isArray(result) && result[0]?.generated_text) {
      return res.json({ caption: result[0].generated_text });
    }

    console.log("⚠ Απάντηση HF:", result);
    return res.json({ caption: null });

  } catch (err) {
    console.error("❌ Σφάλμα:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Vision Server running on port " + PORT));
