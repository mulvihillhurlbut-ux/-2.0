/**
 * 卡密生成与本地管理工具
 * 运行: node keys/generate-keys.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_FILE = path.join(__dirname, 'keys.json.enc');
const SECRET = 'kami-secret-change-me-in-env'; // 生产环境请从环境变量读取

function encrypt(text) {
  const key = crypto.scryptSync(SECRET, 'kami-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(text, 'utf8', 'hex');
  enc += cipher.final('hex');
  return iv.toString('hex') + ':' + enc;
}

function decrypt(encrypted) {
  const [ivHex, enc] = encrypted.split(':');
  const key = crypto.scryptSync(SECRET, 'kami-salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let dec = decipher.update(enc, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return JSON.parse(dec);
}

function load() {
  if (fs.existsSync(KEYS_FILE)) {
    return decrypt(fs.readFileSync(KEYS_FILE, 'utf8'));
  }
  return {};
}

function save(data) {
  fs.writeFileSync(KEYS_FILE, encrypt(JSON.stringify(data, null, 2)), 'utf8');
}

function generateKey(prefix = 'KAMI') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const random = crypto.randomBytes(8).toString('hex');
  const part1 = Array.from(random.slice(0, 4), c => chars[parseInt(c, 16) % chars.length]).join('');
  const part2 = Array.from(random.slice(4, 8), c => chars[parseInt(c, 16) % chars.length]).join('');
  return `${prefix}${part1}${part2}`;
}

const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'generate' || cmd === 'gen') {
  const count = parseInt(args[1]) || 1;
  const prefix = args[2] || 'KAMI';
  const store = load();
  const newKeys = [];
  for (let i = 0; i < count; i++) {
    let key;
    do {
      key = generateKey(prefix);
    } while (store[key]);
    store[key] = { used: false, deviceId: null, createdAt: Date.now() };
    newKeys.push(key);
  }
  save(store);
  console.log(`✅ 生成了 ${count} 个新卡密:`);
  newKeys.forEach(k => console.log(`  ${k}`));
} else if (cmd === 'list' || cmd === 'ls') {
  const store = load();
  const entries = Object.entries(store);
  if (entries.length === 0) {
    console.log('暂无卡密');
    return;
  }
  console.log(`共 ${entries.length} 个卡密:\n`);
  entries.forEach(([key, info]) => {
    const status = info.used ? '❌ 已使用' : '✅ 可用';
    const device = info.deviceId ? ` → ${info.deviceId}` : '';
    console.log(`  ${key}  ${status}${device}`);
  });
} else if (cmd === 'delete' || cmd === 'del') {
  const key = args[1];
  if (!key) { console.log('用法: node generate-keys.js delete <卡密>'); return; }
  const store = load();
  if (!store[key]) { console.log('卡密不存在'); return; }
  delete store[key];
  save(store);
  console.log(`已删除: ${key}`);
} else if (cmd === 'clear-used') {
  const store = load();
  Object.keys(store).forEach(k => {
    store[k] = { ...store[k], used: false, deviceId: null, usedAt: null };
  });
  save(store);
  console.log('已重置所有卡密为未使用状态');
} else {
  console.log(`
卡密管理工具

用法:
  node generate-keys.js generate [数量] [前缀]   生成新卡密
  node generate-keys.js list                      列出所有卡密
  node generate-keys.js delete <卡密>            删除指定卡密
  node generate-keys.js clear-used              重置所有卡密为未使用

示例:
  node generate-keys.js generate 10              生成10个 KAMI 开头的卡密
  node generate-keys.js generate 5 TEST         生成5个 TEST 开头的卡密
  node generate-keys.js list                     查看所有卡密
  `);
}