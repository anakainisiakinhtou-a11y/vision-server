// server.js
import express from "express";
import fs from "fs";
import path from "path";
import axios from "axios";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cors());

app.get("/", (req, res) => {
  res.send("Vision Server is running");
});

const VISION_ENDPOINT = process.env.VISION_ENDPOINT;
const VISION_KEY = process.env.VISION_KEY;

const DATA_FILE = path.join(__dirname, "descriptions.json");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

function loadDescriptions() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveDescriptions(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  const base64 = matches ? matches[2] : dataUrl;
  return Buffer.from(base64, "base64");
}

async function getImageCaptionFromAzure(imageBase64) {
  if (!VISION_ENDPOINT || !VISION_KEY) {
    return "Ανιχνεύτηκε εικόνα, αλλά το AI Vision δεν είναι ρυθμισμένο.";
  }

  const url =
    VISION_ENDPOINT +
    "/computervision/imageanalysis:analyze" +
    "?api-version=2023-02-01-preview&features=caption";

  try {
    const response = await axios.post(
      url,
      { image: imageBase64 },
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": VISION_KEY
        }
      }
    );

    return response.data.captionResult?.text || "Δεν βρέθηκε περιγραφή.";
  } catch {
    return "Σφάλμα κατά την ανάλυση εικόνας.";
  }
}

app.post("/analyze", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "Δεν στάλθηκε εικόνα." });

    const buffer = dataUrlToBuffer(image);
    const base64 = buffer.toString("base64");

    const caption = await getImageCaptionFromAzure(base64);

    const descriptions = loadDescriptions();
    descriptions.push({ timestamp: new Date().toISOString(), caption });
    saveDescriptions(descriptions);

    res.json({ caption });
  } catch {
    res.status(500).json({ error: "Σφάλμα στον server." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
