// Cloudflare Worker version of the AI proxy — use this if you host the app on GitHub Pages.
// Deploy: copy this file AND lib/providers.js content into one Worker (see README), then set
// secrets:  npx wrangler secret put AI_API_KEY   and vars AI_PROVIDER, AI_MODEL, ALLOWED_ORIGINS.
import providers from '../lib/providers.js';
const { readConfig, status, validate, complete } = providers;

function cors(origin, cfg) {
  const allow = !cfg.allowed.length ? '*' : (cfg.allowed.includes(origin) ? origin : cfg.allowed[0]);
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Cache-Control': 'no-store', 'content-type': 'application/json' };
}

export default {
  async fetch(request, env) {
    const cfg = readConfig(env);
    const origin = request.headers.get('origin') || '';
    const h = cors(origin, cfg);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (origin && cfg.allowed.length && !cfg.allowed.includes(origin)) return new Response(JSON.stringify({ ok: false, error: 'origin not allowed' }), { status: 403, headers: h });
    if (request.method === 'GET') return new Response(JSON.stringify(status(cfg)), { headers: h });
    if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405, headers: h });
    if (!status(cfg).ok) return new Response(JSON.stringify({ error: 'not configured' }), { status: 503, headers: h });
    let body = null; try { body = await request.json(); } catch (e) {}
    const bad = validate(body);
    if (bad) return new Response(JSON.stringify({ error: bad }), { status: 400, headers: h });
    try {
      const text = await complete(cfg, { messages: body.messages, json: !!body.json, tier: body.tier });
      return new Response(JSON.stringify({ text }), { headers: h });
    } catch (e) {
      console.error('[fluent180] provider error:', e.message);
      return new Response(JSON.stringify({ error: 'upstream' }), { status: 502, headers: h });
    }
  }
};
