// Fluent180 front-end configuration. Contains NO secrets — safe to commit.
// aiEndpoint: where the app sends AI requests. The API key lives only on that server.
//   '/api/ai'                                  → Vercel deployment (this repo's api/ai.js)
//   'https://fluent180-ai.<you>.workers.dev'    → Cloudflare Worker (cloudflare/worker.js), e.g. for GitHub Pages
//   ''                                          → no AI server: the built-in engine is used
window.FLUENT180_CONFIG = {
  aiEndpoint: '/api/ai'
};
