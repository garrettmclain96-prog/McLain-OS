#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8787);
const ECC_BASE_URL = String(process.env.ECC_BASE_URL || 'https://ecc-kappa-hazel.vercel.app').replace(/\/+$/, '');
const ALLOWED = new Set(['profile','repo-status','activepieces-frontdesk-issue','run','packet']);\nconst pkg = require('./package.json');\nconst platform = require('./platform.json');\nconst { CAPABILITIES } = require('./api/capabilities.js');
const MAX_BODY = 128 * 1024;

const TYPES = {
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json; charset=utf-8',
  '.svg':'image/svg+xml'
};

function send(res, code, body, type='text/plain; charset=utf-8') {
  res.writeHead(code, {'content-type':type,'x-content-type-options':'nosniff'});
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve,reject) => {
    let size=0; const chunks=[];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { reject(new Error('BODY_TOO_LARGE')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function proxy(req,res,url) {
  const name = url.pathname.slice('/api/'.length);
  if (!ALLOWED.has(name)) return send(res,404,JSON.stringify({ok:false,error:'Unknown McLain OS provider route'}),'application/json; charset=utf-8');

  const target = new URL(ECC_BASE_URL + '/api/' + name);
  url.searchParams.forEach((v,k)=>target.searchParams.append(k,v));
  const headers = {};
  for (const key of ['authorization','content-type','accept']) if (req.headers[key]) headers[key]=req.headers[key];
  const method = String(req.method || 'GET').toUpperCase();
  const options = {method,headers,redirect:'manual'};
  if (!['GET','HEAD'].includes(method)) options.body = await readBody(req);

  const upstream = await fetch(target, options);
  const body = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, {
    'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
    'cache-control':'no-store',
    'x-content-type-options':'nosniff'
  });
  res.end(body);
}

function serveStatic(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = path.resolve(ROOT, rel);
  if (!target.startsWith(ROOT)) return send(res,403,'Forbidden');
  fs.readFile(target,(err,data)=>{
    if (err) return send(res,404,'Not found');
    send(res,200,data,TYPES[path.extname(target)] || 'application/octet-stream');
  });
}

http.createServer(async (req,res)=>{
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  try {
    if (req.method === 'GET' && url.pathname === '/api/status') {
      return send(res,200,JSON.stringify({
        app: platform.platform.name,
        repository: platform.platform.repository,
        version: pkg.version,
        role: platform.platform.role,
        controlPlane: true,
        sourceOfTruth: true,
        providerCount: platform.providers.length,
        productCount: platform.products.length,
        providers: platform.providers.map(({ id, name, role, endpoint }) => ({ id, name, role, endpoint }))
      }),'application/json; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/capabilities') {
      return send(res,200,JSON.stringify({
        system: 'McLain OS',
        architecture: {
          controlPlane: 'McLain OS',
          physicalIntelligence: 'Aurora Core',
          engineeringRuntime: 'ECC',
          automationEngine: 'Activepieces',
          memorySpine: 'Mem0',
          syncEngine: 'Electric'
        },
        capabilities: CAPABILITIES
      }),'application/json; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/api/provider') {
      return send(res,200,JSON.stringify({
        schema: platform.schema,
        ...platform.platform,
        sourceOfTruth: true,
        providers: platform.providers,
        products: platform.products
      }),'application/json; charset=utf-8');
    }
    if (url.pathname.startsWith('/api/')) return await proxy(req,res,url);
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(res,url.pathname);
    send(res,405,'Method not allowed');
  } catch (error) {
    send(res,error.message==='BODY_TOO_LARGE'?413:502,JSON.stringify({ok:false,error:error.message || 'Proxy error'}),'application/json; charset=utf-8');
  }
}).listen(PORT,'0.0.0.0',()=>console.log('McLain OS running on http://0.0.0.0:' + PORT));
