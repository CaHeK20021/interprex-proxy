// Interprex Proxy — Vercel Edge Function
// Forwards OpenAI-compatible requests to Google Gemini API.
// Set GEMINI_API_KEY as a Vercel Environment Variable.

export const config = { runtime: 'edge' };

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/openai';

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'GEMINI_API_KEY is not configured on the server.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = new URL(request.url);

  // Strip /api prefix (Vercel routing) and optional /v1 prefix
  let path = url.pathname
    .replace(/^\/api/, '')
    .replace(/^\/v1/, '');
  if (!path || path === '/') path = '/';

  const targetUrl = `${GEMINI_BASE}${path}${url.search}`;

  // Build forwarded headers, skip hop-by-hop headers
  const skip = new Set(['host', 'connection', 'transfer-encoding', 'keep-alive', 'te', 'upgrade']);
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!skip.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  // Always use the server-side API key — the client never sends its own
  headers.set('Authorization', `Bearer ${apiKey}`);

  const body = (request.method !== 'GET' && request.method !== 'HEAD')
    ? request.body
    : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { message: String(err) } }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
