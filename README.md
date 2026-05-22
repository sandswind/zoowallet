# ZooWallet

跨链桌面钱包，支持 Ethereum、Bitcoin、Solana 及 EVM L2 网络。

![macOS](https://img.shields.io/badge/macOS-Compatible-brightgreen)
![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131)
![Rust](https://img.shields.io/badge/Rust-Backend-DEA584)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

## 功能特性

### 多链支持

| 链 | 钱包类型 | 功能 |
|---|---|---|
| **Ethereum** | HD (BIP-39) | ETH 转账、ERC-20 代币、自定义代币、EIP-1559 Gas 优化、防盲签解码 |
| **Bitcoin** | HD (BIP-84) | BTC 转账、UTXO 优化（Branch-and-Bound / Largest-First）、找零计算 |
| **Solana** | HD (BIP-44) | SOL 转账、SPL/Token-2022 代币、转账税检测 |
| **EVM L2** | 共享 ETH 地址 | Arbitrum / Base / BSC / Optimism / Polygon / Avalanche 等，动态注册 |

### 资产管理

- **代币** — 原生币 + ERC-20 + SPL + Token-2022 余额展示
- **自定义代币** — 通过合约/Mint 地址手动添加
- **观察钱包** — 只读导入地址，查看资产无法交易
- **地址簿** — 联系人管理，转账时快速选择
- **余额隐藏** — 一键遮盖余额，保护隐私

### 交易

- **代币转账** — ERC-20 / SPL / Token-2022 完整支持
- **交易加速 / 取消** — ETH 待处理交易重播或取消
- **交易历史** — 多链历史记录（Etherscan / Mempool / Solana）
- **地址校验** — EVM (0x 格式) / BTC (bc1/P2PKH/P2SH) / SOL (Base58) 前后端双重校验

### 安全特性

- **AES-256-GCM** 加密存储（PBKDF2-SHA512, 310,000 次迭代）
- **密钥材料 zeroize** — 派生密钥、明文数据用完即零化清除
- **原子文件写入** — wallet-store.json 先写 tmp 再 rename，防崩溃损坏
- 密码验证 + 密码更换 + 暴力破解防护（5 次锁定 60 秒）
- **防盲签** — 交易数据解码预览（合约方法名 + 参数）
- **自动锁屏** — 可配置空闲超时
- **私钥/助记词导出** — 密码验证后多步确认

### 前端质量

- **Error Boundary** — 全局异常捕获，崩溃后友好 fallback UI + 重载
- **IPC 统一错误封装** — `IpcError` 类统一处理 Tauri invoke 异常
- **竞态保护** — Dashboard 多链并发加载使用 `fetchId` 版本号 + `Promise.allSettled` 合并
- **Modal 可访问性** — `role="dialog"` / `aria-modal` / `aria-labelledby` / 自动聚焦
- **TokenRow memo** — `React.memo` 优化代币列表重渲染
- **Gas 加载骨架屏** — 切换链时显示 skeleton 占位

### 缓存与性能

- **SQLite 缓存** — 余额 / 代币 / 交易记录 / 价格本地缓存，减少 API 调用
- **全局 HTTP 连接池** — 共享 `reqwest::Client`，5 连接/host，复用 TCP 连接
- **EVM 链配置持久化** — 自定义 EVM 链重启后自动恢复
- **定时清理** — 7 天过期数据自动清理，含完整 DB 错误日志

### RPC 可靠性

- 多节点自动故障切换（每链 3-5 个节点）
- 延迟追踪与智能评分
- 节点失败自动重试（30s 冷却）

## 技术栈

```
Tauri 2 + Rust (后端) + Vite + React 18 + TypeScript 5
状态管理: Zustand
UI: Tailwind CSS
加密: aes-gcm, pbkdf2, sha2, hmac, zeroize (Rust native)
区块链: alloy (ETH), rust-bitcoin (BTC), solana-sdk (SOL)
缓存: rusqlite (SQLite WAL)
HTTP: reqwest (全局连接池)
```

## 项目结构

```
zoowallet/
├── src-tauri/                   # Rust 后端 (Tauri v2)
│   ├── Cargo.toml               # Rust 依赖配置
│   ├── tauri.conf.json          # Tauri 应用配置
│   ├── src/
│   │   ├── main.rs              # 入口
│   │   ├── lib.rs               # 命令注册、启动钩子
│   │   ├── commands/            # Tauri 命令模块
│   │   │   ├── wallet.rs        # 钱包创建/导入/派生/观察钱包
│   │   │   ├── eth.rs           # ETH 链操作
│   │   │   ├── btc.rs           # BTC 链操作
│   │   │   ├── sol.rs           # SOL 链操作
│   │   │   ├── evm.rs           # 通用 EVM L2 操作
│   │   │   └── price.rs         # 价格查询
│   │   ├── services/            # 后端服务层
│   │   │   ├── crypto.rs        # AES-256-GCM 加密/解密 + zeroize
│   │   │   ├── storage.rs       # 安全文件存储（原子写入）
│   │   │   ├── rpc.rs           # 多节点 RPC + 全局 HTTP 连接池
│   │   │   └── db.rs            # SQLite 缓存层 + 错误日志
│   │   └── models/              # 共享数据模型
│   │       └── mod.rs
│   └── icons/                   # 应用图标
│
├── src/                         # React 前端
│   ├── App.tsx                  # 根组件、ErrorBoundary、路由、自动锁屏
│   ├── components/
│   │   ├── layout/              # AppShell, Sidebar
│   │   ├── ui/                  # Button, Input, Modal(a11y) 等
│   │   ├── wallet/              # AssetOverview, TokenList(memo), TxItem
│   │   └── LockScreen.tsx       # 自动锁屏覆盖层
│   ├── pages/                   # 页面
│   │   ├── Welcome.tsx          # 首次启动欢迎页
│   │   ├── CreateWallet.tsx     # 创建钱包
│   │   ├── ImportWallet.tsx     # 导入钱包（含观察钱包）
│   │   ├── Dashboard.tsx        # 资产总览（竞态安全）
│   │   ├── Send.tsx             # 转账（含地址校验、Gas 骨架屏）
│   │   ├── Receive.tsx          # 收款
│   │   ├── History.tsx          # 交易历史
│   │   ├── Security.tsx         # 安全管理
│   │   └── Settings.tsx         # 设置
│   ├── store/                   # Zustand stores
│   │   ├── walletStore.ts       # 账户、余额、Token 列表
│   │   ├── priceStore.ts        # 价格缓存
│   │   ├── uiStore.ts           # UI 状态、自动锁屏配置
│   │   ├── chainStore.ts        # 链配置管理
│   │   ├── addressBookStore.ts  # 地址簿
│   │   └── customTokenStore.ts  # 自定义代币列表
│   ├── lib/
│   │   ├── ipc.ts               # Tauri invoke 适配层（IpcError + safeInvoke）
│   │   ├── chains.ts            # 链定义
│   │   └── types.ts             # 共享 TypeScript 类型
│   └── styles/
│       └── globals.css          # 全局样式
│
├── docs/
│   ├── API.md                   # 完整 API 文档（53+ 个命令）
│   └── ARCHITECTURE.md          # 系统架构文档
├── Makefile                     # 构建/开发/检查命令
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── postcss.config.js
```

## 快速开始

### 环境要求

- **Node.js** 20+
- **Rust** (最新 stable)
- **系统依赖** (Tauri 要求):
  - macOS: Xcode Command Line Tools
  - Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) + WebView2
  - Linux: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` 等

### 使用 Makefile

```bash
make install    # 安装所有依赖（yarn + cargo fetch）
make dev        # 开发模式（Vite HMR + Tauri 窗口）
make build      # 生产构建（生成安装包）
make check      # 全量检查（Rust + TypeScript）
make help       # 查看所有可用命令
```

### 手动命令

```bash
# 安装依赖
yarn install

# 开发模式
yarn tauri dev

# 生产构建
yarn tauri build

# 类型检查
yarn typecheck                       # TypeScript
cd src-tauri && cargo check          # Rust
cd src-tauri && cargo clippy         # Rust lint
```

## Make 命令一览

| 命令 | 说明 |
|------|------|
| `make install` | 安装所有依赖 |
| `make dev` | 开发模式（HMR + Tauri） |
| `make dev-web` | 仅启动 Vite 前端 |
| `make build` | 生产构建 |
| `make build-debug` | 调试构建 |
| `make check` | 全量检查（Rust + TS） |
| `make clippy` | Rust lint |
| `make fmt` | 格式化 Rust 代码 |
| `make clean` | 清理所有构建产物 |
| `make db-path` | 显示缓存数据库路径 |
| `make db-clear` | 删除缓存数据库 |
| `make info` | 显示工具链版本 |
| `make loc` | 统计代码行数 |

## 钱包架构

### 账户类型

| 类型 | `account_type` | 说明 |
|---|---|---|
| HD 钱包 | `"hd"` | 助记词派生，支持 ETH/BTC/SOL 三链地址 |
| 导入钱包 | `"imported"` | 单链私钥导入 |
| 观察钱包 | `"watch"` | 仅地址，只读查看资产，无法交易 |

### HD 派生路径

| 链 | 路径 | 地址类型 |
|---|---|---|
| ETH | `m/44'/60'/0'/0/index` | EOA |
| BTC | `m/84'/0'/0'/0/index` | Native SegWit (bech32) |
| SOL | `m/44'/501'/index'/0'` | SLIP-0010 Ed25519 |

### 存储结构

```
{app_data}/com.zoowallet.app/
├── wallet-store.json               # 加密钱包数据（原子写入保护）
│   ├── passwordVerify: EncryptedPayload
│   ├── mnemonic: EncryptedPayload
│   ├── {accountId}.keys.ETH: EncryptedPayload
│   ├── {accountId}.keys.BTC: EncryptedPayload
│   ├── {accountId}.keys.SOL: EncryptedPayload
│   └── {accountId}.meta: AccountMeta
│
└── cache.db                        # SQLite 缓存
    ├── balances         (TTL 30s)
    ├── token_balances   (TTL 60s)
    ├── tx_history       (TTL 120s)
    ├── price_cache      (TTL 60s)
    ├── price_chart      (TTL 300s)
    ├── gas_cache        (TTL 15s)
    ├── evm_chains       (永久)
    └── kv_cache         (可变 TTL)
```

### IPC 通信

前端通过 `@tauri-apps/api/core` 的 `invoke()` 调用 Rust 后端命令。`src/lib/ipc.ts` 封装了统一的 `zoo` 接口和 `IpcError` 错误类，所有后端异常统一捕获为 `IpcError` 实例。

详细 API 文档见 [docs/API.md](./docs/API.md)。
架构设计文档见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

## 构建产物

| 平台 | 格式 | 命令 |
|---|---|---|
| macOS | `.dmg` / `.app` | `make build` |
| Windows | `.msi` / `.exe` (NSIS) | `make build` |
| Linux | `.AppImage` / `.deb` | `make build` |

产物输出到 `src-tauri/target/release/bundle/`。

## 配置

### RPC 节点

RPC 端点在 `src-tauri/src/services/rpc.rs` 中管理，支持动态注册和故障切换。所有 HTTP 请求通过全局 `reqwest::Client` 连接池发送。

### EVM 链注册

通过 `evm_register_chains` 命令动态注册自定义 EVM 链，配置自动持久化到 SQLite。

### UI 主题

编辑 `tailwind.config.js` 中的颜色定义（深空灰主题）。

### 图标配置

替换 `src-tauri/icons/` 目录下的图标文件：

| 文件 | 用途 |
|---|---|
| `32x32.png` | 小图标 |
| `128x128.png` | 标准图标 |
| `128x128@2x.png` | Retina 图标 |
| `icon.icns` | macOS |
| `icon.ico` | Windows |

## 路线图

ZooWallet 按 8 阶段增量交付，**MVP 优先**：

| Phase | 主题 | 状态 |
|------|------|------|
| 0 | 项目骨架 / Makefile / CI 基础 | 📋 已规划 |
| 1 | **MVP**：单链 ETH 钱包（创建 + 查余额 + 转账） | 📋 已规划 |
| 2 | 钱包管理完整化（HD 派生 / 导入 / 观察 / 改密） | 待规划 |
| 3 | ETH 完整化（代币 / Gas 三档 / 历史 / 加速取消 / Calldata 解码） | 待规划 |
| 4 | 比特币 (BTC) 模块 | 待规划 |
| 5 | Solana (SOL) 模块（含 SPL Token + Token-2022） | 待规划 |
| 6 | 通用 EVM L2 链（Arbitrum / Optimism / Base / Polygon …） | 待规划 |
| 7 | 缓存与韧性（SQLite WAL / RPC 故障切换 / 限流） | 待规划 |
| 8 | 价格服务 + 收尾打磨（自定义代币 / 地址簿 / 自动锁屏 / 通知 / a11y / CSP 审计） | 待规划 |

详细路线图与每阶段任务清单见 [.kiro/specs/](./.kiro/specs/)。

## 许可证

MIT
