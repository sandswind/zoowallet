# ZooWallet Tauri v2 API 文档

> 版本：v2.0.0 | 已实现命令：24 个（wallet 11 + eth 13）  
> 调用方式：`src/lib/ipc.ts` 导出的 `zoo` 对象，内部使用 `safeInvoke` 封装 `invoke()`。

---

## 目录

1. [数据模型](#1-数据模型)
2. [钱包管理 wallet](#2-钱包管理-wallet)
3. [以太坊 eth](#3-以太坊-eth)
4. [比特币 btc](#4-比特币-btc-phase-4)
5. [Solana sol](#5-solana-sol-phase-5)
6. [通用 EVM evm](#6-通用-evm-链-evm-phase-6)
7. [价格查询 price](#7-价格查询-price-phase-8)
8. [系统接口](#8-系统接口)
9. [错误处理](#9-错误处理)
10. [安全机制](#10-安全机制)
11. [SQLite 缓存层](#11-sqlite-缓存层)

---

## 1. 数据模型

### AccountMeta
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | UUID |
| `name` | `string` | 账户名称 |
| `type` | `"hd"\|"imported"\|"watch"` | 账户类型 |
| `chain` | `string?` | 导入/观察账户所属链 |
| `addresses` | `AccountAddresses` | 各链地址 |
| `index` | `number?` | HD 派生索引 |

### AccountAddresses
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `eth` | `ETH` | EIP-55 以太坊地址 |
| `btc` | `BTC` | bc1... P2WPKH（Phase 4）|
| `sol` | `SOL` | Base58 Ed25519（Phase 5）|

### EncryptedBlob
| 字段 | 说明 |
|------|------|
| `iv` | 12 字节 nonce（base64）|
| `ciphertext` | AES-GCM 密文（base64）|
| `tag` | 16 字节认证标签（base64）|
| `salt` | 32 字节 PBKDF2 盐（base64）|

### HashOut
`{ hash: string }` — 广播成功的交易哈希（`0x` 前缀十六进制）

### TokenBalance
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `symbol` | `symbol` | 代币符号 |
| `name` | `name` | 代币全名 |
| `balance` | `balance` | 格式化余额（已除 decimals）|
| `decimals` | `decimals` | 精度 0–18 |
| `contract_address` | `contractAddress` | ERC-20 合约地址 |

### GasOption
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `gwei` | `gwei` | 总 Gas Price（Gwei 字符串）|
| `max_fee_gwei` | `maxFeeGwei` | EIP-1559 最大费用 |
| `priority_fee_gwei` | `priorityFeeGwei` | EIP-1559 优先费 |
| `estimated_time` | `estimatedTime` | 预估确认时间 |
| `is_eip1559` | `isEip1559` | 是否 EIP-1559 |

### GasOptions
`{ slow, medium, fast: GasOption; baseFeeGwei?: string; isEip1559: boolean }`

### TxRecord
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `hash` | `hash` | 交易哈希 |
| `from` | `from` | 发送方 |
| `to` | `to` | 接收方 |
| `value` | `value` | 金额（Wei 字符串）|
| `timestamp` | `timestamp` | Unix 秒 |
| `gas_used` | `gasUsed` | 实际消耗 Gas |
| `gas_price` | `gasPrice` | Gas 价格 |
| `is_error` | `isError` | 是否失败 |
| `method` | `method` | 合约方法名 |
| `confirmations` | `confirmations` | 确认数 |

### EthTxPreview
`{ isContract: boolean; decoded?: CalldataDecoded; gasEstimate: string; maxFeeGwei: string }`

### CalldataDecoded
`{ name: string; params: { name: string; value: string }[] }`

### TokenInfo
`{ symbol: string; name: string; decimals: number; contractAddress: string }`



---

## 2. 钱包管理 wallet

### 2.1 generate_mnemonic
| | |
|---|---|
| **前端** | `zoo.generateMnemonic()` |
| **返回** | `string[]` — 12 个英文助记词 |
| **鉴权** | 无 |

---

### 2.2 create_from_mnemonic
| | |
|---|---|
| **前端** | `zoo.createWalletFromMnemonic(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 首次设置密码 |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `words` | `string[]` | 12 词助记词 |
| `password` | `string` | 钱包密码（≥8位）|
| `name` | `string` | 账户名称 |

**派生路径：** ETH `m/44'/60'/0'/0/0`，BTC `m/84'/0'/0'/0/0`（Phase 4），SOL `m/44'/501'/0'/0'`（Phase 5）

---

### 2.3 derive_next_account
| | |
|---|---|
| **前端** | `zoo.deriveNextAccount(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 密码验证 |

**参数：** `{ password: string; name: string }`  
**逻辑：** 自动检测最大 HD index，派生 index+1 的新账户。

---

### 2.4 import_private_key
| | |
|---|---|
| **前端** | `zoo.importPrivateKey(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 密码验证 |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `chain` | `string` | `"ETH"` / `"BTC"` / `"SOL"` |
| `private_key` | `string` | ETH: hex/0x，BTC: WIF（Phase 4），SOL: base58（Phase 5）|
| `password` | `string` | 钱包密码 |
| `name` | `string` | 账户名称 |

---

### 2.5 import_watch_wallet
| | |
|---|---|
| **前端** | `zoo.importWatchWallet(args)` |
| **返回** | `AccountMeta` |
| **鉴权** | 无需密码 |

**参数：** `{ address: string; chain: "ETH"|"BTC"|"SOL"; name: string }`

**地址格式校验：**
| 链 | 规则 |
|---|---|
| ETH | `0x` 开头，42 字符 |
| BTC | `bc1` / `1` / `3` 开头 |
| SOL | Base58，32–44 字符 |

> ⚠️ 观察钱包所有签名命令返回 `"观察钱包不支持此操作"`

---

### 2.6 get_accounts
| | |
|---|---|
| **前端** | `zoo.getAccounts()` |
| **返回** | `AccountMeta[]` |

---

### 2.7 has_wallet
| | |
|---|---|
| **前端** | `zoo.hasWallet()` |
| **返回** | `boolean` |

---

### 2.8 verify_password
| | |
|---|---|
| **前端** | `zoo.verifyPassword(password)` |
| **返回** | `boolean` |
| **安全** | 暴力破解防护：5 次失败锁 60 秒 |

---

### 2.9 export_mnemonic
| | |
|---|---|
| **前端** | `zoo.exportMnemonic(password)` |
| **返回** | `string[]` — 12 词助记词 |
| **鉴权** | **密码验证 + 限流** |

---

### 2.10 get_private_key
| | |
|---|---|
| **前端** | `zoo.getPrivateKey(args)` |
| **返回** | `string` — `0x` 前缀十六进制私钥 |
| **鉴权** | **密码验证 + 限流** |

**参数：** `{ account_id: string; chain: "ETH"; password: string }`

---

### 2.11 change_password
| | |
|---|---|
| **前端** | `zoo.changePassword(args)` |
| **返回** | `void` |
| **鉴权** | 旧密码验证 |

**参数：** `{ old_password: string; new_password: string }`  
**效果：** 重新加密 passwordVerify + mnemonic + 所有 eth_keys。



---

## 3. 以太坊 eth

### 3.1 eth_get_balance
| | |
|---|---|
| **前端** | `zoo.eth.getBalance(address)` |
| **返回** | `string` — 格式化 ETH（如 `"1.234567"`，6 位小数）|
| **缓存** | SQLite，TTL 30s |

**参数：** `address: string`（`0x` 以太坊地址）

---

### 3.2 eth_send_transaction
| | |
|---|---|
| **前端** | `zoo.eth.sendTransaction(args: SendEthArgs)` |
| **返回** | `HashOut` |
| **鉴权** | 密码验证 → 解密私钥 |

**参数（SendEthArgs）：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `account_id` | `string` | 账户 UUID |
| `password` | `string` | 钱包密码 |
| `to` | `string` | 收款地址 |
| `amount` | `string` | ETH 数量（如 `"0.1"`）|
| `max_fee_gwei` | `string` | EIP-1559 最大费用（`"0"` 则后端自动估算）|
| `priority_fee_gwei` | `string` | EIP-1559 优先费 |

**流程：** verify_password → decrypt_eth_private_key → get_nonce → get_base_fee → build EIP-1559 tx → sign → broadcast

---

### 3.3 eth_get_gas_options
| | |
|---|---|
| **前端** | `zoo.eth.getGasOptions()` |
| **返回** | `GasOptions` |
| **缓存** | SQLite，TTL 15s |

**三档计算：**
- `slow`：baseFee×2 + priority/2
- `medium`：baseFee×2 + priority
- `fast`：baseFee×3 + priority×2

---

### 3.4 eth_get_token_balances
| | |
|---|---|
| **前端** | `zoo.eth.getTokenBalances(address)` |
| **返回** | `TokenBalance[]`（仅余额 > 0）|
| **数据源** | Etherscan tokentx API + eth_call balanceOf |
| **缓存** | SQLite，TTL 60s |

---

### 3.5 eth_send_token
| | |
|---|---|
| **前端** | `zoo.eth.sendToken(args: SendTokenArgs)` |
| **返回** | `HashOut` |
| **鉴权** | 密码验证 → 解密私钥 |

**参数（SendTokenArgs）：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `account_id` | `string` | 账户 UUID |
| `password` | `string` | 钱包密码 |
| `contract_address` | `string` | ERC-20 合约地址 |
| `to` | `string` | 收款地址 |
| `amount` | `string` | 代币数量（人类可读，后端转最小单位）|
| `decimals` | `number` | 代币精度 |
| `max_fee_gwei` | `string` | EIP-1559 最大费用 |
| `priority_fee_gwei` | `string` | EIP-1559 优先费 |

---

### 3.6 eth_decode_calldata
| | |
|---|---|
| **前端** | `zoo.eth.decodeCalldata(data)` |
| **返回** | `CalldataDecoded \| null` |

**已支持选择器：**
| Selector | 函数 |
|----------|------|
| `0xa9059cbb` | `transfer(address, uint256)` |
| `0x095ea7b3` | `approve(address, uint256)` |
| `0x23b872dd` | `transferFrom(address, address, uint256)` |
| `0x38ed1739` | `swapExactTokensForTokens(...)` |
| `0x7ff36ab5` | `swapExactETHForTokens(...)` |

---

### 3.7 eth_preview_transaction
| | |
|---|---|
| **前端** | `zoo.eth.previewTransaction(args)` |
| **返回** | `EthTxPreview` |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `from` | `string` | 发送方地址 |
| `to` | `string` | 目标地址 |
| `value` | `string?` | 金额（十六进制 Wei，如 `0x38d7ea4c68000`）|
| `data` | `string?` | Calldata（十六进制）|

**效果：** `eth_getCode` 检测合约 + `eth_estimateGas` + Calldata 解码

---

### 3.8 eth_query_token_info
| | |
|---|---|
| **前端** | `zoo.eth.queryTokenInfo(contract_address)` |
| **返回** | `TokenInfo` |

**实现：** 通过 `eth_call` 调用 `name()`、`symbol()`、`decimals()`

---

### 3.9 eth_get_custom_token_balance
| | |
|---|---|
| **前端** | `zoo.eth.getCustomTokenBalance(args)` |
| **返回** | `string` — 格式化余额 |

**参数：** `{ address: string; contract_address: string; decimals: number }`

---

### 3.10 eth_get_history
| | |
|---|---|
| **前端** | `zoo.eth.getHistory(args)` |
| **返回** | `TxRecord[]` |
| **数据源** | Etherscan txlist API |
| **缓存** | SQLite，TTL 120s（仅 page=1）|

**参数：** `{ address: string; page: number; offset: number }`

---

### 3.11 eth_estimate_gas
| | |
|---|---|
| **前端** | `zoo.eth.estimateGas(args)` |
| **返回** | `string` — Gas 数量（十进制字符串）|

**参数：** `{ from: string; to: string; value: string; data: string }`

---

### 3.12 eth_speed_up_transaction
| | |
|---|---|
| **前端** | `zoo.eth.speedUpTransaction(args)` |
| **返回** | `{ hash: string; oldHash: string }` |
| **鉴权** | 密码验证 |

**参数：** `{ account_id: string; password: string; tx_hash: string }`  
**逻辑：** MaxFee ×1.1，PriorityFee +2 Gwei，相同 nonce 替换原交易

---

### 3.13 eth_cancel_transaction
| | |
|---|---|
| **前端** | `zoo.eth.cancelTransaction(args)` |
| **返回** | `{ hash: string; oldHash: string }` |
| **鉴权** | 密码验证 |

**参数：** `{ account_id: string; password: string; tx_hash: string }`  
**逻辑：** 相同 nonce 向自身发送 0 ETH，覆盖原交易



---

## 4. 比特币 btc（Phase 4）

> ⚠️ **尚未实现** — Rust 端 `btc.rs` 待 Phase 4 开发。前端 `zoo.btc.*` 命名空间已在 IPC 规划中。

### 4.1 btc_get_balance
| | |
|---|---|
| **前端** | `zoo.btc.getBalance(address)` |
| **返回** | `BtcBalance` |
| **数据源** | Mempool API `/address/{addr}` |
| **缓存** | SQLite，TTL 30s |

**BtcBalance：** `{ confirmed: string; unconfirmed: string; total: string }` （单位 BTC）

---

### 4.2 btc_get_fee_rates
| | |
|---|---|
| **前端** | `zoo.btc.getFeeRates()` |
| **返回** | `BtcFeeRates` |
| **数据源** | Mempool API `/v1/fees/recommended` |
| **缓存** | SQLite，TTL 15s |

**BtcFeeRates：** `{ slow, medium, fast: FeeRateOption }`  
**FeeRateOption：** `{ feeRate: number; estimatedTime: string; gwei: string }` （sat/vB）

---

### 4.3 btc_preview_transaction
| | |
|---|---|
| **前端** | `zoo.btc.previewTransaction(args)` |
| **返回** | `BtcPreview` |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `from_address` | `string` | 发送方地址 |
| `to` | `string` | 收款地址 |
| `amount_btc` | `string` | 发送金额（BTC 单位，如 `"0.001"`）|
| `fee_rate` | `number` | 费率（sat/vB）|

**BtcPreview：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `feasible` | `boolean` | 交易是否可行 |
| `reason` | `string?` | 不可行时的原因 |
| `inputCount` | `number?` | 选中的 UTXO 数量 |
| `feeSat` | `number?` | 手续费（satoshi）|
| `feeBtc` | `string?` | 手续费（BTC）|
| `hasChange` | `boolean?` | 是否有找零 |
| `totalInputSat` | `number?` | 输入总额（satoshi）|
| `changeSat` | `number?` | 找零金额（satoshi）|

**UTXO 选币算法：**
1. Branch-and-Bound（最多 100,000 次搜索，找无找零组合）
2. 降级 Largest-First（降序累加至目标金额）

---

### 4.4 btc_send_transaction
| | |
|---|---|
| **前端** | `zoo.btc.sendTransaction(args)` |
| **返回** | `HashOut` |
| **鉴权** | 密码验证 → 解密私钥 |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `account_id` | `string` | 账户 UUID |
| `password` | `string` | 钱包密码 |
| `to` | `string` | 收款地址 |
| `amount_sat` | `number` | 发送金额（satoshi）|
| `fee_rate` | `number` | 费率（sat/vB）|
| `from_address` | `string` | 发送方地址（校验密钥匹配）|

**签名流程：** P2WPKH SegWit v0 → SighashCache → ECDSA → Witness → POST `/tx`

---

### 4.5 btc_get_history
| | |
|---|---|
| **前端** | `zoo.btc.getHistory(args)` |
| **返回** | `TxRecord[]` |
| **数据源** | Mempool API `/address/{addr}/txs` |

**参数：** `{ address: string }`

---

### 4.6 btc_get_utxos
| | |
|---|---|
| **前端** | `zoo.btc.getUTXOs(address)` |
| **返回** | `Utxo[]` |
| **数据源** | Mempool API `/address/{addr}/utxo` |
| **缓存** | SQLite kv_cache，TTL 30s |

**参数：** `address: string`

**Utxo：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `txid` | `string` | 交易哈希 |
| `vout` | `number` | 输出索引 |
| `value` | `number` | 金额（satoshi）|
| `confirmed` | `boolean` | 是否已确认 |



---

## 5. Solana sol（Phase 5）

> ⚠️ **尚未实现** — Rust 端 `sol.rs` 待 Phase 5 开发。

### 5.1 sol_get_balance
| | |
|---|---|
| **前端** | `zoo.sol.getBalance(address)` |
| **返回** | `string` — SOL 余额 |
| **RPC** | `getBalance` via failover |
| **缓存** | SQLite，TTL 30s |

---

### 5.2 sol_get_token_balances
| | |
|---|---|
| **前端** | `zoo.sol.getTokenBalances(address)` |
| **返回** | `SolTokenBalance[]` |
| **RPC** | `getTokenAccountsByOwner`（SPL Token + Token-2022 各一次）|
| **缓存** | SQLite，TTL 60s |

**SolTokenBalance：**
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `mint` | `mint` | Mint 地址 |
| `balance` | `balance` | 格式化余额 |
| `decimals` | `decimals` | 精度 |
| `symbol` | `symbol` | 代币符号 |
| `program_id` | `programId` | Token 程序 ID |
| `is_token2022` | `isToken2022` | 是否 Token-2022 |
| `extensions` | `extensions` | Token-2022 扩展（JSON）|

---

### 5.3 sol_get_mint_extensions
| | |
|---|---|
| **前端** | `zoo.sol.getMintExtensions(mint_address)` |
| **返回** | `MintExtensions` |
| **缓存** | SQLite kv_cache，TTL 300s |

**MintExtensions：**
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `transfer_fee` | `transferFee` | 转账税配置 |
| `interest_bearing` | `interestBearing` | 计息配置 |
| `permanent_delegate` | `permanentDelegate` | 永久委托 |
| `non_transferable` | `nonTransferable` | 是否不可转让 |

---

### 5.4 sol_preview_transfer
| | |
|---|---|
| **前端** | `zoo.sol.previewTransfer(args)` |
| **返回** | `SolTransferPreview` |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `mint_address` | `string` | Token Mint 地址 |
| `amount` | `string` | 转账金额（最小单位）|
| `decimals` | `number` | 代币精度 |
| `is_token2022` | `boolean` | 是否 Token-2022 |

**SolTransferPreview：** `{ hasTransferFee: boolean; fee?: string; netAmount?: string; feeBasisPoints?: number }`

---

### 5.5 sol_get_priority_fees
| | |
|---|---|
| **前端** | `zoo.sol.getPriorityFees()` |
| **返回** | `SolPriorityFees` |
| **RPC** | `getRecentPrioritizationFees` → P25/P50/P75 分位 |
| **缓存** | SQLite，TTL 15s |

**SolPriorityFees：** `{ slow, medium, fast: SolPriorityFeeOption }`  
**SolPriorityFeeOption：** `{ microLamports: number; estimatedTime: string; gwei: string }`

---

### 5.6 sol_send_transaction
| | |
|---|---|
| **前端** | `zoo.sol.sendTransaction(args)` |
| **返回** | `HashOut` |
| **鉴权** | 密码验证 → 解密 Ed25519 密钥对 |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `account_id` | `string` | 账户 UUID |
| `password` | `string` | 钱包密码 |
| `to` | `string` | 收款地址 |
| `amount_sol` | `string` | 发送金额（SOL）|
| `priority_fee_micro_lamports` | `number?` | 优先费（可选）|

---

### 5.7 sol_send_token
| | |
|---|---|
| **前端** | `zoo.sol.sendToken(args)` |
| **返回** | `HashOut` |
| **鉴权** | 密码验证 → 解密密钥对 |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `account_id` | `string` | 账户 UUID |
| `password` | `string` | 钱包密码 |
| `mint_address` | `string` | Token Mint 地址 |
| `to` | `string` | 收款地址 |
| `amount` | `string` | 发送数量（最小单位）|
| `decimals` | `number` | 代币精度 |
| `is_token2022` | `boolean` | 是否 Token-2022 |
| `priority_fee_micro_lamports` | `number?` | 优先费（可选）|

**逻辑：** 自动检测接收方 ATA，不存在则创建后转账。

---

### 5.8 sol_subscribe_balance
| | |
|---|---|
| **前端** | `zoo.sol.subscribeBalance(args)` |
| **返回** | `{ subscribed: true; subId: 0 }` |
| **状态** | **占位实现** — WebSocket 待后续完善 |

**参数：** `{ address: string; window_id: string }`

---

### 5.9 sol_unsubscribe_balance
| | |
|---|---|
| **前端** | `zoo.sol.unsubscribeBalance(address)` |
| **返回** | `{ unsubscribed: true }` |
| **状态** | **占位实现** |

---

### 5.10 sol_get_custom_token_balance
| | |
|---|---|
| **前端** | `zoo.sol.getCustomTokenBalance(args)` |
| **返回** | `string` — 格式化余额 |

**参数：** `{ address: string; mint_address: string; decimals: number; is_token2022: boolean }`

---

### 5.11 sol_get_history
| | |
|---|---|
| **前端** | `zoo.sol.getHistory(args)` |
| **返回** | `TxRecord[]` |
| **RPC** | `getSignaturesForAddress` + 并行 `getTransaction` |
| **缓存** | SQLite，TTL 120s（第1页）|

**参数：** `{ address: string; limit?: number }`（默认 20）



---

## 6. 通用 EVM 链 evm（Phase 6）

> ⚠️ **尚未实现** — Rust 端 `evm.rs` 待 Phase 6 开发。复用 ETH 逻辑，按链 ID 动态路由。

### 6.1 evm_register_chains
| | |
|---|---|
| **前端** | `zoo.evm.registerChains(chains)` |
| **返回** | `boolean` |

**参数：** `chains: EvmChainConfig[]`

**EvmChainConfig：**
| 字段 | JSON 键 | 说明 |
|------|---------|------|
| `id` | `id` | 链标识（如 `"arbitrum"`）|
| `name` | `name` | 链名称 |
| `chain_id` | `chainId` | EIP-155 链 ID |
| `symbol` | `symbol` | 原生代币符号 |
| `decimals` | `decimals` | 精度（通常 18）|
| `rpc_urls` | `rpcUrls` | RPC 端点列表 |
| `explorer_url` | `explorerUrl` | 区块浏览器 URL |
| `explorer_api_url` | `explorerApiUrl` | Etherscan 兼容 API |
| `color` | `color` | 主题色（十六进制）|
| `is_builtin` | `isBuiltin` | 是否内置链 |

**效果：** 存入 SQLite `evm_chains` 表（永久），注册 RPC 节点至故障切换池。

---

### 6.2 evm_get_balance
| | |
|---|---|
| **前端** | `zoo.evm.getBalance(args)` |
| **返回** | `string` — 格式化余额 |
| **缓存** | SQLite，TTL 30s |

**参数：** `{ chain_id: string; address: string }`

---

### 6.3 evm_get_token_balances
| | |
|---|---|
| **前端** | `zoo.evm.getTokenBalances(args)` |
| **返回** | `TokenBalance[]` |
| **缓存** | SQLite，TTL 60s |

**参数：** `{ chain_id: string; address: string }`  
**前置条件：** 链须配置 `explorerApiUrl`。

---

### 6.4 evm_get_gas_options
| | |
|---|---|
| **前端** | `zoo.evm.getGasOptions(args)` |
| **返回** | `GasOptions` |
| **缓存** | SQLite，TTL 15s |

**参数：** `{ chain_id: string }`  
**逻辑：** 优先 EIP-1559 `eth_feeHistory`，失败则降级 legacy `eth_gasPrice` 三档。

---

### 6.5 evm_send_transaction
| | |
|---|---|
| **前端** | `zoo.evm.sendTransaction(args)` |
| **返回** | `HashOut` |
| **鉴权** | 解密 ETH 私钥 |

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| `chain_id` | `string` | 链标识 |
| `account_id` | `string` | 账户 UUID |
| `password` | `string` | 钱包密码 |
| `to` | `string` | 收款地址 |
| `amount` | `string` | 金额（原生代币单位）|
| `max_fee_gwei` | `string` | 最大费用 |
| `priority_fee_gwei` | `string` | 优先费 |

---

### 6.6 evm_send_token
| | |
|---|---|
| **前端** | `zoo.evm.sendToken(args)` |
| **返回** | `HashOut` |
| **鉴权** | 解密 ETH 私钥 |

**参数：** 同 `eth_send_token`，额外增加 `chain_id: string`

---

### 6.7 evm_preview_transaction
| | |
|---|---|
| **前端** | `zoo.evm.previewTransaction(args)` |
| **返回** | `EthTxPreview` |

**参数：** `{ chain_id: string; from: string; to: string; value?: string; data?: string }`

---

### 6.8 evm_get_history
| | |
|---|---|
| **前端** | `zoo.evm.getHistory(args)` |
| **返回** | `TxRecord[]` |
| **缓存** | SQLite，TTL 120s（第1页）|

**参数：** `{ chain_id: string; address: string; page?: number; offset?: number }`  
**前置条件：** 链须配置 `explorerApiUrl`。

---

### 6.9 evm_estimate_gas
| | |
|---|---|
| **前端** | `zoo.evm.estimateGas(args)` |
| **返回** | `string` — Gas 数量 |

**参数：** `{ chain_id: string; from: string; to: string; value?: string; data?: string }`

---

## 7. 价格查询 price（Phase 8）

> ⚠️ **Rust 端尚未实现** — 前端 `zoo.price.*` 已添加，错误被静默忽略，等待 Phase 8 实现 `price.rs`。

### 7.1 price_get_multiple
| | |
|---|---|
| **前端** | `zoo.price.getMultiple(symbols)` |
| **返回** | `Record<string, PriceData>` |
| **数据源** | CoinGecko `simple/price` API |
| **缓存** | SQLite，TTL 60s |

**参数：** `symbols: string[]`（如 `["ETH", "BTC", "SOL"]`）

**PriceData：** `{ usd: number; cny: number; change24h: number }`

**内置符号映射：**
| 符号 | CoinGecko ID |
|------|-------------|
| `ETH` | `ethereum` |
| `BTC` | `bitcoin` |
| `SOL` | `solana` |
| `BNB` | `binancecoin` |
| `MATIC` | `matic-network` |
| `ARB` | `arbitrum` |
| `OP` | `optimism` |
| `AVAX` | `avalanche-2` |
| `USDT` | `tether` |
| `USDC` | `usd-coin` |

---

### 7.2 price_get_chart
| | |
|---|---|
| **前端** | `zoo.price.getChart(symbol)` |
| **返回** | `[number, number][]` — `[timestamp_ms, price_usd]` |
| **数据源** | CoinGecko `market_chart` API（7 天，USD）|
| **缓存** | SQLite，TTL 300s |

**参数：** `symbol: string`



---

## 8. 系统接口

### 8.1 notify（前端包装，非 Tauri 命令）
| | |
|---|---|
| **实现** | `@tauri-apps/plugin-notification` |
| **状态** | 插件已注册，前端直接调用 |

```typescript
import { sendNotification } from "@tauri-apps/plugin-notification";
sendNotification({ title: "ZooWallet", body: "收到 0.1 ETH" });
```

**当前使用场景：**
- 余额增长检测（Dashboard `useEffect` 对比 `prevBalance`）

---

### 8.2 on（Tauri 事件系统）

```typescript
import { listen } from "@tauri-apps/api/event";
const unlisten = await listen("sol:balanceUpdate", (event) => { ... });
// 取消订阅：unlisten()
```

**已定义事件通道：**
| 通道 | 触发时机 | 状态 |
|------|---------|------|
| `sol:balanceUpdate` | SOL 余额变化 | 占位（Phase 5）|

---

## 9. 错误处理

### 9.1 Rust 端错误约定

所有命令返回 `Result<T, String>`。错误字符串面向最终用户，中文，不包含内部路径/堆栈。

**常见错误消息：**

| 错误消息 | 触发场景 |
|---------|---------|
| `"密码不正确"` | verify_password / decrypt 失败 |
| `"密码尝试次数过多，请 N 秒后重试"` | RateLimiter 锁定 |
| `"数据不存在，请重新创建钱包"` | password_verify 字段缺失 |
| `"当前密码不正确"` | change_password 旧密码错误 |
| `"账户不存在或无 ETH 私钥"` | eth_keys 中无对应 UUID |
| `"观察钱包不支持此操作"` | watch 类型调用签名命令 |
| `"无效的以太坊地址"` | 地址格式校验失败 |
| `"无效的金额"` | 金额解析失败 |
| `"ETH 无可用 RPC 节点"` | 所有节点不健康 |
| `"获取余额失败: ..."` | alloy Provider 请求失败 |
| `"广播交易失败: ..."` | send_raw_transaction 失败 |
| `"私钥格式错误"` | SigningKey::from_slice 失败 |

### 9.2 前端错误处理

```typescript
// safeInvoke 统一捕获
async function safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    throw new IpcError(command, typeof e === "string" ? e : "操作失败，请重试");
  }
}

// 使用示例
try {
  const balance = await zoo.eth.getBalance(address);
} catch (e) {
  if (e instanceof IpcError) {
    // e.command = "eth_get_balance"
    // e.message = "获取余额失败: ..."
    showNotification("error", e.message);

    // 处理限流
    const m = e.message.match(/请\s*(\d+)\s*秒/);
    if (m) setCountdown(parseInt(m[1], 10));
  }
}
```

---

## 10. 安全机制

### 10.1 加密存储

| 参数 | 值 |
|------|-----|
| 加密算法 | AES-256-GCM |
| 密钥派生 | PBKDF2-HMAC-SHA512 |
| 迭代次数 | **310,000** 轮 |
| 盐值 | 32 字节，每次加密随机生成 |
| IV（Nonce）| 12 字节，每次加密随机生成 |
| 认证标签 | 128 位 GCM tag |

### 10.2 暴力破解防护

| 参数 | 值 |
|------|-----|
| 最大尝试次数 | 5 次 |
| 锁定时长 | 60 秒 |
| 持久化 | 写入 wallet-store.json `rateLimit` 字段 |
| 成功时 | 重置 fails=0, locked_until=0 |

### 10.3 内存安全

- 所有持有私钥/助记词/派生密钥的 `Vec<u8>` 在作用域结束前显式调用 `.zeroize()`
- `SigningKey` 离开作用域后由 Drop 自动清零（alloy/k256 实现 ZeroizeOnDrop）
- 前端 walletStore 锁屏时清空 `balance`、`tokenBalances`（`lock()` 方法）
- Security 页面私钥导出后 30 秒进度条，到期自动清除 React state

### 10.4 原子写入

```
wallet-store.json 写入流程：
1. serde_json::to_string_pretty(&store)
2. fs::write("{path}.json.tmp", json)
3. fs::rename(".json.tmp", ".json")   ← 原子操作
```

崩溃恢复：若 `.tmp` 存在而主文件不存在，启动时检测并回滚。

### 10.5 观察钱包隔离

所有涉及签名的命令（`eth_send_transaction`, `eth_send_token`, `eth_speed_up_transaction`, `eth_cancel_transaction`, `get_private_key`）开头调用：

```rust
fn require_signing_account(account_id: &str) -> Result<(), String> {
    let meta = load().accounts.iter().find(|a| a.id == account_id)...;
    if meta.account_type == "watch" {
        return Err("观察钱包不支持此操作".to_string());
    }
    Ok(())
}
```

### 10.6 CSP 配置

`tauri.conf.json` security.csp 白名单（`connect-src`）：
- `https://eth.llamarpc.com`
- `https://rpc.ankr.com`
- `https://ethereum.publicnode.com`
- `https://1rpc.io`
- `https://cloudflare-eth.com`
- `https://api.mainnet-beta.solana.com`
- `https://solana.publicnode.com`
- `https://mempool.space`
- `https://blockstream.info`
- `https://api.etherscan.io`
- `https://api.coingecko.com`

不含 `'unsafe-inline'`、`'unsafe-eval'`。

---

## 11. SQLite 缓存层

### 11.1 策略概览

**Cache-First**：先查 SQLite，命中且未过期则直接返回，否则请求 API 后写缓存。

| 数据类型 | TTL | 命令 |
|---------|-----|------|
| 原生币余额 | 30s | `*_get_balance` |
| ERC-20/SPL 代币余额 | 60s | `*_get_token_balances` |
| 交易历史（第1页）| 120s | `*_get_history` |
| Gas / 费率 | 15s | `*_get_gas_options`, `btc_get_fee_rates`, `sol_get_priority_fees` |
| 价格 | 60s | `price_get_multiple` |
| 价格图表（7天）| 300s | `price_get_chart` |
| BTC UTXO | 30s | `btc_get_utxos`（kv_cache）|
| Token-2022 Mint 扩展 | 300s | `sol_get_mint_extensions`（kv_cache）|
| EVM 链配置 | 永久 | `evm_register_chains` |

### 11.2 不缓存的操作

以下命令**始终直接执行**，不使用缓存：
- 所有发送交易命令（`*_send_transaction`, `*_send_token`）
- 交易加速/取消（`eth_speed_up_transaction`, `eth_cancel_transaction`）
- 交易预览（`*_preview_transaction`, `sol_preview_transfer`）
- Gas 估算（`*_estimate_gas`）
- 所有 wallet 命令

### 11.3 数据库位置

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/com.zoowallet.app/cache.db` |
| Windows | `%APPDATA%\com.zoowallet.app\cache.db` |
| Linux | `~/.local/share/com.zoowallet.app/cache.db` |

### 11.4 数据库表结构

```sql
-- 原生代币余额（ETH/SOL/BTC/EVM）
CREATE TABLE balances (
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    balance TEXT NOT NULL,
    extra_json TEXT,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (chain, address)
);

-- ERC-20 / SPL Token 余额列表
CREATE TABLE token_balances (
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    data_json TEXT NOT NULL,   -- JSON 数组
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (chain, address)
);

-- 交易历史（第1页缓存）
CREATE TABLE tx_history (
    chain TEXT NOT NULL,
    address TEXT NOT NULL,
    data_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (chain, address)
);

-- Gas 费率
CREATE TABLE gas_cache (
    chain TEXT NOT NULL PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 价格缓存
CREATE TABLE price_cache (
    symbol TEXT NOT NULL PRIMARY KEY,
    usd REAL NOT NULL,
    cny REAL NOT NULL,
    change_24h REAL NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 价格图表
CREATE TABLE price_chart (
    symbol TEXT NOT NULL PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- EVM 链配置（永久）
CREATE TABLE evm_chains (
    id TEXT NOT NULL PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 通用键值缓存（UTXO / Mint 扩展等）
CREATE TABLE kv_cache (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### 11.5 SQLite 配置

| 参数 | 值 | 说明 |
|------|-----|------|
| Journal Mode | WAL | 支持并发读写 |
| Synchronous | NORMAL | 平衡持久性与速度 |
| 存储引擎 | bundled SQLite | 无需系统安装 |
| 连接 | 全局单连接 `Mutex<Option<Connection>>` | Mutex 中毒自动恢复 |

### 11.6 自动清理

应用启动时后台线程每 **1 小时** 执行：

```sql
DELETE FROM {table} WHERE updated_at < (now - 7 * 86400)
```

清理范围：balances / token_balances / tx_history / gas_cache / price_cache / price_chart / kv_cache  
**不清理**：evm_chains（永久）

---

> **文档版本**：v2.0.0 | **命令总数**：24 已实现 + 30 规划中  
> **缓存引擎**：SQLite WAL | **错误封装**：`IpcError` + `safeInvoke`  
> **最后更新**：2026-05
