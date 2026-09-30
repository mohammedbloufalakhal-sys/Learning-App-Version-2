// Vercel serverless function: POST /api/ai  (GET /api/ai = health check)
// The API key is read from server-side environment variables and never sent to the browser.
const { readConfig, status, validate, complete } = require('../lib/providers.js');

module.exports = async function handler(req, res) {
  const cfg = readConfig(process.env);
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (origin && cfg.allowed.length && !cfg.allowed.includes(origin)) {
    return res.status(403).json({ ok: false, error: 'origin not allowed' });
  }
  if (req.method === 'GET') return res.status(200).json(status(cfg));
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const st = status(cfg);
  if (!st.ok) return res.status(503).json({ error: 'not configured' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const bad = validate(body);
  if (bad) return res.status(400).json({ error: bad });

  try {
    const text = await complete(cfg, { messages: body.messages, json: !!body.json, tier: body.tier });
    if (!text) return res.status(502).json({ error: 'empty' });
    return res.status(200).json({ text });
  } catch (e) {
    console.error('[fluent180] provider error:', e.message); // technical detail stays in server logs
    return res.status(502).json({ error: 'upstream' });
  }
};
