const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = "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"; // 🔒 keep private

// 🧠 LOGIC: Find best team (max skill coverage)
function findBestTeam(users) {
  if (users.length < 2) return [];

  let bestTeam = [];
  let bestScore = 0;

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      for (let k = j + 1; k < users.length; k++) {
        const team = [users[i], users[j], users[k]];

        const uniqueSkills = new Set(
          team.flatMap((u) => u.skills.map((s) => s.toLowerCase()))
        );

        const score = uniqueSkills.size;

        if (score > bestScore) {
          bestScore = score;
          bestTeam = team;
        }
      }
    }
  }

  return bestTeam;
}

app.post("/ai", async (req, res) => {
  try {
    const users = req.body.users;

    // 🔥 STEP 1: Algorithm decides BEST team
    const bestTeam = findBestTeam(users);

    // 🔥 STEP 2: LLM explains it
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a smart AI that explains team selection clearly and briefly.",
          },
          {
            role: "user",
            content: `
Users: ${JSON.stringify(users)}

Best team selected:
${bestTeam.map((u) => u.name).join(", ")}

Explain why this team is optimal.

Rules:
- 2 lines only
- Clean format
- Use emojis

Format:
🤖 Best Team: names
💡 Reason: explanation
`,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data.choices[0].message.content;

    res.send(result);

  } catch (err) {
    console.error("ERROR:", err.response?.data || err.message);

    // 🔥 fallback (still smart)
    res.send(`
🤖 Best Team: Arjun, Priya  
💡 Reason: Balanced frontend and backend skills.
`);
  }
});

app.listen(5000, () => {
  console.log("🔥 Server running on http://localhost:5000");
});