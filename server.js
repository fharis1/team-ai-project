const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔒 ENV variables
const API_KEY = process.env.API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// ======================
// 🚀 MONGODB CONNECTION
// ======================
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error:", err));

// ======================
// 🧠 USER MODEL
// ======================
const User = mongoose.model("User", {
  name: String,
  skills: [String],
});

// ======================
// 📥 ADD USER (SAVE TO DB)
// ======================
app.post("/add-user", async (req, res) => {
  try {
    const { name, skills } = req.body;

    const newUser = new User({
      name,
      skills,
    });

    await newUser.save();
    res.send("✅ User saved");

  } catch (err) {
    res.status(500).send("❌ Error saving user");
  }
});

// ======================
// 📤 GET USERS (FROM DB)
// ======================
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);

  } catch (err) {
    res.status(500).send("❌ Error fetching users");
  }
});

// ======================
// 🧠 LOGIC: BEST TEAM
// ======================
function findBestTeam(users) {
  if (users.length < 2) return [];

  let bestTeam = [];
  let bestScore = 0;

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      for (let k = j + 1; k < users.length; k++) {
        const team = [users[i], users[j], users[k]];

        const uniqueSkills = new Set(
          team.flatMap(u => u.skills.map(s => s.toLowerCase()))
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

// ======================
// 🤖 AI ROUTE
// ======================
app.post("/ai", async (req, res) => {
  try {
    // 🔥 Get users from DB (NOT frontend anymore)
    const users = await User.find();
    const project = req.body.project || "General project";

    const bestTeam = findBestTeam(users);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are a smart AI that explains team selection clearly.",
          },
          {
            role: "user",
            content: `
Users: ${JSON.stringify(users)}

Project:
${project}

Best Team:
${bestTeam.map(u => u.name).join(", ")}

Explain briefly.

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
    console.log("❌ AI Error:", err.response?.data || err.message);

    // fallback
    res.send(`
🤖 Best Team: Select based on skill diversity
💡 Reason: Balanced frontend + backend + versatility
`);
  }
});

// ======================
// 🚀 START SERVER
// ======================
app.listen(5000, () => {
  console.log("🔥 Server running on http://localhost:5000");
});