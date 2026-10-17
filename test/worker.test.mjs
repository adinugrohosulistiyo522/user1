import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest } from '../src/index.js';

const URL_OK = 'https://script.google.com/macros/s/ABC123/exec';
const makePost = body => new Request('https://x.test/api', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) });
const withFetch = async (impl, fn) => { const old = globalThis.fetch; globalThis.fetch = impl; try { return await fn(); } finally { globalThis.fetch = old; } };

test('GET /api reports configuration without leaking URL', async () => {
  const r = await handleRequest(new Request('https://x.test/api'), { APPS_SCRIPT_URL: URL_OK });
  const j = await r.json();
  assert.equal(j.appsScriptUrlConfigured, true);
  assert.ok(!JSON.stringify(j).includes('ABC123'));
  const r2 = await handleRequest(new Request('https://x.test/api'), {});
  assert.equal((await r2.json()).appsScriptUrlConfigured, false);
});

test('PUT /api is rejected with 405', async () => {
  const r = await handleRequest(new Request('https://x.test/api', {method:'PUT'}), {});
  assert.equal(r.status, 405);
});

test('missing APPS_SCRIPT_URL returns clear error', async () => {
  const r = await handleRequest(makePost({action:'getPublicData',args:[]}), {});
  assert.equal(r.status, 500);
  assert.equal((await r.json()).code, 'APPS_SCRIPT_URL_NOT_CONFIGURED');
});

test('invalid JSON returns 400', async () => {
  const r = await handleRequest(new Request('https://x.test/api',{method:'POST',body:'{bad'}), {APPS_SCRIPT_URL:URL_OK});
  assert.equal(r.status, 400);
});

test('unknown action returns 400', async () => {
  const r = await handleRequest(makePost({action:'removeEverything',args:[]}), {APPS_SCRIPT_URL:URL_OK});
  assert.equal((await r.json()).code, 'ACTION_NOT_ALLOWED');
});

test('valid action proxies JSON body to Apps Script', async () => {
  let seen;
  const r = await withFetch(async (url, init) => {
    seen = {url,init};
    return new Response(JSON.stringify({ok:true,data:{hello:'world'}}), {status:200});
  }, () => handleRequest(makePost({action:'getPublicData',args:[1]}), {APPS_SCRIPT_URL:URL_OK}));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), {ok:true,data:{hello:'world'}});
  assert.equal(seen.url, URL_OK);
  assert.equal(seen.init.method, 'POST');
  assert.deepEqual(JSON.parse(seen.init.body), {action:'getPublicData',args:[1]});
});

test('HTML upstream response returns 502', async () => {
  const r = await withFetch(async () => new Response('<html>login</html>', {status:200}), () => handleRequest(makePost({action:'getPublicData',args:[]}), {APPS_SCRIPT_URL:URL_OK}));
  assert.equal(r.status, 502);
  assert.equal((await r.json()).code, 'APPS_SCRIPT_BAD_RESPONSE');
});

test('backend ok:false returns clear backend code', async () => {
  const r = await withFetch(async () => new Response(JSON.stringify({ok:false,code:'LICENSE_BLOCKED',error:'Lisensi nonaktif'}), {status:200}), () => handleRequest(makePost({action:'getPublicData',args:[]}), {APPS_SCRIPT_URL:URL_OK}));
  assert.equal(r.status, 400);
  assert.equal((await r.json()).code, 'LICENSE_BLOCKED');
});

test('network failure maps to APPS_SCRIPT_UNREACHABLE', async () => {
  const r = await withFetch(async () => { throw new Error('boom'); }, () => handleRequest(makePost({action:'getPublicData',args:[]}), {APPS_SCRIPT_URL:URL_OK}));
  assert.equal((await r.json()).code, 'APPS_SCRIPT_UNREACHABLE');
});

test('clean /admin route asks assets for /admin (no .html rewrite) and adds noindex', async () => {
  const seen = [];
  const env = { ASSETS: { fetch: async request => { const u = new URL(request.url); seen.push(u.pathname + u.search); return new Response('<html>admin</html>',{status:200,headers:{'content-type':'text/html'}}); } } };
  const r = await handleRequest(new Request('https://x.test/admin?from=nav'), env);
  assert.deepEqual(seen, ['/admin?from=nav']);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('/admin/ with trailing slash is served as the admin page', async () => {
  const seen = [];
  const env = { ASSETS: { fetch: async request => { seen.push(new URL(request.url).pathname); return new Response('ok',{status:200}); } } };
  const r = await handleRequest(new Request('https://x.test/admin/'), env);
  assert.equal(r.status, 200);
  assert.deepEqual(seen, ['/admin']);
});

test('/admin falls back to /admin.html only if clean URL is 404', async () => {
  const seen = [];
  const env = { ASSETS: { fetch: async request => { const p = new URL(request.url).pathname; seen.push(p); return p === '/admin.html' ? new Response('ok',{status:200}) : new Response('nf',{status:404}); } } };
  const r = await handleRequest(new Request('https://x.test/admin'), env);
  assert.equal(r.status, 200);
  assert.deepEqual(seen, ['/admin', '/admin.html']);
});

test('/admin.html passes the asset-layer redirect through (no redirect loop)', async () => {
  const seen = [];
  const env = { ASSETS: { fetch: async request => { const p = new URL(request.url).pathname; seen.push(p); return new Response(null,{status:307,headers:{location:'/admin'}}); } } };
  const r = await handleRequest(new Request('https://x.test/admin.html'), env);
  assert.equal(r.status, 307);
  assert.equal(r.headers.get('location'), '/admin');
  assert.deepEqual(seen, ['/admin.html']);
});

test('clean /top100-admin is served by the Worker with noindex', async () => {
  const seen = [];
  const env = { ASSETS: { fetch: async request => { seen.push(new URL(request.url).pathname); return new Response('ok',{status:200}); } } };
  const r = await handleRequest(new Request('https://x.test/top100-admin'), env);
  assert.equal(r.status, 200);
  assert.deepEqual(seen, ['/top100-admin']);
  assert.equal(r.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('POST to admin route is rejected with 405', async () => {
  const r = await handleRequest(new Request('https://x.test/admin', {method:'POST'}), { ASSETS: { fetch: async () => new Response('x') } });
  assert.equal(r.status, 405);
});

test('static asset requests are delegated to ASSETS binding', async () => {
  const env = { ASSETS: { fetch: async request => new Response('served:' + new URL(request.url).pathname, {status:200}) } };
  const r = await handleRequest(new Request('https://x.test/top100-renderer.html'), env);
  assert.equal(await r.text(), 'served:/top100-renderer.html');
});
