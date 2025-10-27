// Proxy para encaminhar /api/* para um backend externo definido por env.
// Defina em Vercel a variável UPSTREAM_API_BASE, ex.: https://api.seudominio.com

const upstreamBase = process.env.UPSTREAM_API_BASE || 'http://localhost:8080';

function joinURL(base, pathWithQuery) {
  const baseNoSlash = base.replace(/\/$/, '');
  if (pathWithQuery.startsWith('/')) return baseNoSlash + pathWithQuery;
  return baseNoSlash + '/' + pathWithQuery;
}

function getPathWithQuery(req) {
  // req.url inclui já "/api/..."; removemos o prefixo /api
  const url = req.url || '';
  return url.replace(/^\/api/, '') || '/';
}

async function bufferBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  try {
    const pathWithQuery = getPathWithQuery(req);
    const targetUrl = joinURL(upstreamBase, pathWithQuery);

    const headers = { ...req.headers };
    delete headers.host;
    // Vercel/Node 18 tem fetch global
    const init = { method: req.method, headers };
    if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
      const buf = await bufferBody(req);
      init.body = buf;
    }

    const upstreamRes = await fetch(targetUrl, init);
    res.statusCode = upstreamRes.status;
    upstreamRes.headers.forEach((v, k) => {
      // Evitar problemas de cabeçalhos proibidos
      if (k.toLowerCase() === 'content-encoding') return;
      if (k.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(k, v);
    });
    const arrayBuf = await upstreamRes.arrayBuffer();
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, code: 'proxy_error', message: String(err && err.message || err) }));
  }
};

