// Interprex Proxy — Universal Vercel Edge Function
// Proxies requests to ANY OpenAI-compatible AI API.
//
// Required environment variables in Vercel:
//   TARGET_BASE_URL  — upstream API base, e.g. https://generativelanguage.googleapis.com/v1beta/openai
//   API_KEY          — your API key for that service

export const config = { runtime: 'edge' };

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  const targetBase = (process.env.TARGET_BASE_URL || '').replace(/\/$/, '');
  const apiKey     = process.env.API_KEY || '';

  if (!targetBase) {
    return jsonError(500, 'TARGET_BASE_URL environment variable is not set on the server.');
  }
  if (!apiKey) {
    return jsonError(500, 'API_KEY environment variable is not set on the server.');
  }

  const url  = new URL(request.url);
  // Strip /api prefix (Vercel routing) and optional /v1 prefix
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/v1/, '') || '/';
  const targetUrl = `${targetBase}${path}${url.search}`;

  // Forward headers, skip hop-by-hop
  const skip = new Set(['host', 'connection', 'transfer-encoding', 'keep-alive', 'te', 'upgrade']);
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    if (!skip.has(k.toLowerCase())) headers.set(k, v);
  }
  headers.set('Authorization', `Bearer ${apiKey}`);

  const body = (request.method !== 'GET' && request.method !== 'HEAD')
    ? request.body : undefined;

  try {
    const upstream = await fetch(targetUrl, { method: request.method, headers, body });
    const resHeaders = new Headers(upstream.headers);
    Object.entries(corsHeaders()).forEach(([k, v]) => resHeaders.set(k, v));
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    return jsonError(502, String(err));
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

function jsonError(status, message) {
  return new Response(
    JSON.stringify({ error: { message } }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
  );
}
