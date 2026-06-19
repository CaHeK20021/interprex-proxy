import express from 'express';
import { Readable } from 'stream';

const app = express();
const PORT = process.env.PORT || 7860;

// Cheap liveness/keep-alive endpoint — doesn't touch resolveTarget or any
// upstream provider, so it's safe to ping on a schedule to stop this Space
// from sleeping (free cpu-basic Spaces sleep after 48h idle, and the cold
// start on wake can eat the client's whole request timeout).
app.get(['/', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const UPSTREAM = {
  gemini:     'https://generativelanguage.googleapis.com',
  openai:     'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  claude:     'https://api.anthropic.com/v1',
  anthropic:  'https://api.anthropic.com/v1',
  deepseek:   'https://api.deepseek.com/v1',
  mistral:    'https://api.mistral.ai/v1',
  groq:       'https://api.groq.com/openai/v1',
  together:   'https://api.together.xyz/v1',
  xai:        'https://api.x.ai/v1',
  fireworks:  'https://api.fireworks.ai/inference/v1',
};

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

function authFamily(provider) {
  if (provider === 'gemini') return 'gemini';
  if (provider === 'claude' || provider === 'anthropic') return 'claude';
  if (provider === 'azure') return 'azure';
  return 'bearer';
}

function stripV1(p) {
  return p.replace(/^\/v1(?=\/|$)/, '') || '/';
}

function resolveTarget(reqHeaders, path) {
  const xprov = (reqHeaders.get('x-provider') || '').toLowerCase().trim();
  if (UPSTREAM[xprov]) return { base: UPSTREAM[xprov], provider: xprov, verbatim: false };

  // Header-based signals take priority over host-sniffing. A client sending
  // x-goog-api-key/anthropic-version clearly wants that provider — without
  // this check first, a request with no x-provider header could fall into
  // the generic host-sniffing branch below and, if x-forwarded-host happens
  // to equal this proxy's own public domain (e.g. on Hugging Face Spaces),
  // end up fetching itself in a loop instead of the actual upstream.
  if (path.startsWith('/v1beta/') || reqHeaders.has('x-goog-api-key')) {
    return { base: UPSTREAM.gemini, provider: 'gemini', verbatim: false };
  }
  if (reqHeaders.has('anthropic-version') || (reqHeaders.has('x-api-key') && !reqHeaders.has('authorization'))) {
    return { base: UPSTREAM.claude, provider: 'claude', verbatim: false };
  }

  const rawHost = (reqHeaders.get('x-api-host') || reqHeaders.get('x-forwarded-host') || reqHeaders.get('host') || '')
    .toLowerCase().split(':')[0].trim();
  if (rawHost) {
    const p = HOST_PROVIDER[rawHost];
    if (p) return { base: UPSTREAM[p], provider: p, verbatim: false };
    if (rawHost.endsWith('.openai.azure.com')) {
      return { base: `https://${rawHost}`, provider: 'azure', verbatim: true };
    }
    if (reqHeaders.get('x-api-host') || reqHeaders.get('x-forwarded-host')) {
      return { base: `https://${rawHost}`, provider: 'generic', verbatim: true };
    }
  }

  return { base: UPSTREAM.openai, provider: 'openai', verbatim: false };
}

function applyServerKey(headers, provider, apiKey) {
  if (!apiKey) return;
  const fam = authFamily(provider);
  // If the client already sent their OWN key for this auth family, keep it —
  // the server key is a fallback for clients that didn't supply one, not an
  // override. Without this, every user of this proxy silently uses the
  // server's key instead of their own (which is what was happening here).
  if (fam === 'gemini') {
    if (headers.has('x-goog-api-key') || headers.has('authorization')) return;
    headers.set('x-goog-api-key', apiKey);
    headers.set('authorization', `Bearer ${apiKey}`);
  } else if (fam === 'claude') {
    if (headers.has('x-api-key')) return;
    headers.set('x-api-key', apiKey);
    if (!headers.has('anthropic-version')) headers.set('anthropic-version', '2023-06-01');
    headers.delete('authorization');
  } else if (fam === 'azure') {
    if (headers.has('api-key')) return;
    headers.set('api-key', apiKey);
    headers.delete('authorization');
  } else {
    if (headers.has('authorization')) return;
    headers.set('authorization', `Bearer ${apiKey}`);
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

async function handleWebRequest(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const url = new URL(request.url);
  let path = url.pathname;

  const seg = path.match(/^\/([^/]+)(\/.*|)$/);
  let forced = null;
  if (seg && UPSTREAM[seg[1].toLowerCase()]) {
    forced = seg[1].toLowerCase();
    path = seg[2] || '/';
  }

  const target = forced
    ? { base: UPSTREAM[forced], provider: forced, verbatim: false }
    : resolveTarget(request.headers, path);

  const subPath = target.verbatim ? path : stripV1(path);
  const targetUrl = `${target.base}${subPath}${url.search}`;

  const allowed = new Set([
    'accept', 'accept-language',
    'authorization', 'api-key', 'x-api-key', 'x-goog-api-key',
    'anthropic-version', 'content-type', 'user-agent',
  ]);
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const kl = k.toLowerCase();
    if (allowed.has(kl)) headers.set(k, v);
  }

  applyServerKey(headers, target.provider, process.env.API_KEY || '');

  const body = (request.method !== 'GET' && request.method !== 'HEAD')
    ? request.body : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
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

app.use(express.raw({ type: '*/*', limit: '50mb' }));

app.all('*', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['host'] || `localhost:${PORT}`;
    const requestUrl = `${protocol}://${host}${req.originalUrl}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && req.body.length > 0) {
      body = req.body;
    }

    const webReq = new Request(requestUrl, {
      method: req.method,
      headers: headers,
      body: body,
      duplex: body ? 'half' : undefined
    });

    const webRes = await handleWebRequest(webReq);

    res.status(webRes.status);
    const isCompressed = webRes.headers.get('content-encoding');
    webRes.headers.forEach((value, key) => {
      const kl = key.toLowerCase();
      if (kl === 'content-length' && isCompressed) {
        return;
      }
      if (kl !== 'content-encoding' && kl !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    if (webRes.body) {
      Readable.fromWeb(webRes.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('Proxy Bridge Error:', err);
    res.status(502).json({ error: { message: String(err) } });
  }
});

app.listen(PORT, () => {
  console.log(`Interprex Proxy is running on port ${PORT}`);
});
