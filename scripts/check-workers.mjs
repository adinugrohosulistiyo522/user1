import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const must = [
  'public/index.html', 'public/admin.html', 'public/top100-admin.html', 'public/top100-renderer.html',
  'src/index.js', 'src/api-proxy.js', 'wrangler.jsonc', 'public/.assetsignore', 'Code.gs', 'public/_headers'
];
for (const f of must) assert.ok(existsSync(f), `File wajib tidak ada: ${f}`);

for (const f of ['src/index.js', 'src/api-proxy.js']) {
  const syntax = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  assert.equal(syntax.status, 0, `Sintaks ${f} salah:\n${syntax.stderr}`);
}
const gasSyntax = spawnSync(process.execPath, ['--check'], { input: readFileSync('Code.gs', 'utf8'), encoding: 'utf8' });
assert.equal(gasSyntax.status, 0, `Sintaks Code.gs salah:\n${gasSyntax.stderr}`);

const api = readFileSync('src/api-proxy.js', 'utf8');
const allowed = new Set([...api.split('const SCRIPT_URL_RE')[0].matchAll(/'([A-Za-z0-9_]+)'/g)].map(m => m[1]));
for (const f of ['public/index.html', 'public/admin.html']) {
  const html = readFileSync(f, 'utf8');
  assert.ok(html.includes("fetch('/api'"), `${f} harus memanggil fetch('/api')`);
  assert.ok(!html.includes('/.netlify/functions'), `${f} masih memanggil jalur Netlify`);
  const used = new Set([...html.matchAll(/API\(\s*['"]([A-Za-z]+)['"]/g)].map(m => m[1]));
  for (const a of used) assert.ok(allowed.has(a), `${f} memakai action "${a}" yang tidak ada di allowlist src/api-proxy.js`);
}
for (const f of ['public/index.html','public/admin.html','public/top100-admin.html','public/top100-renderer.html']) {
  const html = readFileSync(f,'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    const source = match[2].trim(); if (!source) continue;
    const check = spawnSync(process.execPath, ['--check'], { input: source, encoding: 'utf8' });
    assert.equal(check.status, 0, `Inline JavaScript salah dalam ${f}:\n${check.stderr}`);
  }
}
const topAdmin = readFileSync('public/top100-admin.html','utf8');
const templateSection = topAdmin.slice(topAdmin.indexOf('const templates=['));
const templateRows = [...templateSection.matchAll(/\{id:(\d+),name:(['"])(.*?)\2,[^\n]*?category:(['"])(.*?)\4/g)];
assert.equal(templateRows.length,100,`Katalog UI harus punya 100 template, ditemukan ${templateRows.length}`);
const ids = templateRows.map(m => Number(m[1]));
assert.equal(new Set(ids).size,100,'ID template harus unik');
assert.deepEqual([...ids].sort((a,b)=>a-b),Array.from({length:100},(_,i)=>i+1),'ID template harus lengkap 1–100');
const counts = new Map();
for (const m of templateRows) counts.set(m[5],(counts.get(m[5])||0)+1);
const expected = {'Affiliator':20,'Content Creator':10,'UMKM / Small Business':10,'Edukasi / Pendidikan':10,'Marketing / Agency':10,'Usaha Kuliner':10,'Komunitas dan Organisasi':10,'Entertainment':10,'Jasa Profesional':10};
assert.deepEqual(Object.fromEntries([...counts].sort()),Object.fromEntries(Object.entries(expected).sort()),'Jumlah template per kategori tidak sesuai');

const config = readFileSync('wrangler.jsonc', 'utf8');
assert.ok(/"name"\s*:\s*"kliktiva-top100-customer-001"/.test(config), 'wrangler.jsonc harus memiliki nama Worker');
assert.ok(config.includes('"main": "src/index.js"'), 'Entry point Worker tidak benar');
assert.ok(config.includes('"directory": "./public/"') && config.includes('"binding": "ASSETS"'), 'Assets binding tidak benar');
assert.ok(config.includes('"/api"') && config.includes('"/api/*"') && config.includes('"/admin"'), 'run_worker_first harus mencakup API dan route Admin');
assert.ok(!config.includes('"/admin/"'), 'Route /admin/ redundan dengan /admin/* dan harus dihapus agar Wrangler deploy tidak gagal');
assert.ok(config.includes('"/admin.html"'), 'run_worker_first harus mencakup path Admin HTML');
assert.ok(config.includes('"/top100-admin"'), 'run_worker_first harus mencakup /top100-admin (URL bersih)');
const compat = (config.match(/"compatibility_date"\s*:\s*"(\d{4}-\d{2}-\d{2})"/) || [])[1];
assert.ok(compat, 'compatibility_date wajib ada');
assert.ok(Date.parse(compat + 'T00:00:00Z') <= Date.now() - 3 * 86400000, 'compatibility_date tidak boleh hari ini/masa depan (UTC) — gunakan tanggal beberapa hari/bulan lalu agar deploy tidak ditolak');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
assert.ok(pkg.scripts && pkg.scripts.build, 'package.json wajib punya script build (no-op) agar build command Cloudflare tidak gagal');
const entry = readFileSync('src/index.js', 'utf8');
assert.ok(!entry.includes("'/admin.html' : null"), 'Jangan rewrite /admin ke /admin.html: memicu redirect loop pada Workers Assets');
assert.ok(!existsSync('functions/api.js'), 'Folder functions Pages tidak boleh menjadi runtime API pada paket Workers');
assert.ok(api.includes("'getTop100PublicData'")&&api.includes("'adminGetTop100State'")&&api.includes("'adminSaveTop100State'"),'Action Top100 wajib ada di allowlist');
console.log('OK: paket Cloudflare Workers lolos pemeriksaan statis.');

const backend = readFileSync('Code.gs','utf8');
const handlerStart = backend.indexOf('const handlers = {');
assert.ok(handlerStart >= 0, 'Code.gs tidak memiliki action handler map');
const handlerEnd = backend.indexOf('\n    };', handlerStart);
assert.ok(handlerEnd > handlerStart, 'Map handler Code.gs tidak tertutup');
const handlerText = backend.slice(handlerStart, handlerEnd);
const backendActions = new Set([...handlerText.matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map(m => m[1]));
const allAllowed = [...api.split('const SCRIPT_URL_RE')[0].matchAll(/'([A-Za-z0-9_]+)'/g)].map(m => m[1]);
for (const a of allAllowed) assert.ok(backendActions.has(a), `Action allowlist ${a} tidak ada di handler Code.gs`);
assert.ok(backend.includes("LICENSE_API_PROPERTY: 'LICENSE_API_URL'"), 'Code.gs harus memakai LICENSE_API_URL global');
