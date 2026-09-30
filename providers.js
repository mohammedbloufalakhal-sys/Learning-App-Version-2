// Provider abstraction shared by the Vercel function and the Cloudflare Worker.
// Switching provider = changing environment variables only.
const DEFAULT_MODELS = {
  anthropic: { main: 'claude-sonnet-5-5', fast: 'claude-haiku-4-5-20251001' },
  openai: { main: null, fast: null },   // set AI_MODEL / AI_MODEL_FAST, e.g. your preferred OpenAI chat model
  gemini: { main: null, fast: null }    // set AI_MODEL / AI_MODEL_FAST, e.g. your preferred Gemini model
};
const MAX_CHARS = 120000;

function readConfig(env) {
  const provider = String(env.AI_PROVIDER || 'anthropic').toLowerCase();
  const d = DEFAULT_MODELS[provider] || {};
  return {
    provider,
    key: env.AI_API_KEY || '',
    model: env.AI_MODEL || d.main || null,
    modelFast: env.AI_MODEL_FAST || env.AI_MODEL || d.fast || d.main || null,
    allowed: String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
  };
}

function status(cfg) {
  if (!DEFAULT_MODELS[cfg.provider]) return { ok: false, provider: cfg.provider, error: 'unknown AI_PROVIDER (use anthropic, openai or gemini)' };
  if (!cfg.key) return { ok: false, provider: cfg.provider, error: 'AI_API_KEY is not set' };
  if (!cfg.model) return { ok: false, provider: cfg.provider, error: 'AI_MODEL is not set' };
  return { ok: true, provider: cfg.provider, model: cfg.model };
}

function validate(body) {
  if (!body || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > 60) return 'messages must be a non-empty array';
  let total = 0;
  for (const m of body.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content) return 'invalid message';
    total += m.content.length;
  }
  if (total > MAX_CHARS) return 'input too large';
  if (body.messages[0].role !== 'user' || body.messages[body.messages.length - 1].role !== 'user') return 'conversation must start and end with a user message';
  return null;
}

function merge(messages) {
  const out = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.content;
    else out.push({ role: m.role, content: m.content });
  }
  return out;
}

async function complete(cfg, { messages, json, tier }, fetchImpl) {
  const f = fetchImpl || fetch;
  const model = tier === 'quick' ? cfg.modelFast : cfg.model;
  const msgs = merge(messages);
  const temperature = json ? 0.2 : 0.8;
  let r, data;
  if (cfg.provider === 'anthropic') {
    r = await f('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 4000, temperature, messages: msgs })
    });
    data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('anthropic ' + r.status + ' ' + JSON.stringify(data).slice(0, 300));
    return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('').trim();
  }
  if (cfg.provider === 'openai') {
    r = await f('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify({ model, temperature, messages: msgs })
    });
    data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('openai ' + r.status + ' ' + JSON.stringify(data).slice(0, 300));
    return String(data.choices?.[0]?.message?.content || '').trim();
  }
  if (cfg.provider === 'gemini') {
    r = await f('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': cfg.key },
      body: JSON.stringify({
        contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        generationConfig: Object.assign({ temperature }, json ? { responseMimeType: 'application/json' } : {})
      })
    });
    data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('gemini ' + r.status + ' ' + JSON.stringify(data).slice(0, 300));
    return (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  }
  throw new Error('unknown provider ' + cfg.provider);
}

module.exports = { readConfig, status, validate, complete };
