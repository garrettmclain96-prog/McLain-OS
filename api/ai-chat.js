'use strict';

const router = require('../lib/model-router.js');

function json(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  return res.status(status).send(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return json(res, 405, { error: { message: 'Method not allowed', type: 'invalid_request_error' } });
  }

  const auth = router.authorize(req);
  if (!auth.ok) return json(res, auth.status, { error: { message: auth.error, type: 'authentication_error' } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300000);

  try {
    const upstream = await router.chat(req.body || {}, controller.signal);
    res.statusCode = upstream.status;
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);

    if (!upstream.body) return res.end();

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    return res.end();
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    const status = aborted ? 504 : Number(error?.status || 502);
    return json(res, status, {
      error: {
        message: aborted ? 'Model provider timed out' : (error?.message || 'Model provider unavailable'),
        type: status < 500 ? 'invalid_request_error' : 'upstream_error'
      }
    });
  } finally {
    clearTimeout(timer);
  }
};
