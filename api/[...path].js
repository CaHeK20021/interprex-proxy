// Interprex Proxy — Vercel Edge Function
//
// Zero-config: просто задеплой и вставь URL в Interprex.
// Провайдер (Gemini / OpenAI / Claude) определяется автоматически по запросу.
//
// Опционально: задай переменную API_KEY в настройках Vercel,
// чтобы ключ хранился на сервере, а не передавался из приложения.

export const config = { runtime: 'edge' };

function detectProvider(request, path) {
  const headers = request.headers;

  const targetHost = (
    headers.get('x-forwarded-host') ||
    headers.get('x-api-host') ||
    headers.get('host') ||
    ''
  ).toLowerCase();
  const targetHostName = targetHost.split(':')[0].trim();

  // 1. Host header signals (as requested)
  if (targetHostName === 'generativelanguage.googleapis.com') {
    return 'gemini';
  }
  if (targetHostName === 'api.anthropic.com') {
    return 'claude';
  }
  if (targetHostName === 'api.openai.com') {
    return 'openai';
  }
  if (targetHostName.endsWith('.openai.azure.com')) {
    return 'azure';
  }

  // 2. Fallback to path / header detection
  // Gemini: по пути /v1beta/ или по заголовку x-goog-api-key
  if (path.startsWith('/v1beta/') || headers.has('x-goog-api-key')) {
    return 'gemini';
  }

  // Claude: по заголовку anthropic-version или x-api-key без Authorization
  if (headers.has('anthropic-version') || (headers.has('x-api-key') && !headers.has('authorization'))) {
    return 'claude';
  }

  // OpenAI: всё остальное (Authorization: Bearer ...)
  return 'openai';
}

function buildTargetUrl(provider, path, search, targetHost) {
  if (provider === 'gemini') {
    return `https://generativelanguage.googleapis.com${path}${search}`;
  }
  if (provider === 'claude') {
    return `https://api.anthropic.com${path}${search}`;
  }
  if (provider === 'azure') {
    return `https://${targetHost}${path}${search}`;
  }
  // openai
  return `https://api.openai.com${path}${search}`;
}

function applyServerKey(headers, provider, apiKey) {
  if (!apiKey) return; // нет ключа на сервере — берем из запроса

  if (provider === 'gemini') {
    headers.set('x-goog-api-key', apiKey);
    headers.set('authorization', `Bearer ${apiKey}`);
  } else if (provider === 'claude') {
    headers.set('x-api-key', apiKey);
    headers.set('anthropic-version', '2023-06-01');
    headers.delete('authorization');
  } else if (provider === 'azure') {
    headers.set('api-key', apiKey);
    headers.delete('authorization');
  } else {
    headers.set('authorization', `Bearer ${apiKey}`);
  }
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url  = new URL(request.url);
  // Убираем /api и /v1 префикс — Vercel пишет /api/..., приложение шлет /v1/...
  const path = url.pathname.replace(/^\/api/, '').replace(/^\/v1/, '') || '/';

  const provider = detectProvider(request, path);
  const apiKey   = process.env.API_KEY || ''; // если задан на Vercel — используем его

  const targetHost = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('x-api-host') ||
    request.headers.get('host') ||
    ''
  ).toLowerCase();

  const targetUrl = buildTargetUrl(provider, path, url.search, targetHost);

  // Копируем заголовки, пропуская служебные
  const skip = new Set(['host', 'connection', 'transfer-encoding', 'keep-alive', 'te', 'upgrade']);
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    if (!skip.has(k.toLowerCase())) headers.set(k, v);
  }

  // Перезаписываем ключ авторизации если задан на сервере
  applyServerKey(headers, provider, apiKey);

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
