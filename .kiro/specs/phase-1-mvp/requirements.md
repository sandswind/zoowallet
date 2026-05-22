# Phase 1 — MVP：单链 ETH 钱包

> 引用：[`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) · [`docs/API.md`](../../../docs/API.md) · [`tech-stack.md §5 安全红线`](../../steering/tech-stack.md#5-安全红线不可妥协)
>
> 前置：[Phase 0](../phase-0-foundation/requirements.md) 完成。

---

## 目标

交付一个**最小可用**的桌面钱包：用户能在本机创建一个加密保护的 ETH HD 钱包，看到 ETH 余额，并把 ETH 发到任意以太坊地址。所有签名/加密都在 Rust 后端完成；私钥/助记词全程不离开 Rust 进程。

## 用户故事

### US-1 创建钱包
> **作为新用户**，首次打开 ZooWallet 时，我会看到欢迎页 → 生成 12 词助记词 → 抄写并确认 → 设置密码 → 进入主界面。完成后再打开 App 直接看到登录态主界面。

### US-2 解锁/重新解锁
> **作为已有钱包用户**，每次启动或锁屏后，我输入正确密码即可使用钱包；连续 5 次输错被锁 60 秒。

### US-3 查看 ETH 余额
> **作为持有 ETH 的用户**，主界面顶部显示我的 ETH 地址（带复制按钮）和当前余额（精确到 6 位小数）。

### US-4 发送 ETH
> **作为用户**，我点 "Send"，填收款地址 + 金额，点"确认"后输入密码，交易广播成功后看到交易哈希链接（指向 etherscan.io）。

## 验收标准

### 后端命令（5 个）

- [ ] `generate_mnemonic` —— 返回 12 词 BIP-39 数组
- [ ] `create_from_mnemonic` —— 用密码加密保存助记词；**只派生 ETH 地址**（`m/44'/60'/0'/0/0`，EIP-55 校验和）；返回 `AccountMeta`
- [ ] `verify_password` —— 5 次失败锁定 60 秒
- [ ] `has_wallet` —— 检测 `wallet-store.json` 存在
- [ ] `get_accounts` —— 返回所有 `AccountMeta`

### 后端命令（ETH，2 个，简化版）

- [ ] `eth_get_balance(address)` —— 通过单一 RPC 端点获取余额（`https://eth.llamarpc.com`），无故障切换
- [ ] `eth_send_transaction` —— EIP-1559；用 `eth_feeHistory` 估一档默认 Gas（不暴露三档 UI）；签名走 alloy；广播后返回 `{ hash }`

### 前端页面

- [ ] `Welcome` —— 选 "创建钱包" / "导入钱包"（导入按钮先禁用 + tooltip "Phase 2"）
- [ ] `CreateWallet` —— 三步：生成助记词 → 抄写确认（随机抽 3 词验证） → 设密码（双输验证 + 强度提示）
- [ ] `Unlock` —— 输密码进入主界面；锁定时显示倒计时
- [ ] `Dashboard` —— 显示账户名 + ETH 地址（CopyButton）+ ETH 余额；右上有"锁定"按钮
- [ ] `Send` —— 表单：收款地址（实时校验 0x + 长度 + EIP-55）/ 金额；"确认"按钮弹密码弹窗 → 成功页（hash + 浏览器链接）

### 安全红线（不可降级）

- [ ] AES-256-GCM 加密 + PBKDF2-SHA512 **310,000 轮**
- [ ] 密钥派生后 `Vec<u8>` 在用完后 `zeroize()`
- [ ] 助记词、私钥结构实现 `ZeroizeOnDrop`
- [ ] 钱包文件 `tmp + rename` 原子写入
- [ ] 5 次失败 / 60 秒 锁定
- [ ] CSP：`default-src 'self'`，仅 `connect-src` 放开 `https://eth.llamarpc.com`
- [ ] 前端任何代码路径都不接触明文私钥/助记词

## 显式不做

- 多账户 / 派生新账户 / 导入私钥 / 观察钱包 → Phase 2
- 改密码 / 导出助记词 / 导出私钥 → Phase 2
- ERC-20 代币 / Gas 三档 / 交易历史 / 加速取消 / Calldata 解码 → Phase 3
- BTC / SOL / EVM L2 → Phase 4–6
- SQLite 缓存 / RPC 多节点故障切换 → Phase 7
- 价格服务 / 法币换算 / 地址簿 / 自定义代币 / 自动锁屏空闲检测 → Phase 8

## 演示路径

PR 描述需贴出以下端到端流程的截图或录屏：

1. 首启 → 欢迎页 → 创建钱包 → 抄词 → 设密码 → 主界面
2. 关闭重启 → 解锁 → 看到余额（用 Sepolia 或测试地址）
3. Send → 输入测试地址 + 0.0001 ETH → 密码 → 看到 etherscan 链接
4. 故意 5 次输错密码，看到 60 秒锁定提示
