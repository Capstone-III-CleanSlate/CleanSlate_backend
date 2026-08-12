require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not configured");
}

if (!process.env.GEMINI_MODEL) {
  throw new Error("GEMINI_MODEL is not configured");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

module.exports = {
  ai,
  model: process.env.GEMINI_MODEL,
};
