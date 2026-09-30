// Local development server: serves the app and /api/ai using your .env file.
// Run:  node dev-server.js   then open http://localhost:3000
const http = require('http'), fs = require('fs'), path = require('path');
try { for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; } } catch (e) {}
const handler = require('./api/ai.js');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/ai') {
    let raw = ''; req.on('data', c => raw += c); req.on('end', () => {
      req.body = raw ? (() => { try { return JSON.parse(raw); } catch (e) { return raw; } })() : null;
      res.status = c => { res.statusCode = c; return res; };
      res.json = o => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
      handler(req, res);
    }); return;
  }
  const file = path.join(__dirname, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname));
  if (!file.startsWith(__dirname) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Fluent180 running at http://localhost:' + (process.env.PORT || 3000)));
