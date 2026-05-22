use alloy::{
    network::EthereumWallet,
    primitives::{utils::format_units, Address, U256},
    providers::{Provider, ProviderBuilder},
    rpc::types::TransactionRequest,
    signers::k256::ecdsa::SigningKey,
    signers::local::PrivateKeySigner,
};
use std::str::FromStr;
use zeroize::Zeroize;

use crate::{
    models::HashOut,
    services::rpc::ETH_RPC,
};
use super::wallet::{get_eth_address, load_eth_private_key};

fn make_provider(
) -> alloy::providers::RootProvider<alloy::transports::http::Http<reqwest::Client>> {
    ProviderBuilder::new()
        .on_http(ETH_RPC.parse().expect("invalid RPC URL"))
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn eth_get_balance(address: String) -> Result<String, String> {
    let addr = Address::from_str(&address).map_err(|_| "无效的以太坊地址")?;
    let provider = make_provider();

    let wei = provider
        .get_balance(addr)
        .await
        .map_err(|e| format!("获取余额失败: {e}"))?;

    let eth = format_units(wei, "ether").map_err(|e| format!("单位转换失败: {e}"))?;

    // Trim to 6 decimal places
    let trimmed = if let Some(dot_pos) = eth.find('.') {
        let decimals = &eth[dot_pos + 1..];
        if decimals.len() > 6 {
            format!("{}.{}", &eth[..dot_pos], &decimals[..6])
        } else {
            eth
        }
    } else {
        eth
    };

    Ok(trimmed)
}

#[tauri::command]
pub async fn eth_send_transaction(
    account_id: String,
    password: String,
    to: String,
    amount: String,
    // Phase 3: use these; for now, auto-estimate
    #[allow(unused_variables)] max_fee_gwei: String,
    #[allow(unused_variables)] priority_fee_gwei: String,
) -> Result<HashOut, String> {
    // 1. Decrypt private key (also verifies password + rate limit)
    let mut key_bytes = load_eth_private_key(&account_id, &password)?;

    // 2. Build signer
    let signing_key =
        SigningKey::from_slice(&key_bytes).map_err(|_| "私钥格式错误")?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    let from_addr = get_eth_address(&account_id)?;
    let wallet = EthereumWallet::from(signer);

    let to_addr = Address::from_str(&to).map_err(|_| "无效的收款地址")?;

    // 3. Parse amount (ETH → Wei)
    let amount_f: f64 = amount.parse().map_err(|_| "无效的金额")?;
    let wei_value = U256::from((amount_f * 1e18) as u128);

    // 4. Get nonce
    let provider = make_provider();
    let nonce = provider
        .get_transaction_count(from_addr)
        .await
        .map_err(|e| format!("获取 nonce 失败: {e}"))?;

    // 5. Get fee info
    let block = provider
        .get_block_by_number(alloy::eips::BlockNumberOrTag::Latest, false)
        .await
        .map_err(|e| format!("获取区块失败: {e}"))?
        .ok_or("区块不存在")?;

    let base_fee = block
        .header
        .base_fee_per_gas
        .unwrap_or(1_000_000_000u64); // 1 gwei fallback

    let priority_fee = provider
        .get_max_priority_fee_per_gas()
        .await
        .unwrap_or(1_500_000_000u128); // 1.5 gwei fallback

    let max_fee = (base_fee as u128) * 2 + priority_fee;

    // 6. Build and sign transaction
    let provider_with_signer = ProviderBuilder::new()
        .wallet(wallet)
        .on_http(ETH_RPC.parse().expect("invalid RPC URL"));

    let tx = TransactionRequest::default()
        .from(from_addr)
        .to(to_addr)
        .value(wei_value)
        .nonce(nonce)
        .max_fee_per_gas(max_fee)
        .max_priority_fee_per_gas(priority_fee)
        .gas_limit(21_000u64);

    // 7. Send
    let pending = provider_with_signer
        .send_transaction(tx)
        .await
        .map_err(|e| format!("广播交易失败: {e}"))?;

    let hash = *pending.tx_hash();

    // Zeroize key material
    key_bytes.zeroize();

    Ok(HashOut {
        hash: format!("{hash:#x}"),
    })
}
