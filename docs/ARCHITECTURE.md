# ZooWallet 系统架构文档

> 版本：v2.0.0 | 框架：Tauri v2 | 后端：Rust | 前端：React 18 + TypeScript  
> UI 设计系统：MongoDB（`#001E2B` + `#00ED64`，见 `DESIGN.md`）

---

## 目录

1. [架构概览](#1-架构概览)
2. [技术选型](#2-技术选型)
3. [后端架构（Rust）](#3-后端架构rust)
4. [前端架构（React）](#4-前端架构react)
5. [IPC 通信层](#5-ipc-通信层)
6. [安全架构](#6-安全架构)
7. [数据存储](#7-数据存储)
8. [网络层](#8-网络层)
9. [错误处理](#9-错误处理)
10. [UI 设计系统](#10-ui-设计系统)
11. [数据流](#11-数据流)
12. [当前实现状态](#12-当前实现状态)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Window (WebView)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Tailwind CSS             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │  │  Pages   │  │    UI    │  │ Zustand Stores │  │  │
│  │  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │  │
│  │       └──────────────┼────────────────┘           │  │
│  │                 ┌────┴────────┐                   │  │
│  │                 │  lib/ipc.ts │                   │  │
│  │                 │ safeInvoke  │                   │  │
│  │                 │  IpcError   │                   │  │
│  │                 └────┬────────┘                   │  │
│  └──────────────────────┼────────────────────────────┘  │
│                         │  invoke()                      │
├─────────────────────────┼──────────────────────────────  ┤
│                    Tauri IPC Bridge                       │
├─────────────────────────┼────────────────────────────────┤
│  ┌──────────────────────┴──────────────────────────┐    │
│  │  Rust Backend (src-tauri/)                      │    │
│  │                                                 │    │
│  │  Commands (24 registered):                      │    │
│  │    wallet (11) │ eth (13)                        │    │
│  │    [btc/sol/evm/price — Phase 4–8]              │    │
│  │                 │                               │    │
│  │  Services:                                      │    │
│  │    crypto │ storage │ rpc │ db                  │    │
│  │                 │                               │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────┐ ┌───────┐  │    │
│  │  │AES-GCM   │ │wallet-   │ │reqwest│ │SQLite │  │    │
│  │  │PBKDF2    │ │store.json│ │(pool) │ │ WAL   │  │    │
│  │  │zeroize   │ │(atomic)  │ │rustls │ │cache  │  │    │
│  │  └──────────┘ └──────────┘ └──────┘ └───────┘  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

ZooWallet 采用 **Tauri v2** 架构，前后端完全分离：

- **前端**：WebView 中运行的 React SPA，纯 UI 渲染和状态管理
- **后端**：Rust 原生进程，处理所有区块链操作、加密、存储和网络
- **通信**：Tauri IPC Bridge 的 `invoke()` 调用，前端永远不接触密钥明文

---

## 2. 技术选型

| 层 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 桌面框架 | Tauri | v2 | 轻量（~5MB），Rust 后端，安全沙箱 |
| 前端 | React | 18 | Hooks 模式 |
| 语言 | TypeScript | 5.7 | 类型安全 |
| 构建 | Vite | 6 | 极速 HMR |
| 样式 | Tailwind CSS | 3.4 | MongoDB 设计系统令牌 |
| 状态 | Zustand | 5 | 轻量无 Provider |
| Rust 运行时 | tokio | latest | 异步 |
| ETH | alloy | 0.15 | 现代 Ethereum 库 |
| HD 钱包 | bip39 + coins-bip32 | 2 + 0.13 | BIP-39/32/44/84 |
| 加密 | aes-gcm + pbkdf2 + sha2 | latest | AES-256-GCM |
| 内存安全 | zeroize | 1.8 | 密钥材料零化 |
| HTTP | reqwest | 0.12 | rustls，连接池 |
| 缓存 | rusqlite | 0.31 | SQLite WAL，bundled |
| 包管理 | yarn | classic v1 | Node.js 依赖 |

---

## 3. 后端架构（Rust）

### 3.1 模块组织

```
src-tauri/src/
├── main.rs              # Tauri 入口：zoowallet_lib::run()
├── lib.rs               # run()：命令注册 + setup hook（存储+DB 初始化）
├── commands/
│   ├── mod.rs
│   ├── wallet.rs        # 11 个命令（钱包生命周期）
│   └── eth.rs           # 13 个命令（ETH 链操作）
│   # [btc.rs / sol.rs / evm.rs / price.rs — Phase 4–8]
├── services/
│   ├── mod.rs
│   ├── crypto.rs        # AES-256-GCM + PBKDF2-SHA512 + zeroize
│   ├── storage.rs       # WalletStore JSON + 原子写入 + RateLimiter
│   ├── rpc.rs           # 多节点 RPC + 全局 HTTP + 故障切换（Phase 7）
│   └── db.rs            # SQLite WAL 缓存 + 后台清理（Phase 7）
└── models/
    └── mod.rs           # AccountMeta / AccountAddresses / EncryptedBlob / HashOut
```

### 3.2 已注册命令

**wallet（11 个）：**

| 命令 | 说明 |
|------|------|
| `generate_mnemonic` | 生成 12 词 BIP-39 助记词 |
| `create_from_mnemonic` | 创建 HD 钱包，派生 ETH 地址（m/44'/60'/0'/0/0） |
| `verify_password` | 密码验证（含暴力破解防护） |
| `has_wallet` | 检测是否已创建钱包 |
| `get_accounts` | 返回所有账户元数据 |
| `derive_next_account` | 从助记词派生下一个 HD 账户 |
| `import_private_key` | 导入单链私钥（ETH hex） |
| `import_watch_wallet` | 导入观察钱包（ETH/BTC/SOL 地址） |
| `export_mnemonic` | 导出助记词（密码验证 + 限流） |
| `get_private_key` | 导出私钥（密码验证 + 限流） |
| `change_password` | 修改密码（重新加密所有密钥） |

**eth（13 个）：**

| 命令 | 说明 |
|------|------|
| `eth_get_balance` | ETH 余额（缓存 30s） |
| `eth_send_transaction` | EIP-1559 原生 ETH 转账 |
| `eth_get_gas_options` | Gas 三档（缓存 15s） |
| `eth_get_token_balances` | ERC-20 余额列表（缓存 60s） |
| `eth_send_token` | ERC-20 代币转账（transfer calldata） |
| `eth_decode_calldata` | Calldata 解码（5 个选择器） |
| `eth_preview_transaction` | 交易预览（合约检测+Gas+Calldata） |
| `eth_query_token_info` | 代币合约信息（name/symbol/decimals） |
| `eth_get_custom_token_balance` | 自定义代币余额 |
| `eth_get_history` | Etherscan 交易历史（缓存 120s，仅第1页） |
| `eth_estimate_gas` | Gas 估算 |
| `eth_speed_up_transaction` | 加速（MaxFee×1.1 + Priority+2Gwei） |
| `eth_cancel_transaction` | 取消（同 nonce 自发 0 ETH） |

### 3.3 服务层

| 服务 | 职责 | 关键设计 |
|------|------|---------|
| `crypto.rs` | AES-256-GCM 加密/解密 | 每次加密独立随机 salt(32B)+IV(12B)，密钥用完 zeroize |
| `storage.rs` | WalletStore 文件 I/O | tmp+rename 原子写，LazyLock 全局状态，5次/60s 限流 |
| `rpc.rs` | 多节点 HTTP | LazyLock reqwest::Client，EMA 延迟评分，3失败标不健康 |
| `db.rs` | SQLite 缓存 | WAL+NORMAL sync，LazyLock Mutex，后台线程每小时清理 |

### 3.4 全局状态

```rust
// storage.rs
static STORE_PATH:    LazyLock<Mutex<Option<PathBuf>>>
static WALLET_STORE:  LazyLock<Mutex<WalletStore>>

// rpc.rs
static HTTP:          LazyLock<reqwest::Client>
static ENDPOINTS:     LazyLock<RwLock<HashMap<String, Vec<Endpoint>>>>

// db.rs
static DB:            LazyLock<Mutex<Option<Connection>>>
```

---

## 4. 前端架构（React）

### 4.1 页面路由（uiStore 驱动，无 react-router）

```
Page 类型：welcome | create | import | unlock | dashboard |
           send | send-success | history | security | receive | settings
```

启动时根据 `has_wallet()` 决定初始页：
- 无钱包 → `welcome`
- 已有钱包未解锁 → `unlock`
- 解锁后 → `dashboard`

### 4.2 页面清单

| 页面 | 功能 |
|------|------|
| `Welcome` | 创建/导入入口，MongoDB logo + 荧光绿特效 |
| `CreateWallet` | 3步：助记词展示→随机3词验证→设密码 |
| `ImportWallet` | 助记词/私钥/观察钱包三模式 Tab |
| `Unlock` | 密码输入 + 限流倒计时 |
| `Dashboard` | 余额卡 + USD + 24h% + 代币列表 + 账户切换器 |
| `Send` | Gas三档卡片 + 代币选择 + 交易预览 + MAX按钮 |
| `Receive` | 确定性QR mockup + 一键复制 |
| `History` | 交易列表 + 方向图标 + 加速/取消 Modal |
| `Security` | 安全卡片列表（派生/导出/改密，含限流倒计时） |
| `Settings` | 自动锁屏选项 + 余额隐藏开关 |
| `SendSuccess` | 成功动画 + Etherscan 链接 |

### 4.3 状态管理（Zustand）

| Store | 文件 | 状态 |
|-------|------|------|
| `walletStore` | `store/walletStore.ts` | accounts / currentAccount / balance / prevBalance / tokenBalances / isBalanceHidden / lock() |
| `uiStore` | `store/uiStore.ts` | currentPage / notifications / autoLockMinutes / lastActivity |
| `priceStore` | `store/priceStore.ts` | prices (ETH/BTC/SOL，Phase 8 Rust 端未实现) |

### 4.4 自动锁屏

`App.tsx` 中 `useEffect` 监听 `mousemove / keydown / touchstart` 等事件，空闲超时后调用 `walletStore.lock()` 并跳转 `unlock`。`lock()` 同时清空内存中的 balance/tokenBalances，防止锁后数据泄露。

---

## 5. IPC 通信层

### 5.1 调用流程

```
页面组件
  → zoo.eth.getBalance(address)
  → safeInvoke('eth_get_balance', { address })
  → @tauri-apps/api/core invoke()
  → Tauri IPC Bridge
  → Rust #[tauri::command] eth_get_balance()
  → services/db 缓存查询 or RPC 请求
  → Result<T, String>
  → safeInvoke 捕获 → IpcError（失败）or T（成功）
```

### 5.2 zoo 命名空间结构

```typescript
zoo.generateMnemonic()
zoo.hasWallet()
zoo.verifyPassword(pwd)
zoo.createWalletFromMnemonic(args)
zoo.getAccounts()
zoo.deriveNextAccount(args)
zoo.importPrivateKey(args)
zoo.importWatchWallet(args)
zoo.exportMnemonic(pwd)
zoo.getPrivateKey(args)
zoo.changePassword(args)

zoo.eth.getBalance(address)
zoo.eth.sendTransaction(args)      // SendEthArgs（类型安全）
zoo.eth.getGasOptions()
zoo.eth.getTokenBalances(address)
zoo.eth.sendToken(args)            // SendTokenArgs（类型安全）
zoo.eth.decodeCalldata(data)
zoo.eth.previewTransaction(args)
zoo.eth.queryTokenInfo(contract)
zoo.eth.getCustomTokenBalance(args)
zoo.eth.getHistory(args)
zoo.eth.estimateGas(args)
zoo.eth.speedUpTransaction(args)
zoo.eth.cancelTransaction(args)

zoo.price.getMultiple(symbols)     // Phase 8 Rust 端未实现，前端静默忽略错误
zoo.price.getChart(symbol)
```

---

## 6. 安全架构

### 6.1 密钥管理流程

```
用户密码（UTF-8 字节）
    │
    ├── PBKDF2-SHA512，310,000 轮，随机 32B salt
    │       ↓
    │    256-bit AES 密钥（LazyLock 外不持久化，用完 zeroize）
    │       ↓
    │    AES-256-GCM 加密（随机 12B IV，128-bit tag）
    │       ↓
    │    EncryptedBlob { iv, ciphertext, tag, salt }（base64 JSON）
    │       ↓
    └── wallet-store.json（原子写入）

验证：passwordVerify 字段解密 → 比对 b"OK"
```

### 6.2 安全机制清单

| 机制 | 实现文件 | 说明 |
|------|---------|------|
| AES-256-GCM | `crypto.rs` | 每次加密独立随机 salt+IV |
| PBKDF2-SHA512 310k | `crypto.rs` | 抗暴力破解 |
| zeroize | `crypto.rs` | 所有密钥/明文用后清零 |
| 原子写入 | `storage.rs` | tmp+rename，防崩溃损坏 |
| 暴力破解防护 | `storage.rs` | 5次失败→60s，持久化 |
| 观察钱包隔离 | `wallet.rs` | `require_signing_account()` 前置检查 |
| Calldata 解码 | `eth.rs` | 防盲签，5个选择器 |
| 自动锁屏 | `App.tsx` | idle timer，锁后清内存 |
| CSP | `tauri.conf.json` | 严格白名单，无 unsafe-* |
| TLS | `rpc.rs` | rustls（无 OpenSSL 依赖） |
| 私钥自动清除 | `Security.tsx` | 30s 进度条倒计时 |

### 6.3 钱包文件结构

```json
{
  "version": 1,
  "password_verify": { "iv": "...", "ciphertext": "...", "tag": "...", "salt": "..." },
  "mnemonic":        { "iv": "...", "ciphertext": "...", "tag": "...", "salt": "..." },
  "accounts": [
    { "id": "uuid", "name": "Account 1", "type": "hd", "index": 0,
      "addresses": { "ETH": "0x..." } }
  ],
  "eth_keys": {
    "uuid": { "iv": "...", "ciphertext": "...", "tag": "...", "salt": "..." }
  },
  "rate_limit": { "fails": 0, "locked_until": 0 }
}
```

---

## 7. 数据存储

### 7.1 wallet-store.json

- **路径**：`{app_data}/com.zoowallet.app/wallet-store.json`
- **写入**：先写 `.json.tmp`，成功后 `rename` 覆盖（原子操作）
- **读取**：启动时一次性加载到内存 `WALLET_STORE`，操作后回写

### 7.2 SQLite 缓存（Phase 7）

- **路径**：`{app_data}/com.zoowallet.app/cache.db`
- **模式**：WAL + NORMAL sync
- **连接**：全局单连接 `Mutex<Option<Connection>>`，中毒自动恢复

| 表 | 数据 | TTL |
|---|---|---|
| `balances` | 原生币余额 | 30s |
| `token_balances` | 代币余额列表 | 60s |
| `tx_history` | 交易记录（第1页） | 120s |
| `gas_cache` | Gas 费率 | 15s |
| `price_cache` | 价格 | 60s |
| `price_chart` | 7天图表 | 300s |
| `evm_chains` | 链配置 | 永久 |
| `kv_cache` | 通用键值 | 可变 |

**清理**：后台线程每小时删除 7 天前过期数据（evm_chains 除外）。

### 7.3 前端持久化

Zustand stores **不使用** `persist` 中间件持久化敏感数据。`walletStore` 的 balance/tokenBalances 为纯内存，锁屏后清空。

---

## 8. 网络层

### 8.1 HTTP 连接池

`rpc.rs` 全局 `static HTTP: LazyLock<reqwest::Client>`：
- 每 host 最多 5 个空闲连接
- 连接超时 10s，请求超时 30s
- rustls TLS（无 OpenSSL 依赖）

### 8.2 RPC 故障切换（Phase 7）

```
get_best_rpc(chain)
  → 按 score = latency_ema + fail_count×1000 排序
  → 选最低分健康节点
  → 成功：mark_success（更新 EMA，减失败计数）
  → 失败：mark_failure（失败≥3 → 标不健康）
  → 全部不健康 → reset 全部，重新开始
```

**预置节点：**

| 链 | 节点数 | 来源 |
|---|---|---|
| ETH | 5 | llamarpc / ankr / publicnode / 1rpc / cloudflare |
| SOL | 2 | mainnet-beta / publicnode |
| BTC | 2 | mempool.space / blockstream |

### 8.3 CSP 白名单

`tauri.conf.json` 中 `connect-src` 仅允许：
- 5 个 ETH RPC 节点
- `api.etherscan.io`
- `api.coingecko.com`
- `mempool.space`、`blockstream.info`
- `api.mainnet-beta.solana.com`、`solana.publicnode.com`

---

## 9. 错误处理

### 9.1 Rust 后端

| 层 | 策略 |
|---|---|
| 命令层 | 返回 `Result<T, String>`，中文面向用户 |
| 服务层 | `log::error!` 详细日志，对外简洁错误 |
| DB 层 | `unwrap_or_else(\|p\| p.into_inner())` 中毒恢复 |
| RPC 层 | 自动重试下一节点 |

**常见错误消息：**

| 消息 | 场景 |
|------|------|
| `"密码不正确"` | 验证失败 |
| `"密码尝试次数过多，请 N 秒后重试"` | 限流中 |
| `"账户不存在或无 ETH 私钥"` | 账户不存在 |
| `"观察钱包不支持此操作"` | watch 类型签名 |
| `"ETH 无可用 RPC 节点"` | 全部不健康 |

### 9.2 前端

| 层 | 策略 |
|---|---|
| IPC | `safeInvoke()` → `IpcError` |
| 页面 | `try/catch` + `showNotification('error', msg)` |
| 限流 | 解析 `"请 N 秒后重试"` → 显示倒计时 |
| 根 | `<ErrorBoundary>` 捕获渲染异常 |

---

## 10. UI 设计系统

设计令牌规范见 [`DESIGN.md`](../DESIGN.md)（基于 MongoDB 品牌，DESIGN.md 格式）。

### 10.1 色彩系统

| Token | 色值 | 用途 |
|-------|------|------|
| `forest` | `#001E2B` | 页面画布（最深背景） |
| `midnight` | `#023430` | 卡片/模态框表面 |
| `coal` | `#1C2D38` | 悬停/次要表面 |
| `canopy` | `#00684A` | 边框/次要操作 |
| `neon` | `#00ED64` | 主品牌 CTA，焦点环，成功 |
| `fog` | `#F9FBFA` | 主要文字 |
| `slate` | `#89989B` | 次要文字/占位符 |
| `sky` | `#016BF8` | 链接/信息 |

### 10.2 组件规范

- **Primary Button**：`bg-neon text-forest`，高对比
- **Input**：`bg-coal border-canopy/45`，focus 时 neon glow
- **Modal**：底部滑出 sheet，drag handle，spring 弹性动画
- **Toast**：顶部 pill 胶囊形，SVG 图标
- **焦点环**：`box-shadow: 0 0 0 3px rgba(0,237,100,0.30)`

---

## 11. 数据流

### 11.1 Dashboard 资产加载

```
Dashboard mount
  → fetchData() 竞态保护（fetchIdRef）
  → zoo.eth.getBalance(addr)       ← SQLite 缓存（30s TTL）或 llamarpc
  → zoo.eth.getTokenBalances(addr) ← SQLite 缓存（60s TTL）或 Etherscan
  → setBalance / setTokenBalances
  → 若 balance > prevBalance → showNotification("收到 N ETH")

App.tsx（每60s）
  → zoo.price.getMultiple(["ETH"])  ← 前端静默忽略（Rust 端 Phase 8）
```

### 11.2 转账流程

```
Send 页面
  → 输入地址（EIP-55 校验）+ 金额
  → Gas 三档卡片（zoo.eth.getGasOptions，缓存 15s）
  → 500ms 防抖 previewTransaction（实际 Wei 值）
  → 点"预览并发送" → PasswordModal
  → 输入密码 → zoo.eth.sendTransaction(SendEthArgs)
    Rust：verify_password → decrypt_private_key → build EIP-1559 → sign → broadcast
  → navigate("send-success")
```

### 11.3 自动锁屏流程

```
App.tsx useEffect（isUnlocked && autoLockMinutes > 0）
  → addEventListener mousemove/keydown/touchstart/scroll
  → 每次事件重置 setTimeout(autoLockMinutes * 60 * 1000)
  → 超时触发：walletStore.lock() → navigate("unlock")
    lock()：isUnlocked=false, balance=null, tokenBalances=[]
```

---

## 12. 当前实现状态

### 已完成

| Phase | 内容 | PR |
|-------|------|---|
| 0 | 项目骨架（Makefile / package.json / Tauri 配置） | #2 |
| 1 | ETH MVP（创建/验证/余额/转账） | #2 |
| 2 | 钱包管理（HD 派生/私钥导入/观察/导出/改密） | #4 |
| 3 | ETH 完整化（代币/Gas 三档/历史/加速取消/Calldata） | #4 |
| 7 | 缓存与韧性（SQLite WAL / RPC 故障切换） | #5 |
| — | MVP 生产级缺口（Receive/Settings/自动锁屏/价格/UX） | #6 |
| — | MongoDB UI 全量重设计（DESIGN.md） | #7 |

### 待开发

| Phase | 内容 | 主要技术 |
|-------|------|---------|
| 4 | Bitcoin | `rust-bitcoin`，P2WPKH，BnB UTXO 选币，Mempool API |
| 5 | Solana | `solana-sdk`，SPL Token，Token-2022 转账税 |
| 6 | EVM L2 | 动态链注册，SQLite 持久化，Etherscan 兼容 API |
| 8 | 价格服务 + 地址簿 + 自定义代币 | CoinGecko API，Zustand persist |

---

> **文档版本**：v2.0.0 | **最后更新**：2026-05 | **架构版本**：Tauri v2 + Rust + React 18
