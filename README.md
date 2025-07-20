# Suspicion Island

A mystery deduction game where you uncover the identity of "The Shadow One" among a group of NPCs.

### Features
- Procedurally generated suspects, clues, and alibis via GPT
- Action point-based exploration
- Note-taking system
- Logic-based accusation system
- Backend powered by OpenAI

### Run locally

1. Clone this repo
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file:

```
OPENAI_API_KEY=your_key_here
```

4. Start the backend server:

```bash
node server.js
```

5. Open `index.html` with Live Server (VS Code recommended)

---

### Hosted API Setup (Optional)
You can deploy the backend to Railway and plug in your OpenAI key.
