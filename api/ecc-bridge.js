'use strict';

const DEFAULT_ECC_BASE_URL = 'https://ecc-kappa-hazel.vercel.app';
const ALLOWED = new Set([
  'status',
  'profile',
  'capabilities',
  'repo-status',
  'activepieces-frontdesk-issue',
  'run',
  'packet'
]);

module.exports = async function handler(req, res) {
  const path = String(req.query?.path || '').replace(/^\/+/, '');
  if (!ALLOWED.has(path)) {
    return res.status(404).json({ ok: false, error: 'Unknown McLain OS provider route' });
  }

  const base = String(process.env.ECC_BASE_URL || DEFAULT_ECC_BASE_URL).replace(/\/+$/, '');
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === 'path') continue;
    if (Array.isArray(value)) value.forEach(item => query.append(key, String(item)));
    else if (value != null) query.set(key, String(value));
  }

  const url = base + '/api/' + path + (query.size ? '?' + query.toString() : '');
  const headers = {};
  for (const name of ['authorization', 'content-type', 'accept']) {
    if (req.headers?.[name]) headers[name] = req.headers[name];
  }

  const method = String(req.method || 'GET').toUpperCase();
  const options = { method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(method)) {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    if (!headers['content-type']) headers['content-type'] = 'application/json';
  }

  try {
    const upstream = await fetch(url, options);
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);
    res.setHeader('cache-control', 'no-store');
    const body = await upstream.text();
    res.status(upstream.status).send(body);
  } catch (error) {
    res.status(502).json({
      ok: false,
      error: 'ECC provider unavailable',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
};
