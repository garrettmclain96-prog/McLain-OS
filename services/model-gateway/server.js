#!/usr/bin/env node
'use strict';

const http = require('http');
const router = require('../../lib/model-router.js');

const PORT = Number(process.env.PORT || 10000);

function writeJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > router.MAX_BODY_BYTES) {
        const err = new Error('Request body exceeds 1 MiB');
        err.status = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const err = new Error('Invalid JSON body');
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function streamUpstream(upstream, res) {
  const headers = {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  };
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  res.writeHead(upstream.status, headers);

  if (!upstream.body) return res.end();
  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  try {
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/ai/health')) {
      const snapshot = router.status();
      if (url.searchParams.get('deep') !== '1') {
        return writeJson(res, snapshot.gatewayConfigured && snapshot.providerConfigured ? 200 : 503, snapshot);
      }

      const auth = router.authorize(req);
      if (!auth.ok) return writeJson(res, auth.status, { ...snapshot, ok: false, error: auth.error });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const providerHealth = await router.checkProvider(controller.signal);
        return writeJson(res, providerHealth.ok ? 200 : 503, { ...snapshot, providerHealth });
      } finally {
        clearTimeout(timer);
      }
    }

    if (req.method === 'GET' && url.pathname === '/v1/models') {
      const auth = router.authorize(req);
      if (!auth.ok) return writeJson(res, auth.status, { error: { message: auth.error, type: 'authentication_error' } });
      return writeJson(res, 200, router.modelList());
    }

    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      const auth = router.authorize(req);
      if (!auth.ok) return writeJson(res, auth.status, { error: { message: auth.error, type: 'authentication_error' } });

      const body = await readJson(req);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 300000);
      try {
        const upstream = await router.chat(body, controller.signal);
        return await streamUpstream(upstream, res);
      } finally {
        clearTimeout(timer);
      }
    }

    return writeJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    const status = aborted ? 504 : Number(error?.status || 500);
    return writeJson(res, status, {
      error: {
        message: aborted ? 'Model provider timed out' : (error?.message || 'Internal gateway error'),
        type: status < 500 ? 'invalid_request_error' : 'gateway_error'
      }
    });
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log('McLain AI Gateway listening on port ' + PORT);
});
