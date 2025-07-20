
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/gpt-characters", async (req, res) => {
  try {
    const prompt = `Generate 8 mysterious characters for a survival mystery game. Each character should have:
- A first name
- A one-word personality trait (manipulative, blunt, quiet, panicked, confident)
Output as JSON like:
[{"name": "Cassie", "behavior": "manipulative"}, ...]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const characters = JSON.parse(completion.choices[0].message.content);
    const killerIndex = Math.floor(Math.random() * characters.length);
    characters[killerIndex].isKiller = true;

    res.json({ characters });
  } catch (err) {
    console.error("GPT error:", err);
    res.status(500).json({ error: "GPT error" });
  }
});

app.post("/api/gpt-clue", async (req, res) => {
  const { killerBehavior, day, location } = req.body;
  try {
    const prompt = `You're writing immersive environmental clues for a mystery game.

The player explores: "${location || 'camp'}"
The killer has a "${killerBehavior}" personality. It's Day ${day}.

Describe a subtle, vague, atmospheric clue found at this location. Do not reveal names or make it obvious. Return just the clue, 2–3 sentences max.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    const clue = completion.choices[0].message.content;
    res.json({ clue });
  } catch (err) {
    console.error("GPT clue error:", err);
    res.status(500).json({ error: "GPT clue error" });
  }
});

app.post("/api/gpt-alibis", async (req, res) => {
  const { day, clue, suspects } = req.body;

  const prompt = `Generate believable alibis for each character below in a mystery game.

Day: ${day}
Environmental Clue: "${clue}"

Characters:
${JSON.stringify(suspects, null, 2)}

For each character, return:
{ "name": "Cassie", "alibi": "I was gathering firewood near the lake..." }

The killer (isKiller: true) should lie subtly. Others may reference the clue indirectly or mention another NPC.

Respond ONLY with a JSON array.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    let raw = completion.choices[0].message.content.trim();

    // Try to fix malformed JSON (remove markdown/code blocks)
    if (raw.startsWith("```")) {
      raw = raw.replace(/```(?:json)?/gi, "").replace(/```$/, "").trim();
    }

    const alibis = JSON.parse(raw);
    res.json({ alibis });

  } catch (err) {
    console.error("🔥 Failed to get alibis:", err.message);
    res.json({ alibis: [] }); // fail gracefully
  }
});


app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
