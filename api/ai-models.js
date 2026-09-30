'use strict';

const router = require('../lib/model-router.js');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed', type: 'invalid_request_error' } });
  }
  const auth = router.authorize(req);
  if (!auth.ok) return res.status(auth.status).json({ error: { message: auth.error, type: 'authentication_error' } });

  res.setHeader('cache-control', 'no-store');
  return res.status(200).json(router.modelList());
};
