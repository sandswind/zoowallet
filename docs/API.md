# ZooWallet Tauri v2 API 文档

> 本文档覆盖所有 Tauri 后端命令（`invoke`）的接口定义，包含参数说明、返回值结构和安全约束。
>
> **前端调用方式**：通过 `src/lib/ipc.ts` 导出的 `zoo` 对象调用，内部映射为 `@tauri-apps/api/core` 的 `invoke(command, params)`。

---

## 目录

1. [数据模型（共享类型）](#1-数据模型共享类型)
2. [钱包管理 (wallet)](#2-钱包管理-wallet)
3. [以太坊 (eth)](#3-以太坊-eth)
4. [比特币 (btc)](#4-比特币-btc)
5. [Solana (sol)](#5-solana-sol)
6. [通用 EVM 链 (evm)](#6-通用-evm-链-evm)
7. [价格查询 (price)](#7-价格查询-price)
8. [系统接口 (notify / on)](#8-系统接口)
9. [错误处理](#9-错误处理)
10. [安全机制](#10-安全机制)
11. [SQLite 缓存层](#11-sqlite-缓存层)

---

## 1. 数据模型（共享类型）

### AccountMeta

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `id` | `string` | `id` | 账户唯一标识（UUID） |
| `name` | `string` | `name` | 用户自定义账户名称 |
| `account_type` | `string` | `type` | 账户类型：`"hd"`（助记词派生）/ `"imported"`（私钥导入）/ `"watch"`（观察钱包） |
| `chain` | `string?` | `chain` | 导入/观察账户有值：`"ETH"` / `"BTC"` / `"SOL"` |
| `addresses` | `AccountAddresses` | `addresses` | 各链地址集合 |
| `index` | `number?` | `index` | HD 派生索引号（导入账户为 null） |

### AccountAddresses

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `eth` | `string?` | `ETH` | EIP-55 校验和格式的以太坊地址 |
| `btc` | `string?` | `BTC` | bc1 开头的 P2WPKH 原生 SegWit 地址 |
| `sol` | `string?` | `SOL` | Base58 编码的 Ed25519 公钥 |

### TokenBalance

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `symbol` | `string` | `symbol` | 代币符号，如 `"USDT"` |
| `name` | `string` | `name` | 代币全称，如 `"Tether USD"` |
| `balance` | `string` | `balance` | 格式化后的余额（已除以 decimals） |
| `decimals` | `number` | `decimals` | 代币精度（0-18） |
| `contract_address` | `string` | `contractAddress` | 合约地址 |

### GasOptions

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `slow` | `GasOption` | `slow` | 慢速档（~10 分钟） |
| `medium` | `GasOption` | `medium` | 中速档（~3 分钟） |
| `fast` | `GasOption` | `fast` | 快速档（~30 秒） |
| `base_fee_gwei` | `string?` | `baseFeeGwei` | 当前基础费（仅 EIP-1559 链） |
| `is_eip1559` | `boolean` | `isEip1559` | 是否支持 EIP-1559 |

### GasOption

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `gwei` | `string` | `gwei` | 总 Gas Price（Gwei 字符串） |
| `max_fee_gwei` | `string?` | `maxFeeGwei` | EIP-1559 最大费用 |
| `priority_fee_gwei` | `string?` | `priorityFeeGwei` | EIP-1559 优先费 |
| `estimated_time` | `string` | `estimatedTime` | 预估确认时间描述 |
| `is_eip1559` | `boolean` | `isEip1559` | 是否为 EIP-1559 计费 |

### BtcBalance

| 字段 | 类型 | 说明 |
|------|------|------|
| `confirmed` | `string` | 已确认余额（BTC） |
| `unconfirmed` | `string` | 未确认余额（BTC） |
| `total` | `string` | 总余额（BTC） |

### BtcFeeRates

| 字段 | 类型 | 说明 |
|------|------|------|
| `slow` | `FeeRateOption` | 经济档（~1 小时） |
| `medium` | `FeeRateOption` | 标准档（~30 分钟） |
| `fast` | `FeeRateOption` | 优先档（~10 分钟） |

### FeeRateOption

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `fee_rate` | `number` | `feeRate` | sat/vB 费率 |
| `estimated_time` | `string` | `estimatedTime` | 预估确认时间 |
| `gwei` | `string` | `gwei` | 兼容前端 GasOption 接口（= feeRate 字符串） |

### Utxo

| 字段 | 类型 | 说明 |
|------|------|------|
| `txid` | `string` | 交易哈希 |
| `vout` | `number` | 输出索引 |
| `value` | `number` | 金额（satoshi） |
| `confirmed` | `boolean` | 是否已确认 |

### BtcPreview

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `feasible` | `boolean` | `feasible` | 交易是否可行 |
| `reason` | `string?` | `reason` | 不可行时的原因说明 |
| `input_count` | `number?` | `inputCount` | 选中的 UTXO 数量 |
| `fee_sat` | `number?` | `feeSat` | 手续费（satoshi） |
| `fee_btc` | `string?` | `feeBtc` | 手续费（BTC 字符串） |
| `has_change` | `boolean?` | `hasChange` | 是否产生找零 |
| `total_input_sat` | `number?` | `totalInputSat` | 输入总额（satoshi） |
| `change_sat` | `number?` | `changeSat` | 找零金额（satoshi） |

### SolTokenBalance

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `mint` | `string` | `mint` | 代币 Mint 地址 |
| `balance` | `string` | `balance` | 格式化余额 |
| `decimals` | `number` | `decimals` | 精度 |
| `symbol` | `string` | `symbol` | 代币符号 |
| `program_id` | `string` | `programId` | Token 程序 ID |
| `is_token2022` | `boolean` | `isToken2022` | 是否为 Token-2022 标准 |
| `extensions` | `object?` | `extensions` | Token-2022 扩展数据（JSON） |

### SolPriorityFees

| 字段 | 类型 | 说明 |
|------|------|------|
| `slow` | `SolPriorityFeeOption` | P25 分位 |
| `medium` | `SolPriorityFeeOption` | P50 分位 |
| `fast` | `SolPriorityFeeOption` | P75 分位 |

### SolPriorityFeeOption

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `micro_lamports` | `number` | `microLamports` | 每 CU 优先费（micro-lamports） |
| `estimated_time` | `string` | `estimatedTime` | 预估确认时间 |
| `gwei` | `string` | `gwei` | 兼容 GasOption 接口 |

### MintExtensions

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `transfer_fee` | `object?` | `transferFee` | Token-2022 转账税配置 |
| `interest_bearing` | `object?` | `interestBearing` | 计息代币配置 |
| `permanent_delegate` | `object?` | `permanentDelegate` | 永久委托权配置 |
| `non_transferable` | `boolean?` | `nonTransferable` | 是否不可转让 |

### SolTransferPreview

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `has_transfer_fee` | `boolean` | `hasTransferFee` | 是否含转账税 |
| `fee` | `string?` | `fee` | 转账税金额 |
| `net_amount` | `string?` | `netAmount` | 扣税后到账金额 |
| `fee_basis_points` | `number?` | `feeBasisPoints` | 税率（基点，1bp = 0.01%） |

### EthTxPreview

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `is_contract` | `boolean` | `isContract` | 目标地址是否为合约 |
| `decoded` | `CalldataDecoded?` | `decoded` | 已解码的合约调用数据 |
| `gas_estimate` | `string` | `gasEstimate` | Gas 估算量（十进制字符串） |
| `max_fee_gwei` | `string` | `maxFeeGwei` | 当前推荐 Max Fee |

### CalldataDecoded

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 函数名称（如 `"transfer"`） |
| `params` | `CalldataParam[]` | 解码出的参数列表 |

### CalldataParam

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `string` | 参数名（如 `"to"`, `"amount"`） |
| `value` | `string` | 参数值（十六进制地址或十进制数值） |

### TxRecord

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `hash` | `string` | `hash` | 交易哈希 |
| `from` | `string` | `from` | 发送方地址 |
| `to` | `string` | `to` | 接收方地址 |
| `value` | `string` | `value` | 交易金额（原生币单位） |
| `timestamp` | `number` | `timestamp` | Unix 时间戳（秒） |
| `gas_used` | `string?` | `gasUsed` | 实际消耗 Gas |
| `gas_price` | `string?` | `gasPrice` | Gas 价格 |
| `is_error` | `boolean` | `isError` | 交易是否失败 |
| `method` | `string?` | `method` | 调用的合约方法名 |
| `confirmations` | `string?` | `confirmations` | 确认数 |

### PriceData

| 字段 | 类型 | 说明 |
|------|------|------|
| `usd` | `number` | 美元价格 |
| `cny` | `number` | 人民币价格 |
| `change24h` | `number` | 24 小时涨跌幅（百分比） |

### EvmChainConfig

| 字段 | 类型 | JSON 键 | 说明 |
|------|------|---------|------|
| `id` | `string` | `id` | 链标识（如 `"arbitrum"`） |
| `name` | `string` | `name` | 链名称（如 `"Arbitrum One"`） |
| `chain_id` | `number` | `chainId` | EIP-155 链 ID（如 `42161`） |
| `symbol` | `string` | `symbol` | 原生代币符号（如 `"ETH"`） |
| `decimals` | `number` | `decimals` | 原生代币精度（通常 `18`） |
| `rpc_urls` | `string[]` | `rpcUrls` | RPC 端点列表 |
| `explorer_url` | `string?` | `explorerUrl` | 区块浏览器 URL |
| `explorer_api_url` | `string?` | `explorerApiUrl` | Etherscan 兼容 API URL |
| `color` | `string?` | `color` | 链主题色（十六进制） |
| `is_builtin` | `boolean` | `isBuiltin` | 是否内置链 |

---

## 2. 钱包管理 (wallet)

### 2.1 generate_mnemonic

生成 12 词 BIP-39 助记词。

| 属性 | 值 |
|------|-----|
| **命令名** | `generate_mnemonic` |
| **前端方法** | `zoo.generateMnemonic()` |
| **参数** | 无 |
| **返回** | `string[]` — 12 个英文助记词 |
| **鉴权** | 无 |

**示例返回**：
```json
["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident"]
```

---

### 2.2 create_from_mnemonic

从助记词创建 HD 钱包，自动派生 ETH/BTC/SOL 三链地址。

| 属性 | 值 |
|------|-----|
| **命令名** | `create_from_mnemonic` |
| **前端方法** | `zoo.createWalletFromMnemonic(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 首次设置密码 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `words` | `string[]` | 是 | 12 词助记词数组 |
| `password` | `string` | 是 | 钱包密码（将用于加密所有密钥） |
| `name` | `string` | 是 | 账户名称 |

**安全**：
- 密码经 PBKDF2-SHA512（310,000 轮）派生加密密钥
- 助记词和所有私钥以 AES-256-GCM 加密存储
- 内存中的敏感数据在使用后立即清零（zeroize）

**派生路径**：
| 链 | BIP 路径 | 地址格式 |
|----|---------|---------|
| ETH | `m/44'/60'/0'/0/0` | EIP-55 校验和 |
| BTC | `m/84'/0'/0'/0/0` | bc1... P2WPKH |
| SOL | `m/44'/501'/0'/0'` | Base58 Ed25519 |

---

### 2.3 derive_next_account

从现有助记词派生下一个 HD 账户。

| 属性 | 值 |
|------|-----|
| **命令名** | `derive_next_account` |
| **前端方法** | `zoo.deriveNextAccount(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 需要密码验证 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `password` | `string` | 是 | 钱包密码 |
| `name` | `string` | 是 | 新账户名称 |

**逻辑**：自动检测现有最大 HD index，派生 index + 1 的新账户。

---

### 2.4 import_private_key

导入单链私钥创建账户。

| 属性 | 值 |
|------|-----|
| **命令名** | `import_private_key` |
| **前端方法** | `zoo.importPrivateKey(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 需要密码验证 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain` | `string` | 是 | 目标链：`"ETH"` / `"BTC"` / `"SOL"` |
| `private_key` | `string` | 是 | 私钥（ETH: hex, BTC: WIF, SOL: base58 或 hex） |
| `password` | `string` | 是 | 钱包密码 |
| `name` | `string` | 是 | 账户名称 |

**注意**：导入账户仅包含指定链的地址，`type` 为 `"imported"`。

---

### 2.5 import_watch_wallet

导入观察者钱包（Watch-Only），只需地址，无私钥/助记词。

| 属性 | 值 |
|------|-----|
| **命令名** | `import_watch_wallet` |
| **前端方法** | `zoo.importWatchWallet(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 无需密码 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | 链上地址 |
| `chain` | `string` | 是 | 目标链：`"ETH"` / `"BTC"` / `"SOL"` |
| `name` | `string` | 是 | 账户名称 |

**地址格式校验**：

| 链 | 校验规则 |
|------|------|
| ETH | `0x` 开头，42 字符 |
| BTC | `bc1` / `1` / `3` 开头 |
| SOL | Base58 编码的 32 字节公钥 |

**注意**：
- 观察者钱包 `type` 为 `"watch"`，只能查看资产，**不能执行任何交易**
- 所有发送/加速/取消交易命令对 `watch` 类型账户返回错误 `"观察钱包不支持此操作"`
- `get_private_key` 对 `watch` 类型账户返回错误 `"观察钱包无私钥，无法导出"`

---

### 2.6 get_accounts

获取所有账户元数据。

| 属性 | 值 |
|------|-----|
| **命令名** | `get_accounts` |
| **前端方法** | `zoo.getAccounts()` |
| **参数** | 无 |
| **返回** | `AccountMeta[]` |
| **鉴权** | 无 |

---

### 2.7 has_wallet

检查是否已创建钱包。

| 属性 | 值 |
|------|-----|
| **命令名** | `has_wallet` |
| **前端方法** | `zoo.hasWallet()` |
| **参数** | 无 |
| **返回** | `boolean` |
| **鉴权** | 无 |

---

### 2.8 export_mnemonic

导出助记词（需密码验证）。

| 属性 | 值 |
|------|-----|
| **命令名** | `export_mnemonic` |
| **前端方法** | `zoo.exportMnemonic(args)` |
| **返回** | `string[]` — 12 词助记词 |
| **鉴权** | **需要密码验证 + 暴力破解防护** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `password` | `string` | 是 | 钱包密码 |

---

### 2.9 get_private_key

导出指定链的私钥（需密码验证）。

| 属性 | 值 |
|------|-----|
| **命令名** | `get_private_key` |
| **前端方法** | `zoo.getPrivateKey(args)` |
| **返回** | `string` — 十六进制编码私钥 |
| **鉴权** | **需要密码验证 + 暴力破解防护** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `chain` | `string` | 是 | `"ETH"` / `"BTC"` / `"SOL"` |
| `password` | `string` | 是 | 钱包密码 |

---

### 2.10 verify_password

验证钱包密码。

| 属性 | 值 |
|------|-----|
| **命令名** | `verify_password` |
| **前端方法** | `zoo.verifyPassword(password)` |
| **返回** | `boolean` |
| **安全** | 暴力破解防护：5 次错误后锁定 60 秒 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `password` | `string` | 是 | 待验证密码 |

---

### 2.11 change_password

修改钱包密码（重新加密所有数据）。

| 属性 | 值 |
|------|-----|
| **命令名** | `change_password` |
| **前端方法** | `zoo.changePassword(args)` |
| **返回** | `void` |
| **鉴权** | 需验证旧密码 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `old_password` | `string` | 是 | 当前密码 |
| `new_password` | `string` | 是 | 新密码 |

---

## 3. 以太坊 (eth)

### 3.1 eth_get_balance

查询 ETH 余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_get_balance` |
| **前端方法** | `zoo.eth.getBalance(address)` |
| **返回** | `string` — 格式化后的 ETH 余额（如 `"1.5"` ） |
| **RPC** | alloy Provider via `get_best_rpc("ETH")` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | 以太坊地址（0x...） |

---

### 3.2 eth_get_token_balances

获取地址持有的 ERC-20 代币余额列表。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_get_token_balances` |
| **前端方法** | `zoo.eth.getTokenBalances(address)` |
| **返回** | `TokenBalance[]` |
| **数据源** | Etherscan `tokentx` API + JSON-RPC `eth_call` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | 以太坊地址 |

**逻辑**：先通过 Etherscan 发现代币合约，再并发查询实时 `balanceOf` 余额。

---

### 3.3 eth_get_gas_options

获取 EIP-1559 三档 Gas 费建议。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_get_gas_options` |
| **前端方法** | `zoo.eth.getGasOptions()` |
| **参数** | 无 |
| **返回** | `GasOptions` |
| **RPC** | `eth_getBlockByNumber` + `eth_maxPriorityFeePerGas` |

---

### 3.4 eth_send_transaction

发送 ETH 原生代币转账。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_send_transaction` |
| **前端方法** | `zoo.eth.sendTransaction(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **密码验证 → 解密私钥** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `to` | `string` | 是 | 收款地址 |
| `amount` | `string` | 是 | 发送金额（ETH 单位，如 `"0.1"`） |
| `max_fee_gwei` | `string` | 是 | EIP-1559 最大费用（Gwei） |
| `priority_fee_gwei` | `string` | 是 | EIP-1559 优先费（Gwei） |

**流程**：验证密码 → 解密私钥 → 获取 nonce → 估算 Gas → 构建 EIP-1559 交易 → 签名 → 广播

---

### 3.5 eth_send_token

发送 ERC-20 代币转账。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_send_token` |
| **前端方法** | `zoo.eth.sendToken(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **密码验证 → 解密私钥** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `contract_address` | `string` | 是 | ERC-20 合约地址 |
| `to` | `string` | 是 | 收款地址 |
| `amount` | `string` | 是 | 发送数量（最小单位由 decimals 决定） |
| `decimals` | `number` | 是 | 代币精度 |
| `max_fee_gwei` | `string` | 是 | EIP-1559 最大费用 |
| `priority_fee_gwei` | `string` | 是 | EIP-1559 优先费 |

---

### 3.6 eth_decode_calldata

解码合约调用数据（防盲签）。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_decode_calldata` |
| **前端方法** | `zoo.eth.decodeCalldata(data)` |
| **返回** | `CalldataDecoded?` — 无法识别时返回 null |
| **鉴权** | 无 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | `string` | 是 | 合约调用数据（0x 开头十六进制） |

**已支持的函数选择器**：

| Selector | 函数 |
|----------|------|
| `0xa9059cbb` | `transfer(address, uint256)` |
| `0x095ea7b3` | `approve(address, uint256)` |
| `0x23b872dd` | `transferFrom(address, address, uint256)` |
| `0x38ed1739` | `swapExactTokensForTokens(...)` |
| `0x7ff36ab5` | `swapExactETHForTokens(...)` |

---

### 3.7 eth_preview_transaction

交易预览（合约检测 + Gas 估算 + Calldata 解码）。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_preview_transaction` |
| **前端方法** | `zoo.eth.previewTransaction(args)` |
| **返回** | `EthTxPreview` |
| **鉴权** | 无 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `from` | `string` | 是 | 发送方地址 |
| `to` | `string` | 是 | 目标地址 |
| `value` | `string` | 否 | 发送金额（Wei 十六进制或十进制） |
| `data` | `string` | 否 | 调用数据（十六进制） |

---

### 3.8 eth_query_token_info

查询 ERC-20 合约基本信息（添加自定义代币用）。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_query_token_info` |
| **前端方法** | `zoo.eth.queryTokenInfo(contractAddress)` |
| **返回** | `{ symbol: string, name: string, decimals: number, contractAddress: string }` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `contract_address` | `string` | 是 | ERC-20 合约地址 |

---

### 3.9 eth_get_custom_token_balance

查询自定义 ERC-20 代币余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_get_custom_token_balance` |
| **前端方法** | `zoo.eth.getCustomTokenBalance(args)` |
| **返回** | `string` — 格式化后的余额 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | 持有人地址 |
| `contract_address` | `string` | 是 | ERC-20 合约地址 |
| `decimals` | `number` | 是 | 代币精度 |

---

### 3.10 eth_get_history

获取交易历史记录。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_get_history` |
| **前端方法** | `zoo.eth.getHistory(args)` |
| **返回** | `TxRecord[]` |
| **数据源** | Etherscan `txlist` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | 以太坊地址 |
| `page` | `number` | 是 | 页码（从 1 开始） |
| `offset` | `number` | 是 | 每页条数 |

---

### 3.11 eth_estimate_gas

估算交易 Gas 消耗。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_estimate_gas` |
| **前端方法** | `zoo.eth.estimateGas(args)` |
| **返回** | `string` — Gas 数量（十进制字符串） |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `from` | `string` | 是 | 发送方地址 |
| `to` | `string` | 是 | 目标地址 |
| `value` | `string` | 是 | 金额（Wei） |
| `data` | `string` | 是 | 调用数据 |

---

### 3.12 eth_speed_up_transaction

加速待处理交易（提高 Gas 费 + 相同 nonce 重发）。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_speed_up_transaction` |
| **前端方法** | `zoo.eth.speedUpTransaction(args)` |
| **返回** | `{ hash: string, oldHash: string }` |
| **鉴权** | **密码验证** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `tx_hash` | `string` | 是 | 待加速的交易哈希 |

**逻辑**：MaxFee 上浮 10%，PriorityFee + 2 Gwei，相同 nonce 替换原交易。

---

### 3.13 eth_cancel_transaction

取消待处理交易（向自己发送 0 ETH + 相同 nonce）。

| 属性 | 值 |
|------|-----|
| **命令名** | `eth_cancel_transaction` |
| **前端方法** | `zoo.eth.cancelTransaction(args)` |
| **返回** | `{ hash: string, oldHash: string }` |
| **鉴权** | **密码验证** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `tx_hash` | `string` | 是 | 待取消的交易哈希 |

---

## 4. 比特币 (btc)

### 4.1 btc_get_balance

查询 BTC 余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `btc_get_balance` |
| **前端方法** | `zoo.btc.getBalance(address)` |
| **返回** | `BtcBalance` |
| **数据源** | Mempool API `/address/{addr}` (故障转移) |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | BTC 地址（bc1...） |

---

### 4.2 btc_get_fee_rates

获取 BTC 三档费率建议。

| 属性 | 值 |
|------|-----|
| **命令名** | `btc_get_fee_rates` |
| **前端方法** | `zoo.btc.getFeeRates()` |
| **参数** | 无 |
| **返回** | `BtcFeeRates` |
| **数据源** | Mempool API `/v1/fees/recommended` |

---

### 4.3 btc_preview_transaction

BTC 交易预览（UTXO 选择 + 手续费计算）。

| 属性 | 值 |
|------|-----|
| **命令名** | `btc_preview_transaction` |
| **前端方法** | `zoo.btc.previewTransaction(args)` |
| **返回** | `BtcPreview` |
| **鉴权** | 无 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `from_address` | `string` | 是 | 发送方地址 |
| `to` | `string` | 是 | 收款地址 |
| `amount_btc` | `string` | 是 | 发送金额（BTC 单位，如 `"0.001"`） |
| `fee_rate` | `number` | 是 | 费率（sat/vB） |

**币选择算法**：
1. **Branch-and-Bound**：尝试找到无需找零的精确 UTXO 组合（上限 100,000 次搜索）
2. **Largest-First**：降序累加 UTXO 至满足目标金额

---

### 4.4 btc_send_transaction

构建并广播 BTC P2WPKH 交易。

| 属性 | 值 |
|------|-----|
| **命令名** | `btc_send_transaction` |
| **前端方法** | `zoo.btc.sendTransaction(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **密码验证 → 解密私钥** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `to` | `string` | 是 | 收款地址 |
| `amount_sat` | `number` | 是 | 发送金额（satoshi） |
| `fee_rate` | `number` | 是 | 费率（sat/vB） |
| `from_address` | `string` | 是 | 发送方地址（用于验证密钥匹配） |

**签名流程**：SegWit v0 SighashCache → ECDSA 签名 → Witness 构建 → POST `/tx` 广播

---

### 4.5 btc_get_history

获取 BTC 交易历史。

| 属性 | 值 |
|------|-----|
| **命令名** | `btc_get_history` |
| **前端方法** | `zoo.btc.getHistory(args)` |
| **返回** | `TxRecord[]` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | BTC 地址 |

---

### 4.6 btc_get_utxos

获取地址的 UTXO 列表。

| 属性 | 值 |
|------|-----|
| **命令名** | `btc_get_utxos` |
| **前端方法** | `zoo.btc.getUTXOs(address)` |
| **返回** | `Utxo[]` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | BTC 地址 |

---

## 5. Solana (sol)

### 5.1 sol_get_balance

查询 SOL 余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_get_balance` |
| **前端方法** | `zoo.sol.getBalance(address)` |
| **返回** | `string` — SOL 余额（如 `"1.5"` ） |
| **RPC** | `getBalance` via failover |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | Solana 地址（Base58） |

---

### 5.2 sol_get_token_balances

获取 SPL Token + Token-2022 余额列表。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_get_token_balances` |
| **前端方法** | `zoo.sol.getTokenBalances(address)` |
| **返回** | `SolTokenBalance[]` |
| **RPC** | `getTokenAccountsByOwner`（两次：SPL Token + Token-2022） |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | Solana 地址 |

---

### 5.3 sol_get_mint_extensions

查询 Token-2022 Mint 扩展信息。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_get_mint_extensions` |
| **前端方法** | `zoo.sol.getMintExtensions(mintAddress)` |
| **返回** | `MintExtensions` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mint_address` | `string` | 是 | Token Mint 地址 |

---

### 5.4 sol_preview_transfer

Token-2022 转账预览（计算转账税）。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_preview_transfer` |
| **前端方法** | `zoo.sol.previewTransfer(args)` |
| **返回** | `SolTransferPreview` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mint_address` | `string` | 是 | Token Mint 地址 |
| `amount` | `string` | 是 | 转账金额（最小单位） |
| `decimals` | `number` | 是 | 代币精度 |
| `is_token2022` | `boolean` | 是 | 是否为 Token-2022 |

---

### 5.5 sol_get_priority_fees

获取 Solana 优先费三档建议。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_get_priority_fees` |
| **前端方法** | `zoo.sol.getPriorityFees()` |
| **参数** | 无 |
| **返回** | `SolPriorityFees` |
| **RPC** | `getRecentPrioritizationFees` → 分位统计 |

---

### 5.6 sol_send_transaction

发送 SOL 原生转账。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_send_transaction` |
| **前端方法** | `zoo.sol.sendTransaction(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **密码验证 → 解密密钥对** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `to` | `string` | 是 | 收款地址 |
| `amount_sol` | `string` | 是 | 发送金额（SOL 单位） |
| `priority_fee_micro_lamports` | `number?` | 否 | 优先费（micro-lamports/CU），省略则不设 |

---

### 5.7 sol_send_token

发送 SPL Token / Token-2022 转账。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_send_token` |
| **前端方法** | `zoo.sol.sendToken(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **密码验证 → 解密密钥对** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `mint_address` | `string` | 是 | Token Mint 地址 |
| `to` | `string` | 是 | 收款地址 |
| `amount` | `string` | 是 | 发送数量（最小单位字符串） |
| `decimals` | `number` | 是 | 代币精度 |
| `is_token2022` | `boolean` | 是 | 是否 Token-2022 |
| `priority_fee_micro_lamports` | `number?` | 否 | 优先费 |

**逻辑**：自动检测接收方 ATA 是否存在，不存在则自动创建。

---

### 5.8 sol_subscribe_balance

订阅余额更新（占位接口）。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_subscribe_balance` |
| **前端方法** | `zoo.sol.subscribeBalance(args)` |
| **返回** | `{ subscribed: true, subId: 0 }` |
| **状态** | **占位实现** — WebSocket 订阅待后续完善 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | Solana 地址 |
| `window_id` | `string` | 是 | 窗口标识 |

---

### 5.9 sol_unsubscribe_balance

取消余额订阅（占位接口）。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_unsubscribe_balance` |
| **前端方法** | `zoo.sol.unsubscribeBalance(address)` |
| **返回** | `{ unsubscribed: true }` |
| **状态** | **占位实现** |

---

### 5.10 sol_get_custom_token_balance

查询自定义 SPL 代币余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_get_custom_token_balance` |
| **前端方法** | `zoo.sol.getCustomTokenBalance(args)` |
| **返回** | `string` — 格式化余额 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | 持有人地址 |
| `mint_address` | `string` | 是 | Token Mint 地址 |
| `decimals` | `number` | 是 | 代币精度 |
| `is_token2022` | `boolean` | 是 | 是否 Token-2022 |

---

### 5.11 sol_get_history

获取 SOL 交易历史。

| 属性 | 值 |
|------|-----|
| **命令名** | `sol_get_history` |
| **前端方法** | `zoo.sol.getHistory(args)` |
| **返回** | `TxRecord[]` |
| **RPC** | `getSignaturesForAddress` + 并行 `getTransaction` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `address` | `string` | 是 | Solana 地址 |
| `limit` | `number?` | 否 | 最大返回条数（默认 20） |

---

## 6. 通用 EVM 链 (evm)

### 6.1 evm_register_chains

注册 EVM L2/侧链配置。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_register_chains` |
| **前端方法** | `zoo.evm.registerChains(chains)` |
| **返回** | `boolean` — 成功返回 `true` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chains` | `EvmChainConfig[]` | 是 | 链配置数组 |

**效果**：将链配置存入全局注册表，并自动注册 RPC 端点用于故障转移。

---

### 6.2 evm_get_balance

查询 EVM 链原生代币余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_get_balance` |
| **前端方法** | `zoo.evm.getBalance(args)` |
| **返回** | `string` — 格式化余额 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识（如 `"arbitrum"`） |
| `address` | `string` | 是 | 钱包地址 |

---

### 6.3 evm_get_token_balances

获取 EVM 链 ERC-20 代币余额。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_get_token_balances` |
| **前端方法** | `zoo.evm.getTokenBalances(args)` |
| **返回** | `TokenBalance[]` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |
| `address` | `string` | 是 | 钱包地址 |

**前置条件**：链须配置 `explorerApiUrl`（Etherscan 兼容 API）。

---

### 6.4 evm_get_gas_options

获取 EVM 链 Gas 费建议。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_get_gas_options` |
| **前端方法** | `zoo.evm.getGasOptions(args)` |
| **返回** | `GasOptions` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |

**逻辑**：优先尝试 EIP-1559 `eth_feeHistory`，失败则回退到 legacy `eth_gasPrice` 三档。

---

### 6.5 evm_send_transaction

在 EVM 链上发送原生代币转账。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_send_transaction` |
| **前端方法** | `zoo.evm.sendTransaction(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **解密 ETH 私钥** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `to` | `string` | 是 | 收款地址 |
| `amount` | `string` | 是 | 金额（链原生单位） |
| `max_fee_gwei` | `string` | 是 | 最大费用 |
| `priority_fee_gwei` | `string` | 是 | 优先费 |

---

### 6.6 evm_send_token

在 EVM 链上发送 ERC-20 转账。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_send_token` |
| **前端方法** | `zoo.evm.sendToken(args)` |
| **返回** | `{ hash: string }` |
| **鉴权** | **解密 ETH 私钥** |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |
| `account_id` | `string` | 是 | 账户 ID |
| `password` | `string` | 是 | 钱包密码 |
| `contract_address` | `string` | 是 | ERC-20 合约地址 |
| `to` | `string` | 是 | 收款地址 |
| `amount` | `string` | 是 | 数量 |
| `decimals` | `number` | 是 | 精度 |
| `max_fee_gwei` | `string` | 是 | 最大费用 |
| `priority_fee_gwei` | `string` | 是 | 优先费 |

---

### 6.7 evm_preview_transaction

EVM 链交易预览。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_preview_transaction` |
| **前端方法** | `zoo.evm.previewTransaction(args)` |
| **返回** | `EthTxPreview` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |
| `from` | `string` | 是 | 发送方 |
| `to` | `string` | 是 | 目标地址 |
| `value` | `string` | 否 | 金额 |
| `data` | `string?` | 否 | 调用数据 |

---

### 6.8 evm_get_history

获取 EVM 链交易历史。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_get_history` |
| **前端方法** | `zoo.evm.getHistory(args)` |
| **返回** | `TxRecord[]` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |
| `address` | `string` | 是 | 钱包地址 |
| `page` | `number?` | 否 | 页码 |
| `offset` | `number?` | 否 | 每页条数 |

**前置条件**：链须配置 `explorerApiUrl`。

---

### 6.9 evm_estimate_gas

EVM 链 Gas 估算。

| 属性 | 值 |
|------|-----|
| **命令名** | `evm_estimate_gas` |
| **前端方法** | `zoo.evm.estimateGas(args)` |
| **返回** | `string` — Gas 数量 |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chain_id` | `string` | 是 | 链标识 |
| `from` | `string` | 是 | 发送方 |
| `to` | `string` | 是 | 目标地址 |
| `value` | `string?` | 否 | 金额 |
| `data` | `string?` | 否 | 调用数据 |

---

## 7. 价格查询 (price)

### 7.1 price_get_multiple

批量查询加密货币价格。

| 属性 | 值 |
|------|-----|
| **命令名** | `price_get_multiple` |
| **前端方法** | `zoo.price.getMultiple(symbols)` |
| **返回** | `Record<string, PriceData>` — 键为输入的 symbol |
| **数据源** | CoinGecko `simple/price` API |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `symbols` | `string[]` | 是 | 代币符号数组（如 `["BTC", "ETH", "SOL"]`） |

**内置符号映射**：

| 符号 | CoinGecko ID |
|------|-------------|
| `BTC` | `bitcoin` |
| `ETH` | `ethereum` |
| `SOL` | `solana` |
| `BNB` | `binancecoin` |
| `MATIC` | `matic-network` |
| `ARB` | `arbitrum` |
| `OP` | `optimism` |
| `AVAX` | `avalanche-2` |
| `USDT` | `tether` |
| `USDC` | `usd-coin` |

**示例返回**：
```json
{
 "BTC": { "usd": 67500.0, "cny": 487500.0, "change24h": 2.35 },
 "ETH": { "usd": 3450.0, "cny": 24900.0, "change24h": -1.20 }
}
```

---

### 7.2 price_get_chart

获取 7 天价格走势数据。

| 属性 | 值 |
|------|-----|
| **命令名** | `price_get_chart` |
| **前端方法** | `zoo.price.getChart(symbol)` |
| **返回** | `[number, number][]` — 时间戳-价格对数组 |
| **数据源** | CoinGecko `market_chart` API（7 天，USD） |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `symbol` | `string` | 是 | 代币符号（如 `"ETH"`） |

**示例返回**：
```json
[[1711900800000, 3420.5], [1711987200000, 3455.2], ...]
```

---

## 8. 系统接口

### 8.1 notify（非 Tauri 命令）

发送桌面通知。

| 属性 | 值 |
|------|-----|
| **前端方法** | `zoo.notify(args)` |
| **实现** | `@tauri-apps/plugin-notification` |

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | `string` | 是 | 通知标题 |
| `body` | `string` | 是 | 通知正文 |
| `silent` | `boolean?` | 否 | 静默通知（无声音） |

---

### 8.2 on（非 Tauri 命令）

订阅事件（Tauri 事件系统）。

| 属性 | 值 |
|------|-----|
| **前端方法** | `zoo.on(channel, callback)` |
| **实现** | `@tauri-apps/api/event` → `listen()` |
| **返回** | `() => void` — 取消订阅函数 |

**请求参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `channel` | `string` | 事件通道名（如 `"sol:balanceUpdate"`） |
| `callback` | `function` | 事件回调 |

---

## 9. 错误处理

所有 Tauri 命令返回 `Result<T, String>`，错误时 `invoke` 抛出包含中文错误描述的异常字符串。

**常见错误码**：

| 错误消息 | 触发场景 |
|---------|---------|
| `"密码不正确"` | 密码验证失败 |
| `"密码尝试次数过多，请 {N} 秒后重试"` | 暴力破解锁定中 |
| `"数据不存在"` | 请求的加密数据未找到 |
| `"当前密码不正确"` | 修改密码时旧密码错误 |
| `"{CHAIN} 无可用 RPC 节点"` | 所有 RPC 端点不可用 |
| `"{CHAIN} 所有节点不可用"` | 故障转移穷尽 |
| `"SOL key must be 32 or 64 bytes, got {N}"` | SOL 私钥格式错误 |

---

## 10. 安全机制

### 10.1 加密存储

| 算法 | 参数 |
|------|------|
| 密钥派生 | PBKDF2-HMAC-SHA512，310,000 轮迭代 |
| 数据加密 | AES-256-GCM（256-bit key, 96-bit IV, 128-bit tag） |
| 盐值 | 每次加密随机生成 256-bit |

### 10.2 暴力破解防护

| 参数 | 值 |
|------|-----|
| 最大尝试次数 | 5 次 |
| 锁定时长 | 60 秒 |
| 成功时 | 重置计数器 |

### 10.3 内存安全

- 所有私钥和助记词使用 `zeroize` crate 在使用后立即清零
- Rust 所有权机制确保敏感数据不会意外泄露
- `DerivedKeys` 结构实现 `Drop` trait 自动清零

### 10.4 RPC 安全

- 多节点负载均衡 + 延迟评分
- 3 次连续失败自动标记不健康
- 全部不健康时自动重置并重试
- CSP 严格限制可访问的外部域名

---

## 11. SQLite 缓存层

所有只读查询接口均集成了本地 SQLite 缓存（`cache.db`），采用 **Cache-First** 策略：先查本地缓存，命中且未过期则直接返回，否则请求远程 API 并更新缓存。

### 11.1 缓存策略总览

| 数据类型 | TTL | 触发命令 | 说明 |
|---------|-----|---------|------|
| 余额（ETH/SOL/EVM） | 30 秒 | `*_get_balance` | 每链每地址独立缓存 |
| BTC 余额 | 30 秒 | `btc_get_balance` | 含 confirmed/unconfirmed JSON |
| 代币余额列表 | 60 秒 | `*_get_token_balances` | 按链+地址整组缓存 |
| Gas / 费率建议 | 15 秒 | `*_get_gas_options`, `btc_get_fee_rates` | 高频变化，短 TTL |
| Solana 优先费 | 15 秒 | `sol_get_priority_fees` | 区块级变化 |
| 交易历史 | 120 秒 | `*_get_history` | 仅第 1 页缓存；翻页始终走 API |
| 价格数据 | 60 秒 | `price_get_multiple` | 所有请求符号都命中时才返回缓存 |
| 价格图表（7 天） | 300 秒 | `price_get_chart` | 5 分钟刷新一次 |
| BTC UTXO | 30 秒 | `btc_get_utxos` | KV 缓存（JSON） |
| Mint 扩展 | 300 秒 | `sol_get_mint_extensions` | KV 缓存（JSON） |
| EVM 链配置 | 永久 | `evm_register_chains` | 写入 DB，启动时自动恢复 |

### 11.2 不缓存的操作

以下命令 **始终直接执行**，不使用缓存：

- 所有发送交易命令（`*_send_transaction`, `*_send_token`）
- 交易加速/取消（`eth_speed_up_transaction`, `eth_cancel_transaction`）
- 交易预览（`*_preview_transaction`, `sol_preview_transfer`）
- Gas 估算（`*_estimate_gas`）
- 密码验证和钱包操作（所有 `wallet.*` 命令）

### 11.3 数据库位置

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/com.zoowallet.app/cache.db` |
| Windows | `%APPDATA%/com.zoowallet.app/cache.db` |
| Linux | `~/.local/share/com.zoowallet.app/cache.db` |

### 11.4 数据库表结构

```sql
-- 原生代币余额
balances (chain, address, balance, extra_json, updated_at)

-- ERC-20 / SPL Token 余额
token_balances (chain, address, contract_address, symbol, name, balance, decimals, raw_json, updated_at)

-- 交易历史记录
tx_history (chain, address, hash, from_addr, to_addr, value, timestamp,
 gas_used, gas_price, is_error, method, confirmations, raw_json, updated_at)

-- Gas 费率缓存
gas_cache (chain, data_json, updated_at)

-- 价格缓存
price_cache (symbol, usd, cny, change_24h, updated_at)

-- 价格图表
price_chart (symbol, data_json, updated_at)

-- EVM 链配置（持久化）
evm_chains (id, name, chain_id, symbol, decimals, rpc_urls, explorer_url, explorer_api_url, color, is_builtin, updated_at)

-- 通用键值缓存
kv_cache (key, value, updated_at)
```

### 11.5 自动清理

应用启动时会启动后台线程，每小时清理一次超过 **7 天** 的过期缓存数据（EVM 链配置除外）。

### 11.6 SQLite 配置

| 参数 | 值 | 说明 |
|------|-----|------|
| Journal Mode | WAL | 支持并发读写，提升性能 |
| Synchronous | NORMAL | 平衡持久性与速度 |
| 存储引擎 | bundled SQLite | 自带 SQLite，无需系统安装 |

---

> **文档版本**：v1.2.0 | **命令总数**：52 个 Tauri 命令 + 2 个前端系统接口 | **缓存引擎**：SQLite (WAL mode) | **错误封装**：IpcError + safeInvoke
