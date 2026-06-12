/**
 * 卡密管理接口（管理员专用）
 * GET  /.netlify/functions/admin-keys?action=list
 * POST /.netlify/functions/admin-keys?action=generate
 * POST /.netlify/functions/admin-keys?action=delete
 *
 * 需要 adminKey 验证，值 = KAMI_ADMIN_KEY 环境变量
 */
const crypto = require('crypto');

const ADMIN_KEY = process.env.KAMI_ADMIN_KEY;
const SECRET = process.env.KAMI_SECRET || 'kami-default-secret';

function getKeyStore() {
  try {
    const encoded = process.env.KAMI_KEYS;
    if (!encoded) return [];
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch (e) {
    return [];
  }
}

function generateKey(prefix = 'KAMI') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = crypto.randomBytes(8).toString('hex');
  const part1 = Array.from(random.slice(0, 4), c => chars[parseInt(c, 16) % chars.length]).join('');
  const part2 = Array.from(random.slice(4, 8), c => chars[parseInt(c, 16) % chars.length]).join('');
  return `${prefix}${part1}${part2}`;
}

function verifyAdmin(key) {
  return key === ADMIN_KEY;
}

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {}

  const adminKey = body.adminKey || event.queryStringParameters?.adminKey;
  if (!ADMIN_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: '管理员未配置' }) };
  }
  if (!verifyAdmin(adminKey)) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: '管理员密钥错误' }) };
  }

  const action = event.queryStringParameters?.action || (event.httpMethod === 'GET' ? 'list' : '');

  if (action === 'list') {
    const keys = getKeyStore();
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, list: keys }) };
  }

  if (action === 'generate') {
    const count = Math.min(Math.max(parseInt(body.count) || 1, 1), 50);
    const prefix = body.prefix || 'KAMI';
    const existing = getKeyStore();
    const newKeys = [];
    for (let i = 0; i < count; i++) {
      let key;
      do {
        key = generateKey(prefix);
      } while (existing.includes(key) || newKeys.includes(key));
      newKeys.push(key);
    }
    const allKeys = [...existing, ...newKeys];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        keys: newKeys,
        total: allKeys.length,
        note: '请在 Netlify 后台更新 KAMI_KEYS 环境变量',
      }),
    };
  }

  if (action === 'delete') {
    const { key } = body;
    if (!key) return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: '缺少 key' }) };
    const existing = getKeyStore();
    const keyUpper = key.toUpperCase();
    if (!existing.includes(keyUpper)) {
      return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: '卡密不存在' }) };
    }
    const filtered = existing.filter(k => k !== keyUpper);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        note: '请在 Netlify 后台更新 KAMI_KEYS 环境变量',
      }),
    };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: '未知操作' }) };
};