// Cloudflare Worker in front of the Render service, so www.kaizenfolio.com works without a paid Render custom domain.
// - kaizenfolio.com redirects to www.kaizenfolio.com
// - everything else is forwarded to ORIGIN (the onrender.com address), redirects rewritten back to www
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'kaizenfolio.com') {
      url.hostname = 'www.kaizenfolio.com';
      return Response.redirect(url.toString(), 301);
    }

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
  },
};
