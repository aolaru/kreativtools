// Worker request metrics are private to the Cloudflare account. No request body is stored.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/click' || request.headers.get('Origin') !== 'https://kreativtools.com') {
      return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  },
};
