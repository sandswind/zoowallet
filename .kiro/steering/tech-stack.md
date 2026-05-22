---
inclusion: always
---

# ZooWallet 技术栈与开发约定

> 本文档为 always-included steering，所有 ZooWallet 相关工作必须遵守。
> 项目级介绍见 [`README.md`](../../README.md)，详细架构见 [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)，命令接口见 [`docs/API.md`](../../docs/API.md)。

---

## 1. 运行环境

| 工具 | 版本约束 | 说明 |
|------|---------|------|
| Node.js | **20+** | 用 `nvm` 或 `volta` 锁定本地版本 |
| Rust | **最新 stable** | 通过 `rustup` 安装；不依赖 nightly 特性 |
| Yarn | **classic（v1.x）** | 包管理器，**不要使用** `npm` 或 `pnpm`；`yarn.lock` 必须提交 |

### 系统依赖（Tauri）

| 平台 | 依赖 |
|------|------|
| macOS | Xcode Command Line Tools |
| Windows | Visual Studio Build Tools + WebView2 |
| Linux | `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` 等 |

---

## 2. 核心技术栈

| 层 | 技术 | 锁定版本 |
|---|---|---|
| 桌面框架 | Tauri | **v2** (latest stable) |
| 前端 | React | **18** |
| 语言 | TypeScript | **5.7** |
| 构建 | Vite | **8** |
| 样式 | Tailwind CSS | **3.4** |
| 状态 | Zustand | **5** |
| Rust 异步运行时 | tokio | latest |

完整 Rust 依赖列表见 [架构文档 §2](../../docs/ARCHITECTURE.md#2-技术选型)。

---

## 3. Makefile 工作流（强制）

所有常用命令必须通过 `Makefile` 暴露。开发者只用 `make`，不直接调用 `cargo` / `yarn`。

| 目标 | 行为 |
|------|------|
| `make install` | 安装所有依赖（`yarn install` + `cargo fetch`） |
| `make dev` | 开发模式（Vite HMR + Tauri 窗口） |
| `make dev-web` | 仅启动 Vite 前端（无 Tauri 窗口，便于纯前端调试） |
| `make build` | 生产构建（生成安装包） |
| `make build-debug` | 调试构建（保留符号，更快） |
| `make check` | 全量检查（Rust `cargo check` + TypeScript `tsc --noEmit`） |
| `make clippy` | Rust lint（`cargo clippy --all-targets -- -D warnings`） |
| `make fmt` | 格式化 Rust 代码（`cargo fmt`）+ 前端 Prettier（如启用） |
| `make clean` | 清理所有构建产物（`dist/`、`src-tauri/target/`、`node_modules/.vite`） |
| `make db-path` | 输出本机缓存数据库 `cache.db` 路径 |
| `make db-clear` | 删除缓存数据库（用于排错） |
| `make info` | 显示工具链版本（node / rustc / cargo / tauri-cli） |
| `make loc` | 统计代码行数（`tokei` 或 `cloc`） |
| `make help` | 列出所有可用 target |

**约定**：新增的常用命令一律加进 Makefile，不在 README 里写裸命令。

---

## 4. 目录约定

```
/
├── README.md
├── Makefile                 # 工作流入口
├── package.json             # 前端依赖
├── yarn.lock                # 锁定文件（必须提交）
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/                     # 前端 React + TS
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   │   ├── layout/          # AppShell, Sidebar
│   │   ├── ui/              # Button, Input, Modal(a11y) 等
│   │   ├── wallet/          # AssetOverview, TokenList(memo), TxItem
│   │   └── LockScreen.tsx
│   ├── store/               # Zustand（注意：单数 store/，不是 stores/）
│   ├── lib/
│   │   ├── ipc.ts           # safeInvoke + IpcError + zoo 命名空间
│   │   ├── chains.ts        # 链定义
│   │   └── types.ts         # 共享 TS 类型
│   └── styles/
│       └── globals.css
├── src-tauri/               # Rust 后端
│   ├── Cargo.toml
│   ├── Cargo.lock           # 必须提交
│   ├── tauri.conf.json
│   ├── icons/
│   └── src/
│       ├── main.rs
│       ├── lib.rs
│       ├── commands/        # wallet/eth/btc/sol/evm/price
│       ├── services/        # crypto/storage/rpc/db
│       └── models/
├── docs/
│   ├── ARCHITECTURE.md
│   └── API.md
└── .kiro/
    ├── steering/
    └── specs/
```

> **重要**：前端 store 目录是 **单数** `src/store/`（与 README 一致）。已存在的旧约定 `src/stores/` 不要再使用。

---

## 5. 安全红线（不可妥协）

以下规则在任何 PR、任何重构、任何"快速实现"中都不能违反：

- **私钥/助记词永远不出 Rust 进程**：前端永远不直接接触 `private_key`、`mnemonic`、AES `key` 等明文。
- **加密参数固定**：AES-256-GCM；PBKDF2-HMAC-SHA512；**310,000 轮**；32 字节随机 salt；12 字节随机 IV。不要"为了性能"降低迭代次数。
- **敏感数据 zeroize**：所有持有密钥/明文助记词/解密结果的 `Vec<u8>` / `String` 在使用后必须显式 `zeroize()`，或用实现了 `ZeroizeOnDrop` 的封装类型。
- **观察钱包零特权**：所有签名命令开头检查 `is_watch_account()`，命中即返回 `"观察钱包不支持此操作"`。
- **原子写入**：钱包数据文件 (`wallet-store.json`) 必须 `tmp + rename`，不允许直接写主文件。
- **暴力破解防护**：5 次失败 → 锁定 60 秒；不要为了调试方便注释掉这段代码。
- **CSP 严格白名单**：`tauri.conf.json` 的 CSP 不允许 `'unsafe-inline'` / `'unsafe-eval'`，外部域名只列必须的 RPC/API。

---

## 6. 命令接口约定

- 所有 Rust 命令以模块名前缀开头：`wallet_*` / `eth_*` / `btc_*` / `sol_*` / `evm_*` / `price_*`。
- 所有命令返回 `Result<T, String>`；错误字符串面向最终用户（中文 OK），不要泄露内部 panic / 路径 / 堆栈。
- 前端必须通过 `src/lib/ipc.ts` 的 `safeInvoke` + `zoo` 命名空间调用，不直接 `import { invoke } from '@tauri-apps/api/core'` 散落在组件里。
- 新增命令时同步更新 [`docs/API.md`](../../docs/API.md)。

---

## 7. 错误处理约定

| 层 | 规则 |
|------|------|
| Rust 命令层 | `Result<T, String>`；用户可读错误 |
| Rust 服务层 | 内部 `log::error!` 详细日志，对外返回简洁错误 |
| Rust 锁 | `Mutex::lock().unwrap_or_else(\|p\| p.into_inner())` 中毒恢复，不 panic |
| 前端 IPC | `safeInvoke` 包装；错误统一为 `IpcError` |
| 前端组件 | `try/catch` + `showNotification('error', msg)` |
| 前端根 | `<ErrorBoundary>` 包裹整个 App |

---

## 8. 分阶段交付（MVP 优先）

具体路线图见 [`.kiro/specs/00-overview.md`](../specs/00-overview.md)。原则：

1. **Phase 0 → 1（MVP）必须先于其他链接入**。MVP 限定为单链（ETH）端到端可用。
2. 任何新链/新功能必须先在 `.kiro/specs/<phase>/` 下补 `requirements.md` + `tasks.md`，再开始写代码。
3. 安全红线在每个 phase 都生效，**不允许**以"先 MVP 跑通后面再加密"为由跳过。
