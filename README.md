# 青铜器守护·甲骨狼人杀 + 卡密门禁系统

本项目已集成卡密验证系统，每个卡密仅限一个设备使用。

## 文件说明

```
netlify/
└── functions/
    ├── verify-key.js   ← 验证接口（自动调用）
    └── admin-keys.js   ← 管理接口（生成/删除卡密）
public/
├── fingerprint.js     ← 设备指纹生成器
└── verify-ui.js       ← 验证弹窗界面
keys/
├── generate-keys.js    ← 本地卡密生成工具
└── keys.json.enc      ← 加密卡密库（本地备份）
netlify.toml           ← Netlify 构建配置
```

## 环境变量（在 Netlify 后台设置）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `KAMI_SECRET` | 加密密钥 | `xGk9sL!mK2NvQ...` |
| `KAMI_ADMIN_KEY` | 管理员密钥 | `admin-xxx` |
| `KAMI_KEYS` | 卡密列表（Base64 JSON） | `WyJLQU1JMjAyNCI...` |

## 本地生成卡密

```bash
cd keys
node generate-keys.js generate 10
```

会输出卡密的 Base64 编码，复制到 Netlify 后台更新 `KAMI_KEYS` 环境变量。

## API 接口

### 验证卡密
```
POST /.netlify/functions/verify-key
{ "key": "KAMI2024XXX", "deviceId": "xxx", "fingerprint": "xxx" }
```

### 管理接口
```bash
# 列出卡密
curl -X GET "?action=list" -d '{"adminKey":"你的管理员密钥"}'

# 生成新卡密
curl -X POST "?action=generate" -d '{"adminKey":"你的管理员密钥","count":10}'

# 删除卡密
curl -X POST "?action=delete" -d '{"adminKey":"你的管理员密钥","key":"KAMIXXX"}'
```

## 已生成卡密（测试用）

```
KAMILFKGEKFR
KAMINEHQMCLD
KAMIJLCQPGCB
KAMILFJRERJH
KAMIKGDNLQKQ
```

部署后请在 Netlify 后台将这些卡密设置为 `KAMI_KEYS` 环境变量。