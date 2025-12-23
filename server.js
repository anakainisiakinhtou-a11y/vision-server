// server.js
import express from "express";
import cors from "cors";
import { OpenAI } from "openai";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("OpenAI Vision Server is running");
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function cleanBase64(dataUrl) {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  return matches ? matches[2] : dataUrl;
}

app.post("/analyze", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Δεν στάλθηκε εικόνα." });
    }

    const base64 = cleanBase64(image);

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "input_text", text: "Περιέγραψε την εικόνα." },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64}`
            }
          ]
        }
      ]
    });

    const caption = response.choices?.[0]?.message?.content || "Δεν βρέθηκε περιγραφή";

    res.json({ caption });

  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: "Σφάλμα στον server." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
