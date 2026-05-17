import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Secrets.");
    }
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return genAI;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Negotiate AI Move
  app.post("/api/chess/move", async (req, res) => {
    const { fen, history } = req.body;

    if (!fen) {
      return res.status(400).json({ error: "FEN string is required" });
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          parts: [{
            text: `You are a high-level chess grandmaster named MONO.
            Current board FEN: ${fen}
            Recent move history: ${history?.join(", ") || "None"}
            
            Analyze the position and provide the best move in Standard Algebraic Notation (SAN).
            Also provide a short, stark, professional commentary on the position (max 15 words).
            Return purely valid JSON matching the schema provided.`
          }]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              move: { type: Type.STRING },
              commentary: { type: Type.STRING }
            },
            required: ["move", "commentary"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      res.json(data);
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      const errorMessage = error?.message || "AI engine failed";
      const isLeaked = errorMessage.includes("leaked");
      
      res.status(isLeaked ? 403 : 500).json({ 
        error: isLeaked 
          ? "API Key reported as leaked. Please rotate your key in the Secrets panel."
          : errorMessage 
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
