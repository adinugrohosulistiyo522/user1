import { onRequestGet, onRequestPost, onRequest } from './api-proxy.js';

/**
 * Kliktiva Top100 Cloudflare Worker.
 * Serves static assets from ./public and runs the /api proxy as Worker code.
 * Set APPS_SCRIPT_URL in Workers & Pages > this Worker > Settings > Variables and Secrets.
 */
function withSecurityHeaders(response, { admin = false } = {}) {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (admin) headers.set('x-robots-tag', 'noindex, nofollow');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function assetRequestFor(request, pathname) {
  const target = new URL(request.url);
  target.pathname = pathname;
  return new Request(target.toString(), {
    method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: request.headers,
    redirect: 'manual'
  });
}

function assetsMissing() {
  return new Response(JSON.stringify({
    ok: false,
    code: 'ASSETS_BINDING_MISSING',
    error: 'Binding ASSETS tidak tersedia. Periksa wrangler.jsonc dan deploy ulang Worker.'
  }), { status: 500, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function hasAssets(env) {
  return !!(env && env.ASSETS && typeof env.ASSETS.fetch === 'function');
}

async function serveAsset(request, env, admin = false) {
  if (!hasAssets(env)) return assetsMissing();
  const response = await env.ASSETS.fetch(request);
  return withSecurityHeaders(response, { admin });
}

// Halaman admin "bersih" (/admin, /top100-admin): minta asset lewat URL bersih agar Workers Assets
// (html_handling default) menyajikan file .html dengan status 200 tanpa redirect.
// Jika asset layer tidak memetakan URL bersih (404), coba file .html langsung.
async function serveCleanAdminPage(request, env, cleanPath, filePath) {
  if (!hasAssets(env)) return assetsMissing();
  let response = await env.ASSETS.fetch(assetRequestFor(request, cleanPath));
  if (response.status === 404) response = await env.ASSETS.fetch(assetRequestFor(request, filePath));
  return withSecurityHeaders(response, { admin: true });
}

export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/api' || path === '/api/') {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const response = await onRequestGet({ request, env, ctx });
      if (request.method === 'HEAD') return new Response(null, { status: response.status, headers: response.headers });
      return response;
    }
    if (request.method === 'POST') return onRequestPost({ request, env, ctx });
    return onRequest({ request, env, ctx });
  }

  if (path === '/admin' || path === '/admin/' || path === '/admin.html' || path === '/top100-admin' || path === '/top100-admin.html') {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(JSON.stringify({ ok: false, code: 'METHOD_NOT_ALLOWED', error: 'Gunakan GET untuk membuka Admin.' }), {
        status: 405,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
      });
    }
    if (path === '/admin' || path === '/admin/') return serveCleanAdminPage(request, env, '/admin', '/admin.html');
    if (path === '/top100-admin') return serveCleanAdminPage(request, env, '/top100-admin', '/top100-admin.html');
    // /admin.html dan /top100-admin.html: biarkan asset layer mengarahkan (redirect) ke URL bersih.
    return serveAsset(assetRequestFor(request, path), env, true);
  }

  // These routes should reach the Worker only if run_worker_first is configured.
  // Other assets are served directly by Cloudflare's asset layer for efficiency.
  return serveAsset(request, env);
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
