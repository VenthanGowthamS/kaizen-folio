// Cloudflare Worker in front of Kaizen Folio.
// - kaizenfolio.com redirects to www.kaizenfolio.com
// - the app's static files (public/) are served from Cloudflare's edge: instant, never asleep
// - /api, /media and /buddy-pic (private data) are forwarded to ORIGIN, the Render service, with redirects rewritten back to www
// Static files carry the same security headers server.js sets, since they no longer pass through Express.
const PRIVATE = /^\/(api|media|buddy-pic)(\/|$)/;

const SECURITY_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; " +
    "style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'kaizenfolio.com') {
      url.hostname = 'www.kaizenfolio.com';
      return Response.redirect(url.toString(), 301);
    }
    return PRIVATE.test(url.pathname) ? proxy(request, env, url) : serveStatic(request, env);
  },
};

async function serveStatic(request, env) {
  const res = await env.ASSETS.fetch(request);
  const out = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.set(k, v);
  out.set('Accept-Ranges', 'bytes');

  // iPhone Safari will not play a video unless the server answers byte-range requests, and static assets here do not,
  // so slice the (small) video ourselves.
  const range = request.headers.get('Range');
  if (range && res.status === 200 && /^video\//.test(out.get('Content-Type') || '')) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;
    if (m && (m[1] || m[2])) {
      const start = m[1] === '' ? Math.max(size - Number(m[2]), 0) : Number(m[1]);
      const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
      if (start <= end && start < size) {
        out.set('Content-Range', `bytes ${start}-${end}/${size}`);
        out.set('Content-Length', String(end - start + 1));
        return new Response(buf.slice(start, end + 1), { status: 206, headers: out });
      }
      out.set('Content-Range', `bytes */${size}`);
      out.set('Content-Length', '0');
      return new Response(null, { status: 416, headers: out });
    }
    return new Response(buf, { status: 200, headers: out });
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

async function proxy(request, env, url) {
  const origin = new URL(env.ORIGIN);
  const target = new URL(url.pathname + url.search, origin);
  const headers = new Headers(request.headers);
  headers.delete('Host');
  headers.set('X-Forwarded-Host', url.hostname);
  headers.set('X-Forwarded-Proto', 'https');

  const res = await fetch(new Request(target, { method: request.method, headers, body: request.body, redirect: 'manual' }));

  const out = new Headers(res.headers);
  const location = out.get('Location');
  if (location) {
    const l = new URL(location, target);
    if (l.origin === origin.origin) { l.protocol = 'https:'; l.host = url.host; out.set('Location', l.toString()); }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}
