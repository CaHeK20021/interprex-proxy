// Interprex Proxy — Vercel Edge Function
//
// Environment variables (set in Vercel dashboard):
//   PROVIDER  — one of: gemini (default), openai, claude
//   API_KEY   — your API key for the chosen provider

export const config = { runtime: 'edge' };

const PROVIDERS = {
  gemini: {
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    setAuth: (headers, key) => {
      headers.set('Authorization', `Bearer ${key}`);
      headers.set('x-goog-api-key', key);
    },
  },
  openai: {
    base: 'https://api.openai.com/v1',
    setAuth: (headers, key) => headers.set('Authorization', `Bearer ${key}`),
  },
  claude: {
    base: 'https://api.anthropic.com',
    setAuth: (headers, key) => {
      headers.set('x-api-key', key);
      headers.set('anthropic-version', '2023-06-01');
      headers.delete('Authorization');
    },
  },
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const providerName = (process.env.PROVIDER || 'gemini').toLowerCase();
  const apiKey       = process.env.API_KEY || '';
  const provider     = PROVIDERS[providerName];

  if (!provider) {
    return jsonError(500,
      `Unknown PROVIDER "${providerName}". Valid values: gemini, openai, claude`);
  }
  if (!apiKey) {
    return jsonError(500, 'API_KEY environment variable is not set on the server.');
  }

  const url  = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/v1/, '') || '/';
  
  let targetUrl;
  if (providerName === 'gemini' && path.startsWith('/v1beta/')) {
    targetUrl = `https://generativelanguage.googleapis.com${path}${url.search}`;
  } else {
    targetUrl = `${provider.base}${path}${url.search}`;
  }

  const skip = new Set(['host', 'connection', 'transfer-encoding', 'keep-alive', 'te', 'upgrade']);
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    if (!skip.has(k.toLowerCase())) headers.set(k, v);
  }
  provider.setAuth(headers, apiKey);

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
