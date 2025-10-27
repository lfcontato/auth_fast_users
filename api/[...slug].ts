import type { VercelRequest, VercelResponse } from '@vercel/node';

const upstreamBase = process.env.END_POINT_API || 'http://localhost:8080';

function joinURL(base: string, pathWithQuery: string) {
  const baseNoSlash = base.replace(/\/$/, '');
  return pathWithQuery.startsWith('/') ? baseNoSlash + pathWithQuery : baseNoSlash + '/' + pathWithQuery;
}

function getPathWithQuery(req: VercelRequest) {
  // req.url inclui "/api/..."; removemos o prefixo /api
  const url = req.url || '';
  return url.replace(/^\/api/, '') || '/';
}

async function bufferBody(req: VercelRequest): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    (req as any).on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
    (req as any).on('end', () => resolve(Buffer.concat(chunks)));
    (req as any).on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const pathWithQuery = getPathWithQuery(req);
    const targetUrl = joinURL(upstreamBase, pathWithQuery);

    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === 'string') headers[k] = v;
    }
    delete headers['host'];

    const init: RequestInit = { method: req.method, headers } as any;
    const body = await bufferBody(req);
    if (body) (init as any).body = body;

    const upstreamRes = await fetch(targetUrl, init);
    res.status(upstreamRes.status);
    upstreamRes.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'content-encoding') return;
      if (k.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(k, v);
    });
    const ab = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(ab));
  } catch (err: any) {
    res.status(502).json({ success: false, code: 'proxy_error', message: String(err?.message || err) });
  }
}

