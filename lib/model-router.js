'use strict';

const crypto = require('crypto');

const PUBLIC_MODEL = 'mclain-cyber';
const PROVIDER_ID = 'orca-cyber';
const DEFAULT_UPSTREAM_MODEL = 'OrcaSAQ-2-27B-Uncensored';
const MAX_BODY_BYTES = 1024 * 1024;

function value(name) {
  return String(process.env[name] || '').trim();
}

function normalizeBaseUrl(raw) {
  const base = String(raw || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return /\/v1$/i.test(base) ? base : base + '/v1';
}

function gatewayConfigured() {
  return Boolean(value('MCLAIN_AI_GATEWAY_KEY'));
}

function providerConfigured() {
  return Boolean(normalizeBaseUrl(value('ORCA_BASE_URL')));
}

function bearerToken(req) {
  const header = String(req?.headers?.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return String(req?.headers?.['x-mclain-ai-key'] || '').trim();
}

function secureEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length || left.length === 0) return false;
  return crypto.timingSafeEqual(left, right);
}

function authorize(req) {
  const expected = value('MCLAIN_AI_GATEWAY_KEY');
  if (!expected) return { ok: false, status: 503, error: 'AI gateway is not configured' };
  if (!secureEqual(bearerToken(req), expected)) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }
  return { ok: true };
}

function upstreamHeaders() {
  const headers = {
    'content-type': 'application/json',
    'accept': 'application/json, text/event-stream'
  };
  const key = value('ORCA_API_KEY');
  if (key) headers.authorization = 'Bearer ' + key;
  return headers;
}

function resolveModel(requested) {
  const model = String(requested || PUBLIC_MODEL).trim();
  if (model !== PUBLIC_MODEL) {
    const err = new Error(`Unknown model alias: ${model}`);
    err.status = 400;
    throw err;
  }
  return value('ORCA_MODEL') || DEFAULT_UPSTREAM_MODEL;
}

const PASSTHROUGH_FIELDS = new Set([
  'messages', 'temperature', 'top_p', 'top_k', 'min_p',
  'max_tokens', 'max_completion_tokens', 'n', 'stream', 'stop',
  'presence_penalty', 'frequency_penalty', 'repeat_penalty',
  'response_format', 'seed', 'tools', 'tool_choice',
  'parallel_tool_calls', 'logprobs', 'top_logprobs', 'user'
]);

function buildChatBody(input) {
  const body = input && typeof input === 'object' ? input : {};
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    const err = new Error('messages must be a non-empty array');
    err.status = 400;
    throw err;
  }

  const out = { model: resolveModel(body.model) };
  for (const [key, val] of Object.entries(body)) {
    if (PASSTHROUGH_FIELDS.has(key) && val !== undefined) out[key] = val;
  }

  if (out.temperature === undefined) out.temperature = 1.0;
  if (out.top_p === undefined) out.top_p = 0.95;
  if (out.top_k === undefined) out.top_k = 20;
  return out;
}

function bodySize(input) {
  return Buffer.byteLength(JSON.stringify(input || {}), 'utf8');
}

function upstreamUrl(pathname) {
  const base = normalizeBaseUrl(value('ORCA_BASE_URL'));
  if (!base) {
    const err = new Error('Orca provider is not configured');
    err.status = 503;
    throw err;
  }
  return base + '/' + String(pathname || '').replace(/^\/+/, '');
}

async function chat(input, signal) {
  if (bodySize(input) > MAX_BODY_BYTES) {
    const err = new Error('Request body exceeds 1 MiB');
    err.status = 413;
    throw err;
  }
  return fetch(upstreamUrl('chat/completions'), {
    method: 'POST',
    headers: upstreamHeaders(),
    body: JSON.stringify(buildChatBody(input)),
    signal,
    redirect: 'manual'
  });
}

async function checkProvider(signal) {
  if (!providerConfigured()) return { ok: false, status: null, reason: 'not_configured' };
  try {
    const base = normalizeBaseUrl(value('ORCA_BASE_URL')).replace(/\/v1$/i, '');
    const response = await fetch(base + '/health', {
      method: 'GET',
      headers: upstreamHeaders(),
      signal,
      redirect: 'manual'
    });
    return { ok: response.ok, status: response.status, reason: response.ok ? 'ready' : 'upstream_error' };
  } catch (error) {
    return { ok: false, status: null, reason: 'unreachable', detail: error instanceof Error ? error.message : String(error) };
  }
}

function modelList() {
  return {
    object: 'list',
    data: [{
      id: PUBLIC_MODEL,
      object: 'model',
      created: 0,
      owned_by: 'mclain-systems',
      permission: [],
      root: PUBLIC_MODEL,
      parent: null
    }]
  };
}

function status() {
  return {
    gateway: 'mclain-ai-gateway',
    interface: 'openai-compatible',
    modelAliases: [PUBLIC_MODEL],
    provider: PROVIDER_ID,
    gatewayConfigured: gatewayConfigured(),
    providerConfigured: providerConfigured(),
    executionToolsAttached: false
  };
}

module.exports = {
  PUBLIC_MODEL,
  PROVIDER_ID,
  MAX_BODY_BYTES,
  authorize,
  chat,
  checkProvider,
  gatewayConfigured,
  providerConfigured,
  modelList,
  normalizeBaseUrl,
  status
};
