// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(express.json({ limit: "10mb" })); // για εικόνες base64
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Azure Vision config
const VISION_ENDPOINT = process.env.VISION_ENDPOINT;
const VISION_KEY = process.env.VISION_KEY;

if (!VISION_ENDPOINT || !VISION_KEY) {
  console.warn(
    "ΠΡΟΕΙΔΟΠΟΙΗΣΗ: Δεν έχουν οριστεί VISION_ENDPOINT ή VISION_KEY. " +
    "Το AI Vision δεν θα λειτουργεί μέχρι να τα προσθέσεις ως μεταβλητές περιβάλλοντος."
  );
}

// Αρχείο αποθήκευσης περιγραφών
const DATA_FILE = path.join(__dirname, "descriptions.json");

// Αν δεν υπάρχει, το δημιουργούμε
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Φόρτωση περιγραφών
function loadDescriptions() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (e) {
    console.error("Σφάλμα ανάγνωσης descriptions.json:", e);
    return [];
  }
}

// Αποθήκευση περιγραφών
function saveDescriptions(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Μετατροπή dataURL base64 -> Buffer
function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
  const base64 = matches ? matches[2] : dataUrl;
  return Buffer.from(base64, "base64");
}

// Κλήση Azure AI Vision για caption
async function getImageCaptionFromAzure(imageBase64) {
  if (!VISION_ENDPOINT || !VISION_KEY) {
    // fallback αν δεν έχουν μπει κλειδιά
    return "Ανιχνεύτηκε εικόνα, αλλά το AI Vision δεν είναι ρυθμισμένο.";
  }

  const url =
    VISION_ENDPOINT +
    "/computervision/imageanalysis:analyze" +
    "?api-version=2023-02-01-preview" +
    "&features=caption"; // ζητάμε caption/λεζάντα

  const imageBuffer = dataUrlToBuffer(imageBase64);

  const headers = {
    "Ocp-Apim-Subscription-Key": VISION_KEY,
    "Content-Type": "application/octet-stream"
  };

  const response = await axios.post(url, imageBuffer, { headers });

  // Ανάλογα με την έκδοση, το caption βρίσκεται συνήθως σε imageCaptionResult/caption
  const result = response.data;
  let captionText = null;

  if (result && result.captionResult && result.captionResult.text) {
    captionText = result.captionResult.text;
  }

  if (!captionText) {
    captionText = "Δεν μπόρεσα να δημιουργήσω λεζάντα για αυτή την εικόνα.";
  }

  return captionText;
}

// -------------------------------
// 1?? API: Λήψη εικόνας & παραγωγή περιγραφής
// -------------------------------
app.post("/describe", async (req, res) => {
  const { imageBase64, manualText } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: "Δεν στάλθηκε εικόνα." });
  }

  try {
    // Κλήση σε Azure Vision για πραγματική περιγραφή
    const autoDescription = await getImageCaptionFromAzure(imageBase64);

    const finalText = (manualText && manualText.trim()) || autoDescription;

    // Αποθήκευση
    const descriptions = loadDescriptions();
    const entry = {
      text: finalText,
      time: new Date().toLocaleString("el-GR")
      // Μπορείς να κρατήσεις και την εικόνα αν θέλεις:
      // image: imageBase64
    };

    descriptions.push(entry);
    saveDescriptions(descriptions);

    res.json({
      success: true,
      description: finalText
    });
  } catch (err) {
    console.error("Σφάλμα στο /describe:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Σφάλμα κατά την ανάλυση της εικόνας με το AI Vision."
    });
  }
});

// -------------------------------
// 2?? API: Λήψη όλων των περιγραφών
// -------------------------------
app.get("/descriptions", (req, res) => {
  const data = loadDescriptions();
  res.json(data);
});

// -------------------------------
// 3?? API: Καθαρισμός περιγραφών
// -------------------------------
app.delete("/descriptions", (req, res) => {
  saveDescriptions([]);
  res.json({ success: true });
});

// -------------------------------
// Εκκίνηση server
// -------------------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
