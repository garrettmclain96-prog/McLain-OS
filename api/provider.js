'use strict';

const platform = require('../platform.json');

module.exports = function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    schema: platform.schema,
    id: platform.platform.id,
    name: platform.platform.name,
    role: platform.platform.role,
    version: platform.platform.version,
    repository: platform.platform.repository,
    sourceOfTruth: true,
    capabilitiesRegistry: '/api/capabilities',
    status: '/api/status',
    providers: platform.providers.map(({ id, name, role, endpoint, boundary }) => ({
      id, name, role, endpoint, boundary
    })),
    products: platform.products
  });
};
