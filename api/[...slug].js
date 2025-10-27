// Proxy /api/* -> END_POINT_API/*
const upstreamBase = process.env.END_POINT_API || 'http://localhost:8080';

function joinURL(base, pathWithQuery) {
  const baseNoSlash = (base || '').replace(/\/$/, '');
  return pathWithQuery.startsWith('/') ? baseNoSlash + pathWithQuery : baseNoSlash + '/' + pathWithQuery;
}

function getPathWithQuery(req) {
  // Preserve /api prefix because upstream expects it (e.g., /api/user/auth/token)
  const url = req.url || '';
  return url || '/';
}

async function bufferBody(req) {
  if ((req.method || 'GET') === 'GET' || req.method === 'HEAD') return undefined;
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
    const init = { method: req.method, headers };
    const body = await bufferBody(req);
    if (body) init.body = body;

    const upstreamRes = await fetch(targetUrl, init);
    res.statusCode = upstreamRes.status;
    upstreamRes.headers.forEach((v, k) => {
      const key = String(k).toLowerCase();
      if (key === 'content-encoding' || key === 'transfer-encoding') return;
      res.setHeader(k, v);
    });
    const ab = await upstreamRes.arrayBuffer();
    res.end(Buffer.from(ab));
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, code: 'proxy_error', message: String(err && err.message || err) }));
  }
};
