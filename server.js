const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔒 ENV VARIABLES
const API_KEY = process.env.API_KEY;
const MONGO_URI = process.env.MONGO_URI;

// =======================
// 🗄️ MongoDB Setup
// =======================
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

// Schema
const userSchema = new mongoose.Schema({
  name: String,
  skills: [String],
});

const User = mongoose.model("User", userSchema);

// =======================
// 🧠 Algorithm (CORE LOGIC)
// =======================
function findBestTeam(users) {
  if (users.length < 2) return users;

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

// =======================
// 👥 API ROUTES
// =======================

// ➕ Add user
app.post("/add-user", async (req, res) => {
  try {
    const { name, skills } = req.body;

    const newUser = new User({
      name,
      skills: skills.map((s) => s.toLowerCase()),
    });

    await newUser.save();

    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).send("Error saving user");
  }
});

// 📥 Get all users
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// =======================
// 🤖 AI ROUTE
// =======================
app.post("/ai", async (req, res) => {
  try {
    const users = await User.find();

    // 🔥 Algorithm decides team
    const bestTeam = findBestTeam(users);

    // 🔥 AI explains ONLY (controlled)
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a strict AI that only explains based on given data. No extra info.",
          },
          {
            role: "user",
            content: `
Users:
${JSON.stringify(users)}

Selected team:
${bestTeam.map((u) => u.name).join(", ")}

STRICT RULES:
- DO NOT create new names
- DO NOT assign roles
- ONLY use given users
- ONLY explain based on skills
- MAX 2 lines

FORMAT:

🤖 Best Team: ${bestTeam.map((u) => u.name).join(", ")}

💡 Reason: Short explanation based on skill coverage
`,
          },
        ],
        temperature: 0.3,
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
    console.log("AI ERROR:", err.response?.data || err.message);

    // fallback (still correct)
    const users = await User.find();
    const bestTeam = findBestTeam(users);

    res.send(`
🤖 Best Team: ${bestTeam.map((u) => u.name).join(", ")}

💡 Reason: Selected based on maximum unique skill coverage.
`);
  }
});

// =======================
// 🚀 START SERVER
// =======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});