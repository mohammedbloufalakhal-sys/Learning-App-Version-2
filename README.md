# Fluent180 — AI English & Career Coach

A 180-day adaptive English coach for adult learners (A2–B1 → professional English and interview readiness).

**For the learner:** open the link → start today's task → learn, speak, write → get feedback and a score → improve.
No accounts, keys or settings to configure.

## How AI works (one central service)
All AI calls go through one service in `index.html` (`ai()` / `aiInit()`), which picks a provider automatically:

| Order | Provider | When | Needs a key? |
|---|---|---|---|
| 1 | Claude platform | App opened inside Claude | No |
| 2 | Your server (`/api/ai`) | App deployed with the server function | Only on the server |
| 3 | Built-in engine | Always available | No |

The built-in engine (`BI` in `index.html`) contains its own grammar bank, vocabulary lists, listening dialogues,
speaking and writing prompts, a conversation simulator, an interview simulator and automatic scoring
(grammar-pattern checks, length, linking words, tone, task coverage). If an AI call fails, the app falls back
to it automatically. No feature is ever blocked, and learners never see technical errors.

## Deploy (recommended: Vercel — one link, AI included)
1. Put this folder in a GitHub repository.
2. Go to vercel.com → **Add New → Project** → import the repository → **Deploy** (no build settings needed).
3. In the Vercel project: **Settings → Environment Variables**, add:
   - `AI_PROVIDER` = `anthropic`
   - `AI_API_KEY` = your key from console.anthropic.com
   - optional `ALLOWED_ORIGINS` = `https://your-project.vercel.app`
4. **Redeploy**. Share `https://your-project.vercel.app` with the learner.

To switch providers, change `AI_PROVIDER` to `openai` or `gemini`, set `AI_API_KEY` and `AI_MODEL`, and redeploy.
No code changes are needed.

### Alternative: GitHub Pages + Cloudflare Worker
GitHub Pages can't hold secrets, so on its own it runs with the built-in engine only.
To add AI there, deploy `cloudflare/worker.js`: run `cd cloudflare && npx wrangler deploy` and
`npx wrangler secret put AI_API_KEY`. Then set `aiEndpoint` in `config.js` to the worker URL.

### Local development
```
cp .env.example .env      # add AI_API_KEY
node dev-server.js        # open http://localhost:3000
```
Opening `index.html` directly as a file also works, using the built-in engine.

## Developer status page
Open the app URL with `#status` at the end (e.g. `https://your-project.vercel.app/#status`).
It shows the AI engine, speech, text-to-speech and storage, lets you test the AI, and can force the built-in engine.
It is not linked anywhere in the learner interface.

## Configuration in one place
- Front end: `config.js` (only the endpoint URL — no secrets).
- Server: environment variables documented in `.env.example`.

## Security notes
- Keys exist only in server environment variables. `.env` is git-ignored. Never commit a key.
- Anyone who has the site link can use it, and AI usage is billed to your key. Set a monthly spending
  limit with your AI provider and use `ALLOWED_ORIGINS`.

## Data
Progress is stored in the learner's browser (per device). **Settings → Download my data** exports a backup.

## Honest limits
- Built-in scoring is rule-based "quick feedback", less detailed than AI feedback, and capped at 88/100.
- Speaking uses the browser's speech recognition when the microphone is available (best in Chrome or Edge); otherwise answers are typed.
- Pronunciation is not scored yet. CEFR levels are estimates, not certificates.
- No user accounts yet: progress is tied to the device and browser.

## Roadmap
See `docs/BUILD_SPECIFICATION.md`.
