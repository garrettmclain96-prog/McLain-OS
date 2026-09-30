'use strict';

const router = require('../lib/model-router.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('cache-control', 'no-store');
  const snapshot = router.status();
  const deep = String(req.query?.deep || '') === '1';

  if (!deep) {
    return res.status(snapshot.gatewayConfigured && snapshot.providerConfigured ? 200 : 503).json(snapshot);
  }

  const auth = router.authorize(req);
  if (!auth.ok) return res.status(auth.status).json({ ...snapshot, ok: false, error: auth.error });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const provider = await router.checkProvider(controller.signal);
    return res.status(provider.ok ? 200 : 503).json({ ...snapshot, providerHealth: provider });
  } finally {
    clearTimeout(timer);
  }
};
