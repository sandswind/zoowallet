# ZooWallet 阶段路线图

> 总目标：交付一个安全、跨链（ETH / BTC / SOL / EVM L2）的 Tauri v2 桌面钱包。
>
> 总命令数：**52 个 Tauri 命令** + 2 个前端系统接口（来源：[`docs/API.md`](../../docs/API.md)）。

---

## 原则

1. **MVP 先**：先用单链（ETH）打通"创建钱包 → 查余额 → 转账"这条线，验证架构成立。
2. **每个 phase 自成完整切片**：合并后产物可运行、可演示，不留半成品分支。
3. **安全红线一视同仁**：从 MVP 开始就用 PBKDF2-310k + AES-256-GCM + zeroize。**不允许**先跑通再加密。
4. **缓存与故障切换后置**：SQLite 缓存层、RPC 多节点评分等性能/韧性能力放到 Phase 7，不污染 MVP。
5. **观察钱包从一开始就隔离**：`is_watch_account()` 检查在引入第一个签名命令时就到位。

---

## 阶段总览

| Phase | 主题 | 状态 | 关键产出 |
|------|------|------|---------|
| 0 | 项目骨架 / Makefile / CI 基础 | 📋 已规划 | 可编译的空壳，`make dev` 能起 Tauri 窗口 |
| 1 | **MVP**：单链 ETH 钱包（创建 + 查余额 + 转账） | 📋 已规划 | 一个能给真实地址转账的最小钱包 |
| 2 | 钱包管理完整化（HD 派生 / 导入 / 观察 / 改密） | 待规划 | `wallet.*` 11 个命令全部完成 |
| 3 | ETH 完整化（代币 / Gas 三档 / 历史 / 加速取消 / Calldata 解码） | 待规划 | `eth.*` 14 个命令全部完成 |
| 4 | 比特币 (BTC) 模块 | 待规划 | `btc.*` 6 个命令；P2WPKH 全流程 |
| 5 | Solana (SOL) 模块（含 SPL Token + Token-2022） | 待规划 | `sol.*` 12 个命令；含 Token-2022 转账税预览 |
| 6 | 通用 EVM L2 链（Arbitrum / Optimism / Base / Polygon …） | 待规划 | `evm.*` 9 个命令；动态链注册 |
| 7 | 缓存与韧性（SQLite WAL / RPC 故障切换 / 限流） | 待规划 | `services/db.rs` + `services/rpc.rs` 强化 |
| 8 | 价格服务 + 收尾打磨（自定义代币 / 地址簿 / 自动锁屏 / 通知 / a11y / CSP 审计） | 待规划 | `price.*` 2 个命令 + 全量 UX/安全打磨 |

> 状态图例：📋 已规划（有 spec） · 🚧 进行中 · ✅ 已完成 · 待规划（spec 未写）

---

## Phase 1（MVP）范围说明

详细见 [phase-1-mvp/requirements.md](./phase-1-mvp/requirements.md)。

**包含**：
- 助记词生成（`generate_mnemonic`）
- 创建 HD 钱包（`create_from_mnemonic`，**仅派生 ETH 地址**）
- 密码验证（`verify_password`）
- 是否已有钱包（`has_wallet`）
- 获取账户列表（`get_accounts`）
- 查 ETH 原生币余额（`eth_get_balance`）
- 发送 ETH 原生转账（`eth_send_transaction`，**只支持 EIP-1559，单档默认 Gas**）
- 前端：Welcome → CreateWallet → Dashboard（仅 ETH）→ Send（仅 ETH）→ Lock 屏幕

**显式排除**（推到后续 phase）：
- 导入私钥 / 观察钱包 / HD 派生新账户（→ Phase 2）
- 改密码 / 导出助记词 / 导出私钥（→ Phase 2）
- ERC-20 代币 / Gas 三档 UI / 交易历史 / 加速取消 / Calldata 解码（→ Phase 3）
- BTC / SOL / EVM L2（→ Phase 4–6）
- SQLite 缓存（→ Phase 7；MVP 直接走 RPC）
- 价格服务、自定义代币、地址簿、自动锁屏空闲检测、CSP 严格收紧（→ Phase 8）

---

## 命令在各 Phase 的归属

| 模块 | 命令 | Phase |
|------|------|-------|
| `generate_mnemonic` | wallet | 1 |
| `create_from_mnemonic` | wallet | 1 |
| `verify_password` | wallet | 1 |
| `has_wallet` | wallet | 1 |
| `get_accounts` | wallet | 1 |
| `derive_next_account` | wallet | 2 |
| `import_private_key` | wallet | 2 |
| `import_watch_wallet` | wallet | 2 |
| `export_mnemonic` | wallet | 2 |
| `get_private_key` | wallet | 2 |
| `change_password` | wallet | 2 |
| `eth_get_balance` | eth | 1 |
| `eth_send_transaction` | eth | 1 (简化) → 3 (完整 EIP-1559 三档) |
| `eth_get_token_balances` | eth | 3 |
| `eth_get_gas_options` | eth | 3 |
| `eth_send_token` | eth | 3 |
| `eth_decode_calldata` | eth | 3 |
| `eth_preview_transaction` | eth | 3 |
| `eth_query_token_info` | eth | 3 |
| `eth_get_custom_token_balance` | eth | 3 / 8 |
| `eth_get_history` | eth | 3 |
| `eth_estimate_gas` | eth | 3 |
| `eth_speed_up_transaction` | eth | 3 |
| `eth_cancel_transaction` | eth | 3 |
| `btc_*` (6 个) | btc | 4 |
| `sol_*` (12 个) | sol | 5 |
| `evm_*` (9 个) | evm | 6 |
| `price_*` (2 个) | price | 8 |

---

## 完成判据

每个 phase 视为完成需要满足：

1. 该 phase 所列任务全部勾选完成
2. `make check` 全量通过（Rust + TS）
3. 该 phase 引入的命令全部在 `docs/API.md` 有对应记录
4. 至少有一条端到端手工演示路径在 PR 描述里写清楚（截图或步骤）
5. 安全红线（见 [`tech-stack.md` §5](../steering/tech-stack.md#5-安全红线不可妥协)）未被违反
