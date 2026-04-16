import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post("/api/generate", async (req, res) => {
  const { description } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: "Project description is required" });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://portfolio-helper.onrender.com",
        "X-Title": "Portfolio Helper",
      },
      body: JSON.stringify({
        model: "google/gemma-3-4b-it:free",
        messages: [
          {
            role: "user",
            content: `You are helping someone build their portfolio. Given this rough project description, provide:

1. A polished 2-3 sentence summary
2. Exactly 3 resume bullet points (action verbs, quantify impact where possible)
3. Exactly 3 portfolio tags (short, lowercase, e.g. "react", "machine-learning")

Project description:
${description}

Respond in this exact JSON format:
{
  "summary": "...",
  "bulletPoints": ["...", "...", "..."],
  "tags": ["...", "...", "..."]
}

Return only valid JSON, no markdown or extra text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      return res.status(500).json({ error: "Failed to generate content" });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "No response from model" });
    }

    let result;
    try {
      const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      console.error("Raw content:", content);
      return res.status(500).json({ error: "Failed to parse response" });
    }

    if (!result.summary || !result.bulletPoints || !result.tags) {
      return res.status(500).json({ error: "Invalid response format" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
