// `npm run check`: syntax-check every function and the card script, and make sure embed.html points at real files.
// No build step and no test framework on purpose; this is the smoke test before a deploy.
const { readdirSync, readFileSync, existsSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

const root = join(__dirname, '..');
const files = [...readdirSync(join(root, 'api')).filter(f => f.endsWith('.js')).map(f => join('api', f)), 'assets/tweetpad.js', 'scripts/check.js'];
let failed = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', join(root, f)], { stdio: 'pipe' }); console.log('ok   ' + f); }
  catch (err) { failed++; console.log('FAIL ' + f + '\n' + String(err.stderr || err.message)); }
}
const html = readFileSync(join(root, 'embed.html'), 'utf8');
for (const ref of html.match(/(?:src|href)="(assets\/[^"]+)"/g) || []) {
  const path = ref.split('"')[1];
  if (existsSync(join(root, path))) console.log('ok   embed.html → ' + path);
  else { failed++; console.log('FAIL embed.html → ' + path + ' is missing'); }
}
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const js = readFileSync(join(root, 'assets/tweetpad.js'), 'utf8');
const missing = [...new Set([...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]))].filter(id => !ids.has(id));
if (missing.length) { failed++; console.log('FAIL tweetpad.js looks up ids that embed.html lacks: ' + missing.join(', ')); }
else console.log('ok   every $(id) in tweetpad.js exists in embed.html');
process.exit(failed ? 1 : 0);
