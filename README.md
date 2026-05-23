# ZooWallet

跨链桌面钱包，支持 Ethereum、Bitcoin、Solana 及 EVM L2 网络。  
UI 基于 **MongoDB 设计系统**（`#001E2B` 深林黑 + `#00ED64` 荧光绿）。

![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131)
![Rust](https://img.shields.io/badge/Rust-Backend-DEA584)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 功能状态

| 模块 | 状态 | 说明 |
|------|------|------|
| ETH 钱包核心 | ✅ | 创建/导入/HD 派生/观察/改密 |
| ETH 转账 | ✅ | EIP-1559，Gas 三档，MAX 按钮 |
| ERC-20 代币 | ✅ | 余额查询 + 转账 + 自定义代币 |
| 交易历史 | ✅ | Etherscan txlist，分页，加速/取消 |
| 防盲签 | ✅ | Calldata 解码预览 |
| SQLite 缓存 | ✅ | WAL 模式，TTL 15–300s |
| RPC 故障切换 | ✅ | ETH ×5 节点，EMA 延迟评分 |
| 自动锁屏 | ✅ | 可配置 idle timer |
| 余额隐藏/价格 | ✅ | USD 换算 + 24h 涨跌 |
| MongoDB UI | ✅ | DESIGN.md 令牌，全量重设计 |
| Bitcoin | 🔜 Phase 4 | — |
| Solana | 🔜 Phase 5 | — |
| EVM L2 | 🔜 Phase 6 | — |
| 价格服务/地址簿 | 🔜 Phase 8 | — |

---

## 安全特性

- **AES-256-GCM** 加密存储，PBKDF2-SHA512 **310,000** 轮
- **zeroize** — 所有密钥/助记词用完立即清零
- **原子写入** — wallet-store.json 先写 `.tmp` 再 `rename`
- **暴力破解防护** — 5 次失败锁 60 秒，持久化跨重启
- **防盲签** — Calldata 解码（transfer/approve/transferFrom/swap）
- **自动锁屏** — idle timer，锁后清空内存余额/代币
- **私钥自动清除** — 导出后 30 秒进度条倒计时
- **观察钱包隔离** — watch 类型所有签名命令返回错误
- **CSP 严格白名单** — 无 `unsafe-inline` / `unsafe-eval`

---

## 技术栈

```
桌面框架:  Tauri v2
前端:      React 18 + TypeScript 5.7 + Vite 6
样式:      Tailwind CSS 3.4（MongoDB 色彩系统）
状态:      Zustand 5
后端:      Rust stable
区块链:    alloy 0.15 (ETH)
HD 钱包:   bip39 + coins-bip32 0.13
加密:      aes-gcm + pbkdf2 + sha2 + zeroize
缓存:      rusqlite 0.31 (SQLite WAL, bundled)
HTTP:      reqwest 0.12 (rustls, 连接池)
包管理:    yarn classic v1
```

---

## 项目结构

```
zoowallet/
├── DESIGN.md                    # MongoDB 设计系统令牌规范（YAML + Markdown）
├── Makefile                     # 工作流入口
├── package.json / vite.config.ts / tailwind.config.js / tsconfig.json
│
├── src-tauri/                   # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json          # CSP 白名单（5 ETH RPC + Etherscan + CoinGecko）
│   └── src/
│       ├── commands/
│       │   ├── wallet.rs        # 11 命令（create/derive/import/export/verify/change）
│       │   └── eth.rs           # 13 命令（balance/send/gas/token/history/preview…）
│       ├── services/
│       │   ├── crypto.rs        # AES-256-GCM + PBKDF2-SHA512 + zeroize
│       │   ├── storage.rs       # 原子写入 + RateLimiter (5次/60s)
│       │   ├── rpc.rs           # 多节点故障切换 + EMA 评分（Phase 7）
│       │   └── db.rs            # SQLite WAL 缓存 + 后台清理（Phase 7）
│       └── models/mod.rs
│
├── src/                         # React 前端
│   ├── App.tsx                  # 路由 + idle timer + 价格轮询
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   └── ui/                  # Button / Input / Modal / CopyButton / Toast / PasswordModal
│   ├── pages/
│   │   ├── Welcome.tsx          # 欢迎页（MongoDB 荧光绿 logo）
│   │   ├── CreateWallet.tsx     # 3步：助记词→验证→密码
│   │   ├── ImportWallet.tsx     # 助记词/私钥/观察钱包三模式
│   │   ├── Unlock.tsx           # 密码解锁 + 倒计时
│   │   ├── Dashboard.tsx        # 余额+代币+USD+账户切换
│   │   ├── Send.tsx             # Gas三档+代币+预览+MAX
│   │   ├── Receive.tsx          # QR mockup + 一键复制
│   │   ├── History.tsx          # 历史列表 + 加速/取消
│   │   ├── Security.tsx         # 派生/导出/改密（限流倒计时）
│   │   ├── Settings.tsx         # 自动锁屏 + 余额隐藏
│   │   └── SendSuccess.tsx      # 成功页 + Etherscan 链接
│   ├── store/
│   │   ├── walletStore.ts       # 账户/余额/代币/隐藏/lock()
│   │   ├── uiStore.ts           # 路由/通知/autoLockMinutes/idle
│   │   └── priceStore.ts        # ETH/BTC/SOL 价格（Phase 8 Rust 未实现）
│   ├── lib/ipc.ts               # safeInvoke + IpcError + zoo 命名空间
│   └── types/index.ts
│
└── docs/
    ├── API.md                   # 完整 Tauri 命令 API 文档（54 命令）
    └── ARCHITECTURE.md          # 系统架构文档
```

---

## 快速开始

### 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | 20+ |
| Rust | latest stable |
| Yarn | classic v1 |

**Linux 额外依赖：**
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev
```

### Makefile 命令

```bash
make install      # yarn install + cargo fetch
make dev          # Vite HMR + Tauri 窗口
make dev-web      # 仅 Vite 前端
make build        # 生产构建
make build-debug  # 调试构建
make check        # cargo check + tsc --noEmit
make clippy       # Rust lint
make fmt          # cargo fmt
make clean        # 清理构建产物
make db-path      # 显示 cache.db 路径
make db-clear     # 删除缓存数据库
make info         # 工具链版本
make loc          # 代码行数统计
make help         # 帮助
```

---

## 开发路线图

| Phase | 主题 | 状态 |
|-------|------|------|
| 0 | 项目骨架 / Makefile | ✅ 完成（PR #2）|
| 1 | ETH MVP（创建 + 余额 + 转账） | ✅ 完成（PR #2）|
| 2 | 钱包管理完整化 | ✅ 完成（PR #4）|
| 3 | ETH 完整化 | ✅ 完成（PR #4）|
| 7 | 缓存与韧性 | ✅ 完成（PR #5）|
| — | MVP 生产级缺口修复 | ✅ 完成（PR #6）|
| — | MongoDB UI 全量重设计 | ✅ 完成（PR #7）|
| 4 | Bitcoin P2WPKH | 🔜 待开发 |
| 5 | Solana + SPL Token-2022 | 🔜 待开发 |
| 6 | 通用 EVM L2 动态注册 | 🔜 待开发 |
| 8 | 价格服务/地址簿/自定义代币 | 🔜 待开发 |

详细任务清单见 [`.kiro/specs/`](./.kiro/specs/)。

---

## 数据存储

```
{app_data}/com.zoowallet.app/
├── wallet-store.json      # AES-GCM 加密（原子写入）
│   ├── passwordVerify     # 密码验证令牌
│   ├── mnemonic           # 加密助记词
│   ├── eth_keys{}         # 每账户独立加密 ETH 私钥
│   ├── accounts[]         # 账户元数据（明文）
│   └── rateLimit          # 暴力破解计数器
└── cache.db               # SQLite WAL
    ├── balances            TTL 30s
    ├── token_balances      TTL 60s
    ├── tx_history          TTL 120s（仅第1页）
    ├── gas_cache           TTL 15s
    ├── price_cache         TTL 60s
    ├── price_chart         TTL 300s
    ├── evm_chains          永久
    └── kv_cache            可变
```

---

## 已注册 Tauri 命令（24 个）

**wallet（11）：** `generate_mnemonic` · `create_from_mnemonic` · `verify_password` · `has_wallet` · `get_accounts` · `derive_next_account` · `import_private_key` · `import_watch_wallet` · `export_mnemonic` · `get_private_key` · `change_password`

**eth（13）：** `eth_get_balance` · `eth_send_transaction` · `eth_get_gas_options` · `eth_get_token_balances` · `eth_send_token` · `eth_decode_calldata` · `eth_preview_transaction` · `eth_query_token_info` · `eth_get_custom_token_balance` · `eth_get_history` · `eth_estimate_gas` · `eth_speed_up_transaction` · `eth_cancel_transaction`

完整参数/返回值文档见 [`docs/API.md`](./docs/API.md)。

---

## 许可证

MIT © sandswind
