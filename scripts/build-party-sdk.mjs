// Bundles the pump.fun party SDK (launchpartyV4/packages/core/src/solana) for the browser:
//   node scripts/build-party-sdk.mjs   → assets/vendor/party-sdk.js
// It uses launchpartyV4's own esbuild and dependencies (@solana/web3.js, @solana/spl-token, buffer), and stamps the bundle
// with launchpartyV4's commit so a page can say which SDK it runs.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.resolve(here, '..'), lp = path.resolve(root, '../launchpartyV4');
const commit = execFileSync('git', ['-C', lp, 'rev-parse', '--short', 'HEAD']).toString().trim();
const dirty = execFileSync('git', ['-C', lp, 'status', '--porcelain', 'packages/core']).toString().trim() ? '+local' : '';
const out = path.join(root, 'assets/vendor/party-sdk.js');
execFileSync(path.join(lp, 'node_modules/.bin/esbuild'), [path.join(here, 'party-sdk.entry.ts'), '--bundle', '--format=esm', '--platform=browser',
  '--target=es2020', '--minify', '--legal-comments=none', '--define:global=globalThis', '--define:process.env.NODE_ENV="production"',
  '--inject:' + path.join(here, 'party-sdk.buffer.mjs'), '--outfile=' + out, '--log-level=warning'],
  { cwd: lp, stdio: 'inherit', env: { ...process.env, NODE_PATH: path.join(lp, 'node_modules') } });
const body = fs.readFileSync(out, 'utf8');
fs.writeFileSync(out, `/* pump.fun party SDK (@launchparty/core/solana) from launchpartyV4 ${commit}${dirty}, built by scripts/build-party-sdk.mjs. Don't edit. */\n` + body);
console.log('wrote', path.relative(root, out), (fs.statSync(out).size / 1024).toFixed(0) + ' KB', 'from launchpartyV4', commit + dirty);
