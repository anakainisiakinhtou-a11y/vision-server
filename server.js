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

// -------------------------------
// ROOT ROUTE (ΝΕΟ)
// -------------------------------
app.get("/", (req, res) => {
  res.send("Vision Server is running");
});

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
    "&features=caption"; // ζη
