use alloy::{
    network::EthereumWallet,
    primitives::{utils::format_units, Address, Bytes, U256},
    providers::{Provider, ProviderBuilder},
    rpc::types::TransactionRequest,
    signers::k256::ecdsa::SigningKey,
    signers::local::PrivateKeySigner,
};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use zeroize::Zeroize;

use crate::{models::HashOut, services::{db, rpc::ETH_RPC}};
use super::wallet::{get_eth_address, load_eth_private_key};
use super::network::explorer_api_url;

// ── Data models ───────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GasOption {
    pub gwei: String,
    #[serde(rename = "maxFeeGwei")]
    pub max_fee_gwei: Option<String>,
    #[serde(rename = "priorityFeeGwei")]
    pub priority_fee_gwei: Option<String>,
    #[serde(rename = "estimatedTime")]
    pub estimated_time: String,
    #[serde(rename = "isEip1559")]
    pub is_eip1559: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GasOptions {
    pub slow: GasOption,
    pub medium: GasOption,
    pub fast: GasOption,
    #[serde(rename = "baseFeeGwei")]
    pub base_fee_gwei: Option<String>,
    #[serde(rename = "isEip1559")]
    pub is_eip1559: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenBalance {
    pub symbol: String,
    pub name: String,
    pub balance: String,
    pub decimals: u8,
    #[serde(rename = "contractAddress")]
    pub contract_address: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalldataParam {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalldataDecoded {
    pub name: String,
    pub params: Vec<CalldataParam>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EthTxPreview {
    #[serde(rename = "isContract")]
    pub is_contract: bool,
    pub decoded: Option<CalldataDecoded>,
    #[serde(rename = "gasEstimate")]
    pub gas_estimate: String,
    #[serde(rename = "maxFeeGwei")]
    pub max_fee_gwei: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TxRecord {
    pub hash: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub timestamp: u64,
    #[serde(rename = "gasUsed")]
    pub gas_used: Option<String>,
    #[serde(rename = "gasPrice")]
    pub gas_price: Option<String>,
    #[serde(rename = "isError")]
    pub is_error: bool,
    pub method: Option<String>,
    pub confirmations: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenInfo {
    pub symbol: String,
    pub name: String,
    pub decimals: u8,
    #[serde(rename = "contractAddress")]
    pub contract_address: String,
}


// ── Provider helper ───────────────────────────────────────────────────────────

/// Build a provider for the currently active chain.
fn make_provider() -> alloy::providers::RootProvider<alloy::transports::http::Http<reqwest::Client>> {
    let chain = crate::services::rpc::get_active_chain();
    let url = crate::services::rpc::get_best_rpc(&chain)
        .unwrap_or_else(|| "https://eth.llamarpc.com".to_string());
    ProviderBuilder::new().on_http(url.parse().expect("invalid RPC URL"))
}

/// Build a provider for a specific chain (used in signed-tx helpers).
fn make_provider_for(chain: &str) -> String {
    crate::services::rpc::get_best_rpc(chain)
        .unwrap_or_else(|| "https://eth.llamarpc.com".to_string())
}

/// Active chain ID string.
fn active_chain() -> String {
    crate::services::rpc::get_active_chain()
}

fn gwei_str(wei: u128) -> String {
    let gwei = wei as f64 / 1e9;
    format!("{gwei:.4}")
}

/// Parse a decimal ETH string (e.g. "0.123456789012345678") into wei U256
/// without floating-point precision loss.
fn parse_eth_to_wei(amount: &str) -> Result<alloy::primitives::U256, String> {
    let amount = amount.trim();
    if amount.is_empty() { return Err("金额不能为空".to_string()); }

    // Split on decimal point
    let (whole, frac) = if let Some(dot) = amount.find('.') {
        (&amount[..dot], &amount[dot + 1..])
    } else {
        (amount, "")
    };

    // Validate digits
    if !whole.chars().all(|c| c.is_ascii_digit()) || !frac.chars().all(|c| c.is_ascii_digit()) {
        return Err("无效的金额".to_string());
    }

    const DECIMALS: usize = 18;
    // Truncate or pad fractional part to exactly 18 digits
    let frac_padded = if frac.len() >= DECIMALS {
        frac[..DECIMALS].to_string()
    } else {
        format!("{:0<width$}", frac, width = DECIMALS)
    };

    let wei_str = format!("{whole}{frac_padded}");
    // Strip leading zeros to avoid parsing issues, but keep at least "0"
    let wei_stripped = wei_str.trim_start_matches('0');
    let wei_stripped = if wei_stripped.is_empty() { "0" } else { wei_stripped };

    alloy::primitives::U256::from_str_radix(wei_stripped, 10)
        .map_err(|e| format!("金额解析失败: {e}"))
}

// ── Phase 1 Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_get_balance(address: String) -> Result<String, String> {
    let chain = active_chain();
    // Cache-first: TTL 30s
    if let Some(cached) = db::get_balance(&chain, &address, db::TTL_BALANCE) {
        return Ok(cached);
    }
    let addr = Address::from_str(&address).map_err(|_| "无效的以太坊地址")?;
    let provider = make_provider();
    let wei = provider.get_balance(addr).await.map_err(|e| format!("获取余额失败: {e}"))?;
    let eth = format_units(wei, "ether").map_err(|e| format!("单位转换失败: {e}"))?;
    let trimmed = if let Some(dot) = eth.find('.') {
        let dec = &eth[dot + 1..];
        if dec.len() > 6 { format!("{}.{}", &eth[..dot], &dec[..6]) } else { eth }
    } else { eth };
    db::set_balance(&chain, &address, &trimmed, None);
    Ok(trimmed)
}

#[tauri::command]
pub async fn eth_send_transaction(
    account_id: String,
    password: String,
    to: String,
    amount: String,
    max_fee_gwei: String,
    priority_fee_gwei: String,
) -> Result<HashOut, String> {
    let mut key_bytes = load_eth_private_key(&account_id, &password)?;
    let signing_key = SigningKey::from_slice(&key_bytes).map_err(|_| "私钥格式错误")?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    let from_addr = get_eth_address(&account_id)?;
    let wallet = EthereumWallet::from(signer);
    let to_addr = Address::from_str(&to).map_err(|_| "无效的收款地址")?;

    // Parse amount to wei with full precision via string manipulation (避免 f64 精度损失)
    let wei_value = parse_eth_to_wei(&amount)?;
    let provider = make_provider();
    let nonce = provider.get_transaction_count(from_addr).await.map_err(|e| format!("获取 nonce 失败: {e}"))?;

    // Use frontend-provided gas if non-zero, otherwise auto-estimate
    let (max_fee, prio_fee) = if max_fee_gwei != "0" && !max_fee_gwei.is_empty() {
        let mf = (max_fee_gwei.parse::<f64>().unwrap_or(20.0) * 1e9) as u128;
        let pf = (priority_fee_gwei.parse::<f64>().unwrap_or(1.5) * 1e9) as u128;
        (mf, pf)
    } else {
        let block = provider.get_block_by_number(alloy::eips::BlockNumberOrTag::Latest, false).await
            .map_err(|e| format!("获取区块失败: {e}"))?.ok_or("区块不存在")?;
        let base_fee = block.header.base_fee_per_gas.unwrap_or(1_000_000_000u64);
        let prio = provider.get_max_priority_fee_per_gas().await.unwrap_or(1_500_000_000u128);
        ((base_fee as u128) * 2 + prio, prio)
    };

    let rpc_url = crate::services::rpc::get_best_rpc(&active_chain())
        .unwrap_or_else(|| crate::services::rpc::eth_rpc());
    let provider_with_signer = ProviderBuilder::new().wallet(wallet).on_http(rpc_url.parse().map_err(|_| "RPC URL 无效")?);
    let tx = TransactionRequest::default()
        .from(from_addr).to(to_addr).value(wei_value).nonce(nonce)
        .max_fee_per_gas(max_fee).max_priority_fee_per_gas(prio_fee).gas_limit(21_000u64);

    let pending = provider_with_signer.send_transaction(tx).await.map_err(|e| format!("广播交易失败: {e}"))?;
    let hash = *pending.tx_hash();
    key_bytes.zeroize();
    Ok(HashOut { hash: format!("{hash:#x}") })
}


// ── Phase 3: Gas options ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_get_gas_options() -> Result<GasOptions, String> {
    let chain = active_chain();
    // Cache-first: TTL 15s
    if let Some(cached) = db::get_gas(&chain, db::TTL_GAS) {
        if let Ok(opts) = serde_json::from_value::<GasOptions>(cached) {
            return Ok(opts);
        }
    }
    let provider = make_provider();
    let block = provider.get_block_by_number(alloy::eips::BlockNumberOrTag::Latest, false).await
        .map_err(|e| format!("获取区块失败: {e}"))?.ok_or("区块不存在")?;

    if let Some(base_fee) = block.header.base_fee_per_gas {
        let prio = provider.get_max_priority_fee_per_gas().await.unwrap_or(1_500_000_000u128);
        let base = base_fee as u128;
        let slow_prio   = prio / 2;
        let medium_prio = prio;
        let fast_prio   = prio * 2;

        let make_opt = |extra_base_mult: u128, p: u128, time: &str| GasOption {
            gwei: gwei_str(base * extra_base_mult + p),
            max_fee_gwei: Some(gwei_str(base * extra_base_mult + p)),
            priority_fee_gwei: Some(gwei_str(p)),
            estimated_time: time.to_string(),
            is_eip1559: true,
        };

        Ok(GasOptions {
            slow:   make_opt(2, slow_prio,   "~10 分钟"),
            medium: make_opt(2, medium_prio, "~3 分钟"),
            fast:   make_opt(3, fast_prio,   "~30 秒"),
            base_fee_gwei: Some(gwei_str(base)),
            is_eip1559: true,
        })
    } else {
        // Legacy gas price
        let gas_price = provider.get_gas_price().await.unwrap_or(20_000_000_000u128);
        let make_opt = |mult: u128, time: &str| GasOption {
            gwei: gwei_str(gas_price * mult / 10),
            max_fee_gwei: None,
            priority_fee_gwei: None,
            estimated_time: time.to_string(),
            is_eip1559: false,
        };
        Ok(GasOptions {
            slow:   make_opt(8,  "~10 分钟"),
            medium: make_opt(10, "~3 分钟"),
            fast:   make_opt(12, "~30 秒"),
            base_fee_gwei: None,
            is_eip1559: false,
        })
    }.map(|opts| {
        // Write to cache so subsequent calls within TTL skip the RPC round-trip
        if let Ok(v) = serde_json::to_value(&opts) { db::set_gas(&chain, &v); }
        opts
    })
}

// ── Phase 3: Token balances ───────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_get_token_balances(address: String) -> Result<Vec<TokenBalance>, String> {
    let chain = active_chain();
    // Cache-first: TTL 60s
    if let Some(cached) = db::get_token_balances(&chain, &address, db::TTL_TOKENS) {
        if let Ok(tokens) = serde_json::from_value::<Vec<TokenBalance>>(cached) {
            return Ok(tokens);
        }
    }
    // Resolve explorer API for active chain (fallback to Etherscan)
    let api_base = explorer_api_url(&chain)
        .unwrap_or_else(|| "https://api.etherscan.io/api".to_string());
    let url = format!(
        "{api_base}?module=account&action=tokentx&address={address}&startblock=0&endblock=999999999&sort=desc&offset=100"
    );
    let resp = crate::services::rpc::HTTP.get(&url).send().await
        .map_err(|e| format!("请求 Explorer 失败: {e}"))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("解析响应失败: {e}"))?;

    let txs = json["result"].as_array().ok_or("无代币记录")?;

    // Deduplicate contracts
    let mut seen = std::collections::HashMap::<String, TokenBalance>::new();
    let addr_lower = address.to_lowercase();

    for tx in txs {
        let contract = tx["contractAddress"].as_str().unwrap_or("").to_string();
        if contract.is_empty() || seen.contains_key(&contract) { continue; }
        let symbol = tx["tokenSymbol"].as_str().unwrap_or("?").to_string();
        let name = tx["tokenName"].as_str().unwrap_or("Unknown").to_string();
        let decimals: u8 = tx["tokenDecimal"].as_str().unwrap_or("18").parse().unwrap_or(18);

        // Fetch live balance via eth_call
        let balance = fetch_erc20_balance(&addr_lower, &contract, decimals).await.unwrap_or_default();
        seen.insert(contract.clone(), TokenBalance { symbol, name, balance, decimals, contract_address: contract });
    }

    let result: Vec<TokenBalance> = seen.into_values().filter(|t| t.balance != "0" && t.balance != "0.000000").collect();
    if let Ok(v) = serde_json::to_value(&result) { db::set_token_balances(&chain, &address, &v); }
    Ok(result)
}

async fn fetch_erc20_balance(owner: &str, contract: &str, decimals: u8) -> Result<String, String> {
    // balanceOf(address) = 0x70a08231 + padded address
    let padded = format!("000000000000000000000000{}", owner.trim_start_matches("0x"));
    let data = format!("0x70a08231{padded}");

    let body = serde_json::json!({
        "jsonrpc": "2.0", "id": 1, "method": "eth_call",
        "params": [{"to": contract, "data": data}, "latest"]
    });

    let rpc_url = crate::services::rpc::eth_rpc();
    let resp = crate::services::rpc::HTTP.post(&rpc_url).json(&body).send().await
        .map_err(|e| format!("eth_call 失败: {e}"))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let hex_val = json["result"].as_str().unwrap_or("0x0");
    let hex_clean = hex_val.trim_start_matches("0x");

    // ERC-20 balanceOf returns a 32-byte (64 hex char) big-endian uint256.
    // Take the full 64 chars (zero-padded from the left) and parse as U256 via
    // the `alloy` primitive to avoid u128 overflow for tokens with large supply.
    let padded_hex = format!("{:0>64}", hex_clean);
    let balance_u256 = alloy::primitives::U256::from_str_radix(&padded_hex, 16).unwrap_or_default();

    // Format with correct decimal places (display up to 6 significant decimals)
    let divisor = alloy::primitives::U256::from(10u128.pow(decimals.min(18) as u32));
    let whole = balance_u256 / divisor;
    let remainder = balance_u256 % divisor;

    // Build decimal string with 6 decimal places
    let remainder_str = format!("{:0>width$}", remainder, width = decimals.min(18) as usize);
    let decimal_part = &remainder_str[..6.min(remainder_str.len())];
    Ok(format!("{whole}.{decimal_part}"))
}


// ── Phase 3: ERC-20 send ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_send_token(
    account_id: String,
    password: String,
    contract_address: String,
    to: String,
    amount: String,
    decimals: u8,
    max_fee_gwei: String,
    priority_fee_gwei: String,
) -> Result<HashOut, String> {
    let mut key_bytes = load_eth_private_key(&account_id, &password)?;
    let signing_key = SigningKey::from_slice(&key_bytes).map_err(|_| "私钥格式错误")?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    let from_addr = get_eth_address(&account_id)?;
    let wallet = EthereumWallet::from(signer);

    let contract_addr = Address::from_str(&contract_address).map_err(|_| "无效的合约地址")?;
    let to_addr = Address::from_str(&to).map_err(|_| "无效的收款地址")?;

    // Parse amount to smallest unit
    let amount_f: f64 = amount.parse().map_err(|_| "无效的金额")?;
    let divisor = 10u128.pow(decimals as u32) as f64;
    let raw_amount = (amount_f * divisor) as u128;

    // Encode transfer(address,uint256) calldata
    let selector = hex::decode("a9059cbb").unwrap();
    let to_padded = format!("000000000000000000000000{}", hex::encode(to_addr.as_slice()));
    let amount_padded = format!("{raw_amount:0>64x}");
    let calldata_hex = format!("{}{to_padded}{amount_padded}", hex::encode(&selector));
    let calldata = Bytes::from(hex::decode(&calldata_hex).map_err(|e| e.to_string())?);

    let provider = make_provider();
    let nonce = provider.get_transaction_count(from_addr).await.map_err(|e| format!("获取 nonce 失败: {e}"))?;
    let (max_fee, prio_fee) = parse_gas_fees(&max_fee_gwei, &priority_fee_gwei, &provider).await;

    let rpc_url = crate::services::rpc::get_best_rpc(&active_chain())
        .unwrap_or_else(|| crate::services::rpc::eth_rpc());
    let provider_with_signer = ProviderBuilder::new().wallet(wallet).on_http(rpc_url.parse().map_err(|_| "RPC URL 无效")?);
    let tx = TransactionRequest::default()
        .from(from_addr).to(contract_addr).value(U256::ZERO).input(calldata.into())
        .nonce(nonce).max_fee_per_gas(max_fee).max_priority_fee_per_gas(prio_fee).gas_limit(100_000u64);

    let pending = provider_with_signer.send_transaction(tx).await.map_err(|e| format!("广播交易失败: {e}"))?;
    let hash = *pending.tx_hash();
    key_bytes.zeroize();
    Ok(HashOut { hash: format!("{hash:#x}") })
}

async fn parse_gas_fees(max_fee_gwei: &str, priority_fee_gwei: &str, provider: &impl Provider) -> (u128, u128) {
    if max_fee_gwei != "0" && !max_fee_gwei.is_empty() {
        let mf = (max_fee_gwei.parse::<f64>().unwrap_or(20.0) * 1e9) as u128;
        let pf = (priority_fee_gwei.parse::<f64>().unwrap_or(1.5) * 1e9) as u128;
        return (mf, pf);
    }
    let prio = provider.get_max_priority_fee_per_gas().await.unwrap_or(1_500_000_000u128);
    let base = if let Ok(Some(block)) = provider.get_block_by_number(alloy::eips::BlockNumberOrTag::Latest, false).await {
        block.header.base_fee_per_gas.unwrap_or(1_000_000_000u64) as u128
    } else { 1_000_000_000u128 };
    (base * 2 + prio, prio)
}


// ── Phase 3: Calldata decode ──────────────────────────────────────────────────

#[tauri::command]
pub fn eth_decode_calldata(data: String) -> Result<Option<CalldataDecoded>, String> {
    let hex_clean = data.trim_start_matches("0x");
    if hex_clean.len() < 8 { return Ok(None); }
    let selector = &hex_clean[..8];
    let params_hex = &hex_clean[8..];

    let decoded = match selector {
        "a9059cbb" => {
            if params_hex.len() < 128 { return Ok(None); }
            let to = format!("0x{}", &params_hex[24..64]);
            let amount = u128::from_str_radix(&params_hex[64..128], 16).unwrap_or(0);
            Some(CalldataDecoded {
                name: "transfer".to_string(),
                params: vec![
                    CalldataParam { name: "to".to_string(), value: to },
                    CalldataParam { name: "amount".to_string(), value: amount.to_string() },
                ],
            })
        }
        "095ea7b3" => {
            if params_hex.len() < 128 { return Ok(None); }
            let spender = format!("0x{}", &params_hex[24..64]);
            let amount = u128::from_str_radix(&params_hex[64..128], 16).unwrap_or(0);
            Some(CalldataDecoded {
                name: "approve".to_string(),
                params: vec![
                    CalldataParam { name: "spender".to_string(), value: spender },
                    CalldataParam { name: "amount".to_string(), value: amount.to_string() },
                ],
            })
        }
        "23b872dd" => {
            if params_hex.len() < 192 { return Ok(None); }
            let from = format!("0x{}", &params_hex[24..64]);
            let to = format!("0x{}", &params_hex[88..128]);
            let amount = u128::from_str_radix(&params_hex[128..192], 16).unwrap_or(0);
            Some(CalldataDecoded {
                name: "transferFrom".to_string(),
                params: vec![
                    CalldataParam { name: "from".to_string(), value: from },
                    CalldataParam { name: "to".to_string(), value: to },
                    CalldataParam { name: "amount".to_string(), value: amount.to_string() },
                ],
            })
        }
        "38ed1739" => Some(CalldataDecoded { name: "swapExactTokensForTokens".to_string(), params: vec![] }),
        "7ff36ab5" => Some(CalldataDecoded { name: "swapExactETHForTokens".to_string(), params: vec![] }),
        _ => None,
    };
    Ok(decoded)
}

// ── Phase 3: Preview ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_preview_transaction(
    from: String,
    to: String,
    value: Option<String>,
    data: Option<String>,
) -> Result<EthTxPreview, String> {
    let from_addr = Address::from_str(&from).map_err(|_| "无效的发送方地址")?;
    let to_addr = Address::from_str(&to).map_err(|_| "无效的目标地址")?;
    let provider = make_provider();

    // Check if target is a contract (has code)
    let code = provider.get_code_at(to_addr).await.unwrap_or_default();
    let is_contract = !code.is_empty();

    // Decode calldata if present
    let decoded = if let Some(ref d) = data {
        eth_decode_calldata(d.clone()).unwrap_or(None)
    } else { None };

    // Estimate gas
    let wei_value = value.as_deref()
        .and_then(|v| u128::from_str_radix(v.trim_start_matches("0x"), 16).ok())
        .unwrap_or(0);
    let calldata_bytes = data.as_deref()
        .map(|d| hex::decode(d.trim_start_matches("0x")).unwrap_or_default())
        .unwrap_or_default();

    let tx = TransactionRequest::default()
        .from(from_addr).to(to_addr).value(U256::from(wei_value))
        .input(Bytes::from(calldata_bytes).into());
    let gas_estimate = provider.estimate_gas(&tx).await.unwrap_or(21_000u64);

    // Get max fee recommendation
    let block = provider.get_block_by_number(alloy::eips::BlockNumberOrTag::Latest, false).await
        .ok().flatten();
    let base_fee = block.and_then(|b| b.header.base_fee_per_gas).unwrap_or(1_000_000_000u64);
    let prio = provider.get_max_priority_fee_per_gas().await.unwrap_or(1_500_000_000u128);
    let max_fee = (base_fee as u128) * 2 + prio;

    Ok(EthTxPreview {
        is_contract,
        decoded,
        gas_estimate: gas_estimate.to_string(),
        max_fee_gwei: gwei_str(max_fee),
    })
}


// ── Phase 3: Token info / custom balance ──────────────────────────────────────

#[tauri::command]
pub async fn eth_query_token_info(contract_address: String) -> Result<TokenInfo, String> {
    // Call name(), symbol(), decimals() via eth_call
    async fn call(contract: &str, data: &str) -> Option<String> {
        let rpc_url = crate::services::rpc::get_best_rpc(&crate::services::rpc::get_active_chain())
            .unwrap_or_else(|| ETH_RPC.to_string());
        let body = serde_json::json!({
            "jsonrpc":"2.0","id":1,"method":"eth_call",
            "params":[{"to":contract,"data":data},"latest"]
        });
        let resp = crate::services::rpc::HTTP.post(&rpc_url).json(&body).send().await.ok()?;
        let json: serde_json::Value = resp.json().await.ok()?;
        json["result"].as_str().map(String::from)
    }

    let symbol_raw = call(&contract_address, "0x95d89b41").await.unwrap_or_default();
    let name_raw   = call(&contract_address, "0x06fdde03").await.unwrap_or_default();
    let dec_raw    = call(&contract_address, "0x313ce567").await.unwrap_or_default();
    fn decode_string(hex: &str) -> String {
        let h = hex.trim_start_matches("0x");
        if h.len() < 128 { return String::new(); }
        let len = usize::from_str_radix(&h[64..128], 16).unwrap_or(0);
        let bytes = hex::decode(&h[128..128 + len * 2]).unwrap_or_default();
        String::from_utf8(bytes).unwrap_or_default().trim().to_string()
    }

    let symbol = decode_string(&symbol_raw);
    let name   = decode_string(&name_raw);
    let decimals: u8 = u8::from_str_radix(
        dec_raw.trim_start_matches("0x").trim_start_matches('0').get(0..).unwrap_or("12"),
        16).unwrap_or(18);

    if symbol.is_empty() { return Err("无法获取代币信息，请检查合约地址".to_string()); }
    Ok(TokenInfo { symbol, name, decimals, contract_address })
}

#[tauri::command]
pub async fn eth_get_custom_token_balance(
    address: String,
    contract_address: String,
    decimals: u8,
) -> Result<String, String> {
    fetch_erc20_balance(&address.to_lowercase(), &contract_address, decimals).await
}

// ── Phase 3: History ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_get_history(address: String, page: u32, offset: u32) -> Result<Vec<TxRecord>, String> {
    let chain = active_chain();
    let page = page.max(1);
    let offset = if offset == 0 { 20 } else { offset };
    // Cache only page 1
    if page == 1 {
        if let Some(cached) = db::get_tx_history(&chain, &address, db::TTL_HISTORY) {
            if let Ok(txs) = serde_json::from_value::<Vec<TxRecord>>(cached) {
                return Ok(txs);
            }
        }
    }
    let api_base = explorer_api_url(&chain)
        .unwrap_or_else(|| "https://api.etherscan.io/api".to_string());
    let url = format!(
        "{api_base}?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page={page}&offset={offset}&sort=desc"
    );
    let resp = crate::services::rpc::HTTP.get(&url).send().await.map_err(|e| format!("请求历史失败: {e}"))?;
    let json: serde_json::Value = resp.json().await.map_err(|e| format!("解析历史失败: {e}"))?;

    let txs = match json["result"].as_array() {
        Some(arr) => arr.clone(),
        None => return Ok(vec![]),
    };

    let records: Vec<TxRecord> = txs.iter().map(|tx| TxRecord {
        hash:          tx["hash"].as_str().unwrap_or("").to_string(),
        from:          tx["from"].as_str().unwrap_or("").to_string(),
        to:            tx["to"].as_str().unwrap_or("").to_string(),
        value:         tx["value"].as_str().unwrap_or("0").to_string(),
        timestamp:     tx["timeStamp"].as_str().unwrap_or("0").parse().unwrap_or(0),
        gas_used:      tx["gasUsed"].as_str().map(String::from),
        gas_price:     tx["gasPrice"].as_str().map(String::from),
        is_error:      tx["isError"].as_str().unwrap_or("0") == "1",
        method:        tx["functionName"].as_str().filter(|s| !s.is_empty()).map(String::from),
        confirmations: tx["confirmations"].as_str().map(String::from),
    }).collect();
    // Persist page 1 to cache
    if page == 1 {
        if let Ok(v) = serde_json::to_value(&records) { db::set_tx_history(&chain, &address, &v); }
    }
    Ok(records)
} ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_estimate_gas(
    from: String, to: String, value: String, data: String,
) -> Result<String, String> {
    let from_addr = Address::from_str(&from).map_err(|_| "无效的发送方地址")?;
    let to_addr   = Address::from_str(&to).map_err(|_| "无效的目标地址")?;
    let wei: u128 = value.trim_start_matches("0x")
        .parse::<u128>().or_else(|_| u128::from_str_radix(value.trim_start_matches("0x"), 16))
        .unwrap_or(0);
    let calldata = hex::decode(data.trim_start_matches("0x")).unwrap_or_default();
    let provider = make_provider();
    let tx = TransactionRequest::default()
        .from(from_addr).to(to_addr).value(U256::from(wei)).input(Bytes::from(calldata).into());
    let gas = provider.estimate_gas(&tx).await.map_err(|e| format!("Gas 估算失败: {e}"))?;
    Ok(gas.to_string())
}


// ── Phase 3: Speed up / Cancel ────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_speed_up_transaction(
    account_id: String,
    password: String,
    tx_hash: String,
) -> Result<serde_json::Value, String> {
    let mut key_bytes = load_eth_private_key(&account_id, &password)?;
    let signing_key = SigningKey::from_slice(&key_bytes).map_err(|_| "私钥格式错误")?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    let from_addr = get_eth_address(&account_id)?;
    let wallet = EthereumWallet::from(signer);

    let provider = make_provider();
    let hash_bytes = alloy::primitives::FixedBytes::<32>::from_str(tx_hash.trim_start_matches("0x"))
        .map_err(|_| "无效的交易哈希")?;

    let old_tx = provider.get_transaction_by_hash(hash_bytes).await
        .map_err(|e| format!("获取交易失败: {e}"))?.ok_or("交易不存在")?;

    let old_max_fee = old_tx.max_fee_per_gas.unwrap_or(20_000_000_000u128);
    let old_prio    = old_tx.max_priority_fee_per_gas.unwrap_or(1_500_000_000u128);
    // Bump 10% and add 2 gwei to priority
    let new_max_fee = (old_max_fee as f64 * 1.1) as u128;
    let new_prio    = old_prio + 2_000_000_000u128;

    let provider_with_signer = ProviderBuilder::new().wallet(wallet).on_http(crate::services::rpc::get_best_rpc(&active_chain()).unwrap_or_else(|| crate::services::rpc::eth_rpc()).parse().map_err(|_| "RPC URL 无效")?);
    let tx = TransactionRequest::default()
        .from(from_addr)
        .to(old_tx.to.unwrap_or(from_addr))
        .value(old_tx.value)
        .nonce(old_tx.nonce)
        .max_fee_per_gas(new_max_fee)
        .max_priority_fee_per_gas(new_prio)
        .gas_limit(old_tx.gas)
        .input(old_tx.input.clone().into());

    let pending = provider_with_signer.send_transaction(tx).await.map_err(|e| format!("加速交易失败: {e}"))?;
    let new_hash = *pending.tx_hash();
    key_bytes.zeroize();

    Ok(serde_json::json!({ "hash": format!("{new_hash:#x}"), "oldHash": tx_hash }))
}

#[tauri::command]
pub async fn eth_cancel_transaction(
    account_id: String,
    password: String,
    tx_hash: String,
) -> Result<serde_json::Value, String> {
    let mut key_bytes = load_eth_private_key(&account_id, &password)?;
    let signing_key = SigningKey::from_slice(&key_bytes).map_err(|_| "私钥格式错误")?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    let from_addr = get_eth_address(&account_id)?;
    let wallet = EthereumWallet::from(signer);

    let provider = make_provider();
    let hash_bytes = alloy::primitives::FixedBytes::<32>::from_str(tx_hash.trim_start_matches("0x"))
        .map_err(|_| "无效的交易哈希")?;
    let old_tx = provider.get_transaction_by_hash(hash_bytes).await
        .map_err(|e| format!("获取交易失败: {e}"))?.ok_or("交易不存在")?;

    let old_max_fee = old_tx.max_fee_per_gas.unwrap_or(20_000_000_000u128);
    let old_prio    = old_tx.max_priority_fee_per_gas.unwrap_or(1_500_000_000u128);
    let new_max_fee = (old_max_fee as f64 * 1.1) as u128;
    let new_prio    = old_prio + 2_000_000_000u128;

    let provider_with_signer = ProviderBuilder::new().wallet(wallet).on_http(crate::services::rpc::get_best_rpc(&active_chain()).unwrap_or_else(|| crate::services::rpc::eth_rpc()).parse().map_err(|_| "RPC URL 无效")?);
    // Self-transfer with 0 value at same nonce = cancel
    let tx = TransactionRequest::default()
        .from(from_addr).to(from_addr).value(U256::ZERO)
        .nonce(old_tx.nonce).max_fee_per_gas(new_max_fee).max_priority_fee_per_gas(new_prio).gas_limit(21_000u64);

    let pending = provider_with_signer.send_transaction(tx).await.map_err(|e| format!("取消交易失败: {e}"))?;
    let new_hash = *pending.tx_hash();
    key_bytes.zeroize();

    Ok(serde_json::json!({ "hash": format!("{new_hash:#x}"), "oldHash": tx_hash }))
}
