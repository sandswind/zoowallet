# Phase 1 — 任务清单（MVP）

> 颗粒度：每条任务约对应一个 PR。完成时勾选 + 关联 PR 编号。
> 推荐执行顺序：1.x → 2.x → 3.x → 4.x → 5.x。

---

## 1. Rust 服务层（基础设施）

### 1.1 `services/crypto.rs`
- [ ] 1.1.1 添加依赖：`aes-gcm = "0.10"`、`pbkdf2 = "0.12"`、`hmac = "0.12"`、`sha2 = "0.10"`、`rand = "0.8"`、`zeroize = { version = "1.8", features = ["zeroize_derive"] }`、`base64 = "0.22"`
- [ ] 1.1.2 定义 `EncryptedBlob { iv: [u8;12], ciphertext: Vec<u8>, tag: [u8;16], salt: [u8;32] }` + serde（base64 编码）
- [ ] 1.1.3 实现 `derive_key(password, salt) -> [u8;32]`（PBKDF2-SHA512, 310_000 轮）
- [ ] 1.1.4 实现 `encrypt(plain, password) -> EncryptedBlob`（密钥用完即 zeroize）
- [ ] 1.1.5 实现 `decrypt(blob, password) -> Vec<u8>`（解密失败统一返回 `"密码不正确"`）
- [ ] 1.1.6 单元测试：encrypt → decrypt 往返、错误密码失败、salt 不同密文不同（即便明文+密码相同）

### 1.2 `services/storage.rs`
- [ ] 1.2.1 定义 `WalletStore` JSON schema（详见 [design.md §2.1](./design.md#21-数据模型)）
- [ ] 1.2.2 `load() -> WalletStore` —— 从 `app_data_dir/com.zoowallet.app/wallet-store.json` 读取；不存在返回空
- [ ] 1.2.3 `save(&WalletStore)` —— **原子写**：写 `.json.tmp` → fsync → rename
- [ ] 1.2.4 `RateLimiter` —— 5 次失败 → 锁 60s；持久化在 `WalletStore.rateLimit`；时钟用 `SystemTime`
- [ ] 1.2.5 全局 `LazyLock<Mutex<WalletStore>>`；中毒恢复 `unwrap_or_else(|p| p.into_inner())`

### 1.3 `services/rpc.rs`
- [ ] 1.3.1 全局 `static HTTP: LazyLock<reqwest::Client>`（连接池 5/host，30s 超时，rustls）
- [ ] 1.3.2 暴露常量 `ETH_RPC`（`https://eth.llamarpc.com`），Phase 7 替换为故障切换函数

### 1.4 `models/mod.rs`
- [ ] 1.4.1 `AccountMeta { id, name, type: "hd"|"imported"|"watch", chain: Option<String>, addresses: AccountAddresses, index: Option<u32> }` —— serde rename: `account_type → "type"`
- [ ] 1.4.2 `AccountAddresses { eth, btc, sol }` —— serde rename 到 `ETH/BTC/SOL`

---

## 2. Wallet 命令（5 个）

### 2.1 `commands/wallet.rs`
- [ ] 2.1.1 添加依赖：`bip39 = "2"`、`alloy = { version = "0.x", features = ["signers", "providers", "k256"] }`、`uuid = { version = "1", features = ["v4"] }`
- [ ] 2.1.2 `#[command] fn generate_mnemonic() -> Result<Vec<String>, String>` —— 12 词英文
- [ ] 2.1.3 `#[command] fn create_from_mnemonic(words, password, name) -> Result<AccountMeta, String>`
  - 校验 12 词 BIP-39
  - 派生 ETH 私钥（路径 `m/44'/60'/0'/0/0`），地址 EIP-55
  - 加密保存：`passwordVerify`（"OK" 字符串加密）、`mnemonic`（明文助记词加密）、账户的 `ethPrivateKey`
  - 助记词和私钥用完立即 zeroize
- [ ] 2.1.4 `#[command] fn verify_password(password) -> Result<bool, String>` —— 接入 RateLimiter；失败返回 `"密码不正确"` 或 `"密码尝试次数过多，请 N 秒后重试"`
- [ ] 2.1.5 `#[command] fn has_wallet() -> Result<bool, String>` —— 检测文件 + 字段非空
- [ ] 2.1.6 `#[command] fn get_accounts() -> Result<Vec<AccountMeta>, String>`
- [ ] 2.1.7 在 `lib.rs::run()` 注册以上 5 个命令

---

## 3. ETH 命令（2 个，简化版）

### 3.1 `commands/eth.rs`
- [ ] 3.1.1 `#[command] async fn eth_get_balance(address) -> Result<String, String>` —— alloy Provider 走 `ETH_RPC`，返回格式化 ETH（如 `"1.500000"`）
- [ ] 3.1.2 `#[command] async fn eth_send_transaction(account_id, password, to, amount, ...) -> Result<HashOut, String>`
  - 步骤：verify_password → decrypt_eth_private_key → 获取 nonce/base_fee/priority → estimate_gas → 构 EIP-1559 tx → 签名 → 广播
  - 错误转换：余额不足 / nonce 错乱 / RPC 失败 → 中文用户可读消息
  - **MVP 简化**：不接收前端传来的 `max_fee_gwei` / `priority_fee_gwei`，参数名保留但用后端默认值；Phase 3 切换为前端传值
- [ ] 3.1.3 在 `lib.rs::run()` 注册 2 个命令

---

## 4. 前端

### 4.1 IPC + Stores
- [ ] 4.1.1 `src/lib/ipc.ts` —— `IpcError`、`safeInvoke`、`zoo` 命名空间（详见 [design.md §4.3](./design.md#43-ipc-层-srclibipcts)）
- [ ] 4.1.2 `src/types/index.ts` —— `AccountMeta`、`AccountAddresses` 类型
- [ ] 4.1.3 `src/stores/walletStore.ts` —— Zustand：`accounts`、`currentAccount`、`balance`、`isUnlocked`、actions（**不持久化**）
- [ ] 4.1.4 `src/stores/uiStore.ts` —— `currentPage`、`notification`、`showNotification`、`lock`/`unlock`

### 4.2 通用组件
- [ ] 4.2.1 `Button` / `Input` / `Modal` / `CopyButton` / `Spinner` —— Tailwind 基础样式
- [ ] 4.2.2 `PasswordModal` —— 接受 `onSubmit(password)`，含强度提示
- [ ] 4.2.3 `<ErrorBoundary>` 已在 Phase 0；本 phase 验证 send 失败时仍能正常 toast

### 4.3 页面
- [ ] 4.3.1 `pages/Welcome.tsx` —— 两个按钮："创建钱包" / "导入钱包"（后者禁用 + tooltip "Phase 2 上线"）
- [ ] 4.3.2 `pages/CreateWallet.tsx` —— 三步：
  - Step1 调 `zoo.generateMnemonic()` 显示 12 词 + 复制
  - Step2 随机隐藏 3 个槽位让用户填回（验证抄写）
  - Step3 设密码（双输 + 强度），调 `createWalletFromMnemonic`，成功后 `setIsUnlocked(true)` → `dashboard`
- [ ] 4.3.3 `pages/Unlock.tsx` —— 输密码调 `verifyPassword`；锁定中显示倒计时
- [ ] 4.3.4 `pages/Dashboard.tsx` —— 顶部账户名 + 地址（CopyButton）+ ETH 余额；"刷新"按钮重拉余额；右上"锁定"按钮
- [ ] 4.3.5 `pages/Send.tsx` —— 表单（地址 + 金额，地址实时校验）+ "下一步"打开 PasswordModal → 调用发送 → 跳 `send-success`
- [ ] 4.3.6 `pages/SendSuccess.tsx` —— 显示 hash + Etherscan 链接 + "完成"返回 Dashboard

### 4.4 启动逻辑
- [ ] 4.4.1 `App.tsx` 启动时调 `has_wallet()` 决定初始页（welcome / unlock / dashboard）
- [ ] 4.4.2 `Dashboard` mount 时调 `eth.getBalance(currentAccount.addresses.ETH)`
- [ ] 4.4.3 全局 toast 容器在 `AppInner` 渲染

---

## 5. 安全验证（必须做的事）

- [ ] 5.1 review：grep 全代码库，确认前端无任何 `mnemonic` / `privateKey` 持久化（不进 Zustand persist、不进 localStorage、不进 sessionStorage）
- [ ] 5.2 review：所有持有派生密钥/明文助记词/私钥的 Rust 局部变量在用完后 `zeroize()` 或被 `ZeroizeOnDrop` 包裹
- [ ] 5.3 测试：5 次错误密码后第 6 次输入正确密码 → 仍被拒绝；倒计时结束后再试正确密码 → 成功
- [ ] 5.4 测试：人为破坏 `wallet-store.json` 后启动 → 错误提示，不崩溃
- [ ] 5.5 review：`tauri.conf.json` 的 CSP 不含 `'unsafe-inline'` / `'unsafe-eval'`；`connect-src` 仅放开 `https://eth.llamarpc.com` + 开发期 `http://localhost:1420`
- [ ] 5.6 review：`docs/API.md` 中 5 个 wallet 命令 + 2 个 eth 命令的签名与实际实现一致

---

## 6. 演示与发布

- [ ] 6.1 在测试网（Sepolia）跑通端到端：创建 → 解锁 → 看余额 → 发交易
- [ ] 6.2 PR 描述贴录屏 / 截图 / etherscan 交易链接
- [ ] 6.3 在 `00-overview.md` 把 Phase 1 状态从 📋 改为 ✅
- [ ] 6.4 启动 Phase 2 spec 起草（`.kiro/specs/phase-2-wallet-mgmt/`）

---

## 退出条件

- [requirements.md 验收标准](./requirements.md#验收标准) 全部勾选
- 安全验证 §5 全部通过
- `make check` 全绿
- 至少在 Sepolia 跑通一次真实交易
