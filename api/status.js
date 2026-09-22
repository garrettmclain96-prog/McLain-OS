'use strict';

const pkg = require('../package.json');
const platform = require('../platform.json');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    app: platform.platform.name,
    repository: platform.platform.repository,
    version: pkg.version,
    role: platform.platform.role,
    controlPlane: true,
    sourceOfTruth: true,
    providerCount: platform.providers.length,
    productCount: platform.products.length,
    providers: platform.providers.map(({ id, name, role, endpoint }) => ({ id, name, role, endpoint }))
  });
};
