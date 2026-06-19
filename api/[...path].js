// Interprex Proxy — Vercel Function (Node.js runtime, регион зафиксирован в vercel.json)
//
// Zero-config: задеплой и вставь URL в Interprex.
// Прозрачно форвардит запросы к крупным AI-провайдерам, чтобы обойти
// региональные блокировки. Поддерживает мультипоток и несколько ключей: прокси
// stateless, ключ едет В КАЖДОМ запросе (в заголовке) и пересылается как есть —
// поэтому N потоков с N разными ключами реально уходят с N разными ключами, и
// failover в приложении работает.
//
// Какого провайдера форвардить, решается в таком порядке (см. resolveTarget):
//   1. заголовок  x-provider: openrouter|gemini|openai|claude|deepseek|...
//   2. сегмент пути  /openrouter/...  /gemini/...  (paste {proxy}/openrouter)
//   3. заголовок host / x-api-host  (известный хост → провайдер; иначе verbatim)
//   4. эвристика по пути/заголовкам (/v1beta, x-goog-api-key, anthropic-version)
//   5. иначе — openai
//
// Опционально: переменная API_KEY в настройках Vercel перезапишет ключ из
// запроса серверным. ⚠️ С ней все клиентские ключи схлопнутся в один — НЕ
// задавай её, если пользуешься ротацией/несколькими ключами.

// Раньше runtime был 'edge': Edge-функция исполняется в ближайшем к клиенту
// PoP, который Vercel выбирает динамически — для пользователей из РФ/СНГ это
// нередко регион, который AI-провайдер (особенно Gemini) считает
// неподдерживаемым ("User location is not supported"), и результат рандомный:
// то работает, то нет. Node.js runtime + явный "regions" в vercel.json решают
// это так же, как в vercel-main: запрос всегда уходит из одного и того же,
// заведомо разрешённого региона (US). Сама функция (Request → Response) не
// меняется — Node.js runtime на Vercel поддерживает тот же Web API сигнатуры.

// Upstream базы по провайдеру. Каждая база УЖЕ несёт префикс пути провайдера
// (напр. у OpenRouter — /api/v1), чтобы `base + срезанный суб-путь клиента` дал
// точный upstream-URL. Gemini — исключение: база это голый хост, т.к. путь
// клиента уже содержит /v1beta/...
const UPSTREAM = {
  gemini:     'https://generativelanguage.googleapis.com',
  openai:     'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  claude:     'https://api.anthropic.com/v1',
  anthropic:  'https://api.anthropic.com/v1',   // алиас claude
  deepseek:   'https://api.deepseek.com/v1',
  mistral:    'https://api.mistral.ai/v1',
  groq:       'https://api.groq.com/openai/v1',
  together:   'https://api.together.xyz/v1',
  xai:        'https://api.x.ai/v1',
  fireworks:  'https://api.fireworks.ai/inference/v1',
};

// Известный upstream-хост → провайдер (для маршрутизации по host-заголовку).
const HOST_PROVIDER = {
  'generativelanguage.googleapis.com': 'gemini',
  'api.anthropic.com': 'claude',
  'api.openai.com': 'openai',
  'openrouter.ai': 'openrouter',
  'api.deepseek.com': 'deepseek',
  'api.mistral.ai': 'mistral',
  'api.groq.com': 'groq',
  'api.together.xyz': 'together',
  'api.x.ai': 'xai',
  'api.fireworks.ai': 'fireworks',
};

// Семейство аутентификации провайдера — как ставить серверный ключ (если задан).
function authFamily(provider) {
  if (provider === 'gemini') return 'gemini';
  if (provider === 'claude' || provider === 'anthropic') return 'claude';
  if (provider === 'azure') return 'azure';
  return 'bearer'; // openai / openrouter / deepseek / mistral / groq / ...
}

// Срезает ОДИН ведущий /v1, но не трогает /v1beta (граница сегмента).
function stripV1(p) {
  return p.replace(/^\/v1(?=\/|$)/, '') || '/';
}

// Решает, куда форвардить. Возвращает { base, provider, verbatim }.
//   verbatim=true → путь клиента уходит как есть (без среза /v1); для azure и
//   неизвестных явно заданных хостов.
function resolveTarget(request, path) {
  const h = request.headers;

  // 1. Явный заголовок x-provider — самый надёжный (его шлёт клиент Interprex).
  const xprov = (h.get('x-provider') || '').toLowerCase().trim();
  if (UPSTREAM[xprov]) return { base: UPSTREAM[xprov], provider: xprov, verbatim: false };

  // 3. host / x-api-host.
  const rawHost = (h.get('x-api-host') || h.get('x-forwarded-host') || h.get('host') || '')
    .toLowerCase().split(':')[0].trim();
  if (rawHost) {
    const p = HOST_PROVIDER[rawHost];
    if (p) return { base: UPSTREAM[p], provider: p, verbatim: false };
    if (rawHost.endsWith('.openai.azure.com')) {
      return { base: `https://${rawHost}`, provider: 'azure', verbatim: true };
    }
    // Неизвестный, но ЯВНО заданный хост (x-api-host / x-forwarded-host) — общий
    // escape-hatch: форвардим verbatim, путь клиента должен быть полным.
    if (h.get('x-api-host') || h.get('x-forwarded-host')) {
      return { base: `https://${rawHost}`, provider: 'generic', verbatim: true };
    }
  }

  // 4. Эвристика по пути/заголовкам.
  if (path.startsWith('/v1beta/') || h.has('x-goog-api-key')) {
    return { base: UPSTREAM.gemini, provider: 'gemini', verbatim: false };
  }
  if (h.has('anthropic-version') || (h.has('x-api-key') && !h.has('authorization'))) {
    return { base: UPSTREAM.claude, provider: 'claude', verbatim: false };
  }

  // 5. По умолчанию — openai.
  return { base: UPSTREAM.openai, provider: 'openai', verbatim: false };
}

function applyServerKey(headers, provider, apiKey) {
  if (!apiKey) return; // нет серверного ключа — берём из запроса
  const fam = authFamily(provider);
  if (fam === 'gemini') {
    headers.set('x-goog-api-key', apiKey);
    headers.set('authorization', `Bearer ${apiKey}`);
  } else if (fam === 'claude') {
    headers.set('x-api-key', apiKey);
    if (!headers.has('anthropic-version')) headers.set('anthropic-version', '2023-06-01');
    headers.delete('authorization');
  } else if (fam === 'azure') {
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

  const url = new URL(request.url);

  // Снимаем монтирование Vercel (/api) — функция живёт под /api/[...path].
  let path = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';

  // 2. Провайдер сегментом пути: {proxy}/openrouter/... → consume сегмент.
  const seg = path.match(/^\/([^/]+)(\/.*|)$/);
  let forced = null;
  if (seg && UPSTREAM[seg[1].toLowerCase()]) {
    forced = seg[1].toLowerCase();
    path = seg[2] || '/';
  }

  const target = forced
    ? { base: UPSTREAM[forced], provider: forced, verbatim: false }
    : resolveTarget(request, path);

  const subPath = target.verbatim ? path : stripV1(path);
  const targetUrl = `${target.base}${subPath}${url.search}`;

  // Whitelist заголовков для форвардинга — только то, что реально нужно upstream.
  // Остальное (origin, referer, cookie, content-length и пр.) сбрасываем, чтобы
  // избежать проблем с CORS, кэшированием и mismatch на стороне провайдера.
  const allowed = new Set([
    'accept', 'accept-encoding', 'accept-language',
    'authorization', 'api-key', 'x-api-key', 'x-goog-api-key',
    'anthropic-version', 'content-type', 'user-agent',
  ]);
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const kl = k.toLowerCase();
    if (allowed.has(kl)) headers.set(k, v);
  }

  // Серверный ключ (если задан на Vercel) перезапишет клиентский.
  applyServerKey(headers, target.provider, process.env.API_KEY || '');

  const body = (request.method !== 'GET' && request.method !== 'HEAD')
    ? request.body : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      // Нужно для стриминга тела запроса (fetch в Node.js тоже на undici).
      duplex: body ? 'half' : undefined,
    });
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
