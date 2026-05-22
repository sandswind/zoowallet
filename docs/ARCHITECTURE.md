# ZooWallet 系统架构文档

> 版本：v1.2.0 | 框架：Tauri v2 | 后端：Rust | 前端：React 18 + TypeScript

---

## 目录

1. [架构概览](#1-架构概览)
2. [技术选型](#2-技术选型)
3. [后端架构 (Rust)](#3-后端架构-rust)
4. [前端架构 (React)](#4-前端架构-react)
5. [IPC 通信层](#5-ipc-通信层)
6. [安全架构](#6-安全架构)
7. [数据存储](#7-数据存储)
8. [网络层](#8-网络层)
9. [错误处理策略](#9-错误处理策略)
10. [性能优化](#10-性能优化)
11. [数据流](#11-数据流)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Window (WebView)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React 18 + TypeScript + Tailwind CSS             │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │  │
│  │  │  Pages   │  │ Components│  │ Zustand Stores │  │  │
│  │  └────┬─────┘  └────┬─────┘  └───────┬────────┘  │  │
│  │       └──────────────┼────────────────┘           │  │
│  │                      │                            │  │
│  │              ┌───────┴────────┐                   │  │
│  │              │  ipc.ts        │                   │  │
│  │              │  (safeInvoke)  │                   │  │
│  │              │  (IpcError)    │                   │  │
│  │              └───────┬────────┘                   │  │
│  └──────────────────────┼────────────────────────────┘  │
│                         │  invoke()                      │
├─────────────────────────┼────────────────────────────────┤
│                         │  Tauri IPC Bridge               │
├─────────────────────────┼────────────────────────────────┤
│  ┌──────────────────────┴────────────────────────────┐  │
│  │  Rust Backend (src-tauri/)                        │  │
│  │  ┌──────────────────────────────────────────────┐ │  │
│  │  │  Commands Layer (53 commands)                │ │  │
│  │  │  wallet │ eth │ btc │ sol │ evm │ price     │ │  │
│  │  └────┬─────────────────────────────────────────┘ │  │
│  │       │                                           │  │
│  │  ┌────┴──────────────────────────────────────┐    │  │
│  │  │  Services Layer                           │    │  │
│  │  │  crypto │ storage │ rpc │ db              │    │  │
│  │  └────┬──────┬──────────┬────────┬───────────┘    │  │
│  │       │      │          │        │                │  │
│  │  ┌────┴──┐ ┌─┴───┐ ┌───┴────┐ ┌─┴──────────┐    │  │
│  │  │AES-GCM│ │JSON │ │reqwest │ │rusqlite    │    │  │
│  │  │PBKDF2 │ │Store│ │(pool)  │ │(SQLite WAL)│    │  │
│  │  └───────┘ └─────┘ └────────┘ └────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

ZooWallet 采用 **Tauri v2** 架构，实现前后端完全分离：

- **前端**：WebView 中运行的 React SPA，纯 UI 渲染和状态管理
- **后端**：Rust 原生进程，处理所有区块链操作、加密、存储和网络
- **通信**：通过 Tauri IPC Bridge 的 `invoke()` 调用，前端永远不直接接触密钥

---

## 2. 技术选型

### 核心框架

| 层 | 技术 | 版本 | 选型理由 |
|---|---|---|---|
| 桌面框架 | Tauri | v2 | 轻量级 (~5MB)，原生 Rust 后端，安全沙箱 |
| 前端 | React | 18 | 成熟生态，Hooks 模式 |
| 语言 | TypeScript | 5.7 | 类型安全 |
| 构建 | Vite | 8 | 极速 HMR，Tauri 官方推荐 |
| 样式 | Tailwind CSS | 3.4 | 原子化 CSS，暗色主题 |
| 状态 | Zustand | 5 | 轻量、无 Provider、支持持久化 |

### Rust 后端依赖

| 功能 | 库 | 说明 |
|---|---|---|
| ETH/EVM | `alloy` | 现代 Ethereum 库，替代 ethers-rs |
| BTC | `rust-bitcoin` | 原生 Bitcoin 库，P2WPKH，UTXO |
| SOL | `solana-sdk` + `solana-client` | Solana 官方 SDK |
| SPL Token | `spl-token` | Token 和 Token-2022 支持 |
| 助记词 | `bip39` | BIP-39 助记词生成/恢复 |
| 加密 | `aes-gcm` + `pbkdf2` + `sha2` | AES-256-GCM + PBKDF2-SHA512 |
| 内存安全 | `zeroize` | 密钥材料零化清除 |
| HTTP | `reqwest` | 全局连接池，rustls-tls |
| 数据库 | `rusqlite` (bundled) | SQLite WAL 模式缓存 |
| 序列化 | `serde` + `serde_json` | JSON 序列化 |
| 编码 | `bs58` + `hex` | Base58 / 十六进制编码 |
| 异步 | `tokio` | 异步运行时 |

---

## 3. 后端架构 (Rust)

### 3.1 模块组织

```
src-tauri/src/
├── main.rs            # Tauri 入口点
├── lib.rs             # run() 函数：命令注册 + setup hook
├── commands/          # Tauri #[tauri::command] 函数
│   ├── mod.rs
│   ├── wallet.rs      # 钱包管理（11 个命令）
│   ├── eth.rs         # Ethereum（14 个命令）
│   ├── btc.rs         # Bitcoin（6 个命令）
│   ├── sol.rs         # Solana（12 个命令）
│   ├── evm.rs         # 通用 EVM L2（9 个命令）
│   └── price.rs       # 价格查询（2 个命令）
├── services/          # 业务服务
│   ├── mod.rs
│   ├── crypto.rs      # 加密/解密 + zeroize
│   ├── storage.rs     # 钱包文件存储（原子写入）
│   ├── rpc.rs         # RPC 管理 + HTTP 连接池
│   └── db.rs          # SQLite 缓存 + 错误日志
└── models/            # 共享数据结构
    └── mod.rs
```

### 3.2 命令层 (commands/)

每个命令模块对应一条区块链或一组功能，通过 `#[tauri::command]` 宏暴露给前端：

- **wallet.rs** — 钱包生命周期管理：创建、导入、派生、观察钱包、密码操作
- **eth.rs** — ETH 主网操作：余额、代币、Gas、交易、历史
- **btc.rs** — BTC 操作：余额、UTXO、费率、交易
- **sol.rs** — SOL 操作：余额、SPL Token、Token-2022、优先费、交易
- **evm.rs** — 通用 EVM：复用 ETH 逻辑，动态链 ID
- **price.rs** — 价格聚合：CoinGecko API

**观察钱包保护**：所有涉及签名的命令都会检查 `is_watch_account()`，观察钱包调用交易命令时直接返回错误。

### 3.3 服务层 (services/)

| 服务 | 职责 | 关键设计 |
|---|---|---|
| `crypto.rs` | AES-256-GCM 加密/解密 | 密钥用完 `zeroize()`，明文解密后零化 |
| `storage.rs` | 钱包数据文件 I/O | 原子写入（tmp → rename），暴力破解限流 |
| `rpc.rs` | 多节点 RPC 管理 | 全局 `reqwest::Client` 连接池，自动故障切换 |
| `db.rs` | SQLite 缓存层 | WAL 模式，Mutex 中毒恢复，错误日志 |

### 3.4 全局状态

Rust 后端使用 `LazyLock` 管理全局状态：

| 全局变量 | 类型 | 位置 | 说明 |
|---|---|---|---|
| `ENDPOINTS` | `RwLock<HashMap>` | `rpc.rs` | RPC 节点注册表 |
| `HTTP` | `reqwest::Client` | `rpc.rs` | 共享 HTTP 连接池 |
| `DB` | `Mutex<Connection>` | `db.rs` | SQLite 连接（中毒恢复） |
| `RATE_LIMITER` | `Mutex<RateLimiter>` | `storage.rs` | 密码尝试限流 |
| `EVM_CHAINS` | `RwLock<HashMap>` | `evm.rs` | 动态 EVM 链配置 |

---

## 4. 前端架构 (React)

### 4.1 组件层级

```
App (ErrorBoundary)
├── AppInner
│   ├── LockScreen              # 自动锁屏遮罩
│   ├── Toast Notification      # 全局通知
│   ├── Onboarding Pages
│   │   ├── Welcome
│   │   ├── CreateWallet
│   │   └── ImportWallet
│   └── AppShell                # 主界面壳
│       ├── Sidebar             # 导航 + 账户切换
│       └── Content Area
│           ├── Dashboard       # 资产总览
│           ├── Send            # 转账
│           ├── Receive         # 收款
│           ├── History         # 交易历史
│           ├── Security        # 安全管理
│           └── Settings        # 设置
```

### 4.2 状态管理 (Zustand)

| Store | 文件 | 职责 |
|---|---|---|
| `walletStore` | `walletStore.ts` | 账户列表、余额、代币余额、加载状态 |
| `priceStore` | `priceStore.ts` | 价格缓存、24h 涨跌 |
| `uiStore` | `uiStore.ts` | 页面路由、通知、锁屏、搜索状态 |
| `chainStore` | `chainStore.ts` | 启用的链列表、自定义 EVM 链 |
| `addressBookStore` | `addressBookStore.ts` | 联系人地址簿 |
| `customTokenStore` | `customTokenStore.ts` | 用户自定义代币列表 |

### 4.3 UI 组件

| 类别 | 组件 | 特性 |
|---|---|---|
| **通用 UI** | Button, Input, Modal, Badge, Spinner, Skeleton, EmptyState, CopyButton, ContextMenu, TokenIcon | Modal 支持 `aria-modal` / `aria-labelledby` 可访问性 |
| **钱包组件** | AssetOverview, TokenList, TxItem, ChainBadge | TokenRow 使用 `React.memo` 优化 |

### 4.4 Error Boundary

`App.tsx` 包含全局 `ErrorBoundary` 类组件：

- 捕获任意子组件的渲染异常
- 显示友好 fallback UI + 错误信息
- 提供"重新加载"按钮恢复

---

## 5. IPC 通信层

### 5.1 调用流程

```
前端组件 → zoo.eth.getBalance(addr)
         → safeInvoke('eth_get_balance', { address })
         → @tauri-apps/api invoke()
         → Tauri IPC Bridge
         → Rust #[tauri::command] eth_get_balance()
         → services (rpc + db cache)
         → Result<T, String> 返回
         → safeInvoke 捕获错误 → IpcError
```

### 5.2 错误封装

`ipc.ts` 中的 `safeInvoke<T>()` 统一包装所有 `invoke()` 调用：

- Rust 端返回 `Err(String)` → 前端抛出 `IpcError`
- 未知异常 → 统一转为 `IpcError("操作失败")`
- 所有页面可通过 `catch (err)` 统一处理 `IpcError`

### 5.3 命令总数

| 模块 | 命令数 |
|---|---|
| wallet | 11 |
| eth | 14 |
| btc | 6 |
| sol | 12 |
| evm | 9 |
| price | 2 |
| **总计** | **54** |

---

## 6. 安全架构

### 6.1 密钥管理

```
用户密码
    │
    ├── PBKDF2-SHA512 (310,000 次迭代) + 随机 32 字节 salt
    │       │
    │       └── 256-bit 派生密钥 (用完即 zeroize)
    │               │
    │               └── AES-256-GCM 加密/解密
    │                       │
    ├── 加密后存储: { iv, data, tag, salt } → wallet-store.json
    │
    └── 验证: passwordVerify 字段解密 → 比对明文标记
```

### 6.2 安全机制清单

| 机制 | 实现 | 位置 |
|---|---|---|
| 加密算法 | AES-256-GCM | `crypto.rs` |
| 密钥派生 | PBKDF2-SHA512, 310K 次 | `crypto.rs` |
| 内存清零 | `zeroize` crate | `crypto.rs` |
| 暴力破解防护 | 5 次失败锁定 60 秒 | `storage.rs` |
| 原子写入 | tmp + rename | `storage.rs` |
| 观察钱包隔离 | `is_watch_account()` 检查 | 所有交易命令 |
| 防盲签 | calldata 解码预览 | `eth.rs` |
| 自动锁屏 | 可配置空闲检测 | `App.tsx` |
| CSP | 严格白名单 | `tauri.conf.json` |
| 前后端隔离 | 密钥只在 Rust 进程 | Tauri IPC 设计 |

### 6.3 密钥材料生命周期

1. 用户输入密码 → 前端通过 IPC 传入 Rust
2. Rust 端 `derive_key()` 生成 AES 密钥 → 加密/解密操作
3. 操作完成 → 密钥 `Vec<u8>` 调用 `.zeroize()` 清零
4. 解密后的明文数据完成使用 → 同样 `.zeroize()` 清零
5. 密码字符串在函数作用域结束后由 Rust 自动 drop

---

## 7. 数据存储

### 7.1 钱包数据 (wallet-store.json)

- **路径**：`{app_data}/com.zoowallet.app/wallet-store.json`
- **格式**：嵌套 JSON，每个 key 对应一个加密数据块
- **写入方式**：先写 `.json.tmp`，成功后 `rename` 覆盖原文件（原子操作）
- **读取**：启动时加载，运行时内存操作后回写

### 7.2 SQLite 缓存 (cache.db)

- **路径**：`{app_data}/com.zoowallet.app/cache.db`
- **模式**：WAL (Write-Ahead Logging)，支持并发读写
- **连接**：全局单连接 `Mutex<Connection>`，中毒自动恢复
- **清理**：后台线程每小时清理 7 天前的过期数据

| 表 | 数据 | TTL |
|---|---|---|
| `balances` | 原生币余额 | 30s |
| `token_balances` | 代币余额 | 60s |
| `tx_history` | 交易记录 | 120s |
| `price_cache` | 价格 | 60s |
| `price_chart` | 价格图表 | 300s |
| `gas_cache` | Gas 费率 | 15s |
| `evm_chains` | 链配置 | 永久 |
| `kv_cache` | 通用键值 | 可变 |

### 7.3 前端持久化

Zustand stores 中的部分数据通过 `zustand/middleware` 的 `persist` 中间件存储在 `localStorage`：

- 启用的链列表
- 自定义代币列表
- 地址簿联系人
- UI 偏好设置

---

## 8. 网络层

### 8.1 HTTP 连接池

`rpc.rs` 中声明全局 `reqwest::Client`：

- **连接池**：每 host 最多 5 个空闲连接
- **超时**：连接 10s，请求 30s
- **TLS**：rustls (纯 Rust，无 OpenSSL 依赖)

### 8.2 多节点 RPC 故障切换

```
请求发起
    │
    ├── get_best_rpc(chain) → 选择最优节点
    │       │
    │       └── 按 (延迟 + 失败次数*1000) 评分排序
    │
    ├── 发送请求 (超时控制)
    │
    ├── 成功 → mark_endpoint_success (更新延迟、减少失败计数)
    │
    └── 失败 → mark_endpoint_failed (失败 ≥ 3 次标记不健康)
                    │
                    └── 所有节点不健康 → 全部重置为健康，重新开始
```

### 8.3 预置 RPC 节点

| 链 | 节点数 | 来源 |
|---|---|---|
| ETH | 5 | llamarpc, ankr, publicnode, 1rpc, cloudflare |
| SOL | 2 | mainnet-beta, publicnode |
| BTC | 2 | mempool.space, blockstream |
| EVM L2 | 动态注册 | 用户配置 |

---

## 9. 错误处理策略

### 9.1 后端 (Rust)

| 层 | 策略 |
|---|---|
| 命令层 | 返回 `Result<T, String>`，错误信息面向用户 |
| 服务层 | 内部用 `log::error!` 记录详细日志，对外返回简洁错误 |
| DB 层 | `log_db_err()` 辅助函数记录失败但不 panic |
| 连接锁 | `Mutex::lock().unwrap_or_else(\|p\| p.into_inner())` 中毒恢复 |
| RPC | 自动重试 + 降级下一节点 |

### 9.2 前端 (TypeScript)

| 层 | 策略 |
|---|---|
| IPC | `safeInvoke()` 统一捕获 → `IpcError` |
| 组件 | `ErrorBoundary` 捕获渲染异常 |
| 页面 | try/catch + `showNotification('error', msg)` |
| 数据加载 | `Promise.allSettled` 允许部分失败 |

---

## 10. 性能优化

### 10.1 后端

| 优化 | 说明 |
|---|---|
| 全局连接池 | 复用 TCP 连接，避免每次 handshake |
| SQLite WAL | 并发读写，查询不阻塞写入 |
| TTL 缓存 | 高频查询命中缓存，减少 RPC 调用 |
| Release profile | `lto = true`, `codegen-units = 1`, `opt-level = "s"` |

### 10.2 前端

| 优化 | 说明 |
|---|---|
| `React.memo(TokenRow)` | 代币行不变时跳过重渲染 |
| 竞态保护 (`fetchIdRef`) | 旧请求结果被丢弃，不污染 UI |
| 错开请求 (stagger) | 多链请求间隔 300ms，避免同时打满 RPC |
| 骨架屏 | Gas/交易列表加载时显示 skeleton |
| `Promise.allSettled` | 多链并行加载，单链失败不阻塞 |

---

## 11. 数据流

### 11.1 Dashboard 资产加载

```
Dashboard mount / 60s 轮询
    │
    ├── fetchPrices() → price_get_multiple → CoinGecko
    │       └── setPrices(data)
    │
    ├── Promise.allSettled([
    │       fetchChainData('ETH', ..., 'ETH'),
    │       delay(300).then(fetchChainData('BTC', ..., 'BTC')),
    │       delay(600).then(fetchChainData('SOL', ..., 'SOL')),
    │       delay(900).then(fetchChainData('MATIC', ..., 'MATIC')),
    │       ...
    │   ])
    │
    ├── if (fetchId !== current) return   ← 竞态保护
    │
    ├── 合并所有 ChainResult → allTokens + totalUsd
    │
    ├── 自定义代币余额拉取 (串行)
    │
    ├── setTokenBalances(allTokens)
    ├── setTotalUsdValue(totalUsd)
    │
    └── 余额增长检测 → 系统通知
```

### 11.2 转账流程

```
用户填写表单
    │
    ├── validateAddress() ← 前端格式校验 (EVM/BTC/SOL)
    │
    ├── "预览转账" 按钮
    │       ├── ETH/EVM: previewTransaction → 合约检测 + calldata 解码
    │       ├── BTC: previewTransaction → UTXO 分析 + 手续费计算
    │       └── SOL Token-2022: previewTransfer → 转账税计算
    │
    ├── 确认弹窗（防盲签面板）
    │       └── 用户输入密码
    │
    ├── "确认转账" 按钮
    │       ├── Rust 端: verify_password → load_private_key → 签名 → 广播
    │       └── 返回 { hash }
    │
    └── 成功页 → 区块链浏览器链接
```

---

> **文档版本**：v1.2.0 | **最后更新**：2026-04-01
