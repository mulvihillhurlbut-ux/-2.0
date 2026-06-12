/**
 * 卡密验证接口（Netlify Functions 版本）
 * POST /.netlify/functions/verify-key
 * Body: { key, fingerprint, deviceId }
 *
 * 卡密通过 KAMI_KEYS 环境变量传入（Base64 编码的 JSON 数组）
 * 格式：["KEY1","KEY2",...]
 */
const crypto = require('crypto');

// 从环境变量读取卡密库（Base64 编码）
function getKeyStore() {
  try {
    const encoded = process.env.KAMI_KEYS;
    if (!encoded) return {};
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch (e) {
    return {};
  }
}

// 内存中的卡密使用记录（函数冷启动会丢失，但每个卡密只能用一次）
// 持久化通过 KAMI_USED_KEYS 环境变量（每次调用会读写，Netlify 支持）
function getUsedKeys() {
  try {
    const encoded = process.env.KAMI_USED_KEYS;
    if (!encoded) return {};
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
  } catch (e) {
    return {};
  }
}

function saveUsedKeys(store) {
  // Netlify Functions 中无法持久写入环境变量
  // 所以我们只依赖内存存储，每个卡密只能用一次（函数实例级别）
  // 更好的方案是结合外部存储（如 FaunaDB、Upstash 等）
}

exports.handler = async function (event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: '仅支持 POST' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: '请求格式错误' }) };
  }

  const { key, fingerprint, deviceId } = body;
  if (!key || !deviceId) {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: '缺少参数' }) };
  }

  const allKeys = getKeyStore();
  const keyUpper = key.trim().toUpperCase();

  // 检查卡密是否存在
  if (!allKeys.includes(keyUpper)) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: '卡密无效' }) };
  }

  // 内存中追踪已使用的卡密（单次使用保证）
  // 注意：函数冷启动会清空，这是已知限制
  // 如需严格保证，建议配合外部 KV 存储
  const usedKeys = getUsedKeys();

  if (usedKeys[keyUpper]) {
    const record = usedKeys[keyUpper];
    if (record.deviceId !== deviceId) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: '此卡密已被其他设备使用' }) };
    }
    // 同一设备重复验证
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, message: '已验证' }) };
  }

  // 标记为已使用
  usedKeys[keyUpper] = {
    deviceId,
    fingerprint: fingerprint || null,
    usedAt: Date.now(),
  };

  // 将更新写回环境变量（Netlify 会拒绝写入，此处仅为完整性）
  // 实际持久化依赖外部存储，这里做单次使用保证
  process.env.KAMI_USED_KEYS = Buffer.from(JSON.stringify(usedKeys)).toString('base64');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, message: '验证成功' }),
  };
};