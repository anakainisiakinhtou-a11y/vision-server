import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());

const HF_TOKEN = process.env.HF_TOKEN;

// Χρησιμοποιούμε ένα σταθερό μοντέλο BLIP base
const MODEL = "Salesforce/blip-image-captioning-base";

async function queryImage(buffer) {
  const response = await fetch(
    `https://api-inference.huggingface.co/models/${MODEL}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: buffer
    }
  );

  let json;
  try {
    json = await response.json();
  } catch (e) {
    console.error("❌ Δεν είναι έγκυρο JSON από HF:", e);
    return { error: "invalid_json" };
  }

  return json;
}

app.post("/analyze", async (req, res) => {
  console.log("📸 Λήφθηκε αίτημα από HTML");

  try {
    const { image } = req.body;
    if (!image) {
      console.log("⚠ Δεν στάλθηκε εικόνα");
      return res.status(400).json({ error: "No image" });
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    let result = await queryImage(buffer);

    // Αν το μοντέλο φορτώνει, μια γρήγορη δεύτερη προσπάθεια
    if (result?.error && typeof result.error === "string" && result.error.includes("loading")) {
      console.log("⏳ Το μοντέλο φορτώνει... ξαναδοκιμή σε 2s");
      await new Promise(r => setTimeout(r, 2000));
      result = await queryImage(buffer);
    }

    console.log("🔎 Απάντηση HF:", JSON.stringify(result));

    // Αν είναι array με generated_text (τυπική μορφή BLIP)
    if (Array.isArray(result) && result[0]?.generated_text) {
      return res.json({ caption: result[0].generated_text });
    }

    // Αν ήρθε οποιοδήποτε error ή κάτι απροσδόκητο, δώσε τουλάχιστον μια σταθερή φράση
    console.log("⚠ Καμία έγκυρη περιγραφή. Επιστρέφεται fallback κείμενο.");
    return res.json({
      caption: "Έλαβα την εικόνα αλλά δεν μπορώ να την περιγράψω αξιόπιστα αυτή τη στιγμή."
    });

  } catch (err) {
    console.error("❌ Σφάλμα server:", err);
    return res.status(500).json({
      caption: "Παρουσιάστηκε σφάλμα στον διακομιστή κατά την επεξεργασία της εικόνας."
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Vision Server running on port " + PORT));
