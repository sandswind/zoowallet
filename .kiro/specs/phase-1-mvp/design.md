# Phase 1 — 技术设计

> 本设计是 [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) 的 MVP 子集。后续 phase 在此基础上扩展。

---

## 1. Rust 模块布局（MVP 实际启用部分）

```
src-tauri/src/
├── main.rs
├── lib.rs                  # run()：注册 7 个命令 + setup hook
├── commands/
│   ├── mod.rs
│   ├── wallet.rs           # 5 个 wallet 命令
│   └── eth.rs              # 2 个 eth 命令（简化版）
├── services/
│   ├── mod.rs
│   ├── crypto.rs           # PBKDF2 + AES-GCM + zeroize
│   ├── storage.rs          # wallet-store.json 原子写 + 限流
│   └── rpc.rs              # 极简：单 RPC URL，全局 reqwest::Client
└── models/
    └── mod.rs              # AccountMeta / AccountAddresses
```

> Phase 1 **不启用** `services/db.rs`（SQLite 缓存层）；Phase 7 引入。

---

## 2. 加密设计

### 2.1 数据模型

`wallet-store.json` 顶层结构（JSON）：

```json
{
  "version": 1,
  "passwordVerify": {
    "iv": "<base64 12B>",
    "ciphertext": "<base64 任意>",
    "tag": "<base64 16B>",
    "salt": "<base64 32B>"
  },
  "mnemonic": { "iv":..., "ciphertext":..., "tag":..., "salt":... },
  "accounts": [
    {
      "id": "<uuid>",
      "name": "Account 1",
      "type": "hd",
      "index": 0,
      "addresses": { "ETH": "0x..." },
      "ethPrivateKey": { "iv":..., "ciphertext":..., "tag":..., "salt":... }
    }
  ],
  "rateLimit": { "fails": 0, "lockedUntil": 0 }
}
```

> 每个加密块独立 salt + iv。这样改密时只需重新加密 `passwordVerify` + `mnemonic` + 各账户私钥块，不需要改文件结构。

### 2.2 密钥派生

```rust
fn derive_key(password: &[u8], salt: &[u8; 32]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::<Hmac<Sha512>>(password, salt, 310_000, &mut key);
    key
}
```

- 调用方负责 `key.zeroize()`
- 不缓存派生密钥；每次加解密重新派生（用户已经输了密码，CPU 成本可接受）

### 2.3 AES-GCM 包装

```rust
fn encrypt(plain: &[u8], password: &[u8]) -> EncryptedBlob {
    let salt = random_32();
    let iv = random_12();
    let mut key = derive_key(password, &salt);
    let cipher = Aes256Gcm::new(&key.into());
    let mut buf = plain.to_vec();
    let tag = cipher.encrypt_in_place_detached(&iv.into(), b"", &mut buf)?;
    key.zeroize();
    EncryptedBlob { iv, ciphertext: buf, tag, salt }
}
```

### 2.4 暴力破解防护

`services/storage.rs`：

```rust
struct RateLimiter {
    fails: u32,
    locked_until: SystemTime,
}
// 5 次失败 → locked_until = now + 60s；成功 → fails = 0
```

持久化在 `rateLimit` 字段中，避免重启绕过。

---

## 3. ETH 集成（最小子集）

### 3.1 RPC

MVP 只用一个 RPC：`https://eth.llamarpc.com`。封装为：

```rust
static HTTP: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .pool_max_idle_per_host(5)
        .timeout(Duration::from_secs(30))
        .use_rustls_tls()
        .build().unwrap()
});

const ETH_RPC: &str = "https://eth.llamarpc.com";
```

> Phase 7 时把 `ETH_RPC` 替换为 `get_best_rpc("ETH")`，加入故障切换 + 评分。Phase 1 阶段调用方写死即可。

### 3.2 余额查询

```rust
let provider = ProviderBuilder::new().on_http(ETH_RPC.parse()?);
let wei = provider.get_balance(addr).await?;
let eth = format_units(wei, "ether")?;  // alloy::primitives::utils
```

### 3.3 发送交易

1. `verify_password(&password)` → 失败立刻返回（同时更新 RateLimiter）
2. `decrypt_eth_private_key(account_id, &password)` → `SecretKey`（impl `ZeroizeOnDrop`）
3. `provider.get_transaction_count(addr)` → nonce
4. `provider.get_block(latest)` 拿 base_fee；`provider.get_max_priority_fee_per_gas()` 拿 priority
5. 构 EIP-1559 tx：`max_fee = base_fee * 2 + priority`、`max_priority_fee = priority`
6. `provider.estimate_gas(tx)`
7. `wallet.sign_transaction(tx)` → 签名 raw
8. `provider.send_raw_transaction(raw)` → hash
9. 返回 `{ hash: format!("0x{:x}", hash) }`；`SecretKey` 离开作用域时自动 zeroize

> MVP **不暴露** 三档 Gas，仅用上述默认计算。Phase 3 引入 `eth_get_gas_options` 后再切到三档。

---

## 4. 前端模块

### 4.1 路由（uiStore 驱动）

不引 react-router；用 Zustand 管 `currentPage`：

```ts
type Page = 'welcome' | 'create' | 'unlock' | 'dashboard' | 'send' | 'send-success';
```

启动时根据 `has_wallet()` 决定初始页：
- `false` → `welcome`
- `true` 且未解锁 → `unlock`
- `true` 且已解锁 → `dashboard`

### 4.2 Stores

| Store | MVP 字段 |
|-------|---------|
| `walletStore` | `accounts`、`currentAccount`、`balance`、`isUnlocked`（不持久化） |
| `uiStore` | `currentPage`、`notification`、`isLoading` |

> Zustand `persist` 中间件 MVP 仅用于 `uiStore` 的主题/语言（如有）。**钱包数据不进 localStorage**。

### 4.3 IPC 层（`src/lib/ipc.ts`）

```ts
export class IpcError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

export async function safeInvoke<T>(cmd: string, args?: object): Promise<T> {
  try { return await invoke<T>(cmd, args); }
  catch (e) {
    const msg = typeof e === 'string' ? e : '操作失败';
    throw new IpcError(cmd, msg);
  }
}

export const zoo = {
  generateMnemonic: () => safeInvoke<string[]>('generate_mnemonic'),
  hasWallet: () => safeInvoke<boolean>('has_wallet'),
  verifyPassword: (password: string) => safeInvoke<boolean>('verify_password', { password }),
  createWalletFromMnemonic: (args: { words: string[]; password: string; name: string }) =>
    safeInvoke<AccountMeta>('create_from_mnemonic', args),
  getAccounts: () => safeInvoke<AccountMeta[]>('get_accounts'),
  eth: {
    getBalance: (address: string) => safeInvoke<string>('eth_get_balance', { address }),
    sendTransaction: (args: SendEthArgs) => safeInvoke<{ hash: string }>('eth_send_transaction', args),
  },
};
```

### 4.4 关键交互

- **创建钱包流程**：`generateMnemonic` 后助记词只在前端 React state 暂留，**不进 store**；用户确认完毕调 `createWalletFromMnemonic` 后立刻 `setMnemonic(null)`。
- **发送流程**：`Send` 表单收集地址 + 金额 → 弹密码 Modal → `eth.sendTransaction` → 成功页。Modal 关闭后立刻清密码 state。

---

## 5. 不在 MVP 范围（明确边界）

| 能力 | 推到 |
|------|------|
| BTC / SOL 派生（即使是只派生地址） | Phase 2/4/5 |
| ERC-20 代币 | Phase 3 |
| Gas 三档 / 加速 / 取消 / Calldata 解码 / 历史 | Phase 3 |
| RPC 故障切换 / 多节点评分 | Phase 7 |
| SQLite 缓存 | Phase 7 |
| 价格服务 / 法币 / 24h 涨跌 | Phase 8 |
| 自定义代币 / 地址簿 / 自动锁屏 / 全局通知 | Phase 8 |

---

## 6. 关键风险

| 风险 | 缓解 |
|------|------|
| alloy v0.x API 仍在变 | 在 `Cargo.toml` 用 `=` 精确锁定版本 |
| `wallet-store.json` 写入中途崩溃导致损坏 | 严格 tmp + rename；启动时校验 JSON 完整性，损坏则 fallback 到 `.bak` |
| 用户忘密码 → 数据无法恢复 | 这是设计预期；UI 在创建时强提示"密码无法找回" |
| MVP 单 RPC 端点宕机 | 文档显式说明 MVP 局限；故障切换在 Phase 7 解决 |
