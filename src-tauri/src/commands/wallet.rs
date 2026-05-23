use alloy::primitives::Address;
use alloy::signers::k256::ecdsa::SigningKey;
use alloy::signers::local::PrivateKeySigner;
use bip39::{Language, Mnemonic};
use coins_bip32::path::DerivationPath;
use std::str::FromStr;
use uuid::Uuid;
use zeroize::Zeroize;

use crate::{
    models::{AccountAddresses, AccountMeta},
    services::{
        crypto,
        storage::{self, load, save},
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn derive_eth_key(mnemonic: &Mnemonic, index: u32) -> Result<Vec<u8>, String> {
    let seed = mnemonic.to_seed("");
    let path_str = format!("m/44'/60'/0'/0/{index}");
    let path =
        DerivationPath::from_str(&path_str).map_err(|e| format!("派生路径错误: {e}"))?;
    let root = coins_bip32::xkeys::XPrivKey::root_from_seed(seed.as_bytes(), None)
        .map_err(|e| format!("根密钥派生失败: {e}"))?;
    let child = root
        .derive_path(&path)
        .map_err(|e| format!("子密钥派生失败: {e}"))?;
    Ok(child.key.to_bytes().to_vec())
}

fn eth_address_from_key(private_key_bytes: &[u8]) -> Result<String, String> {
    let signing_key = SigningKey::from_slice(private_key_bytes)
        .map_err(|e| format!("私钥格式错误: {e}"))?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    Ok(format!("{}", signer.address()))
}

/// Check that an account is not a watch-only wallet (for signing operations)
fn require_signing_account(account_id: &str) -> Result<(), String> {
    let store = load();
    let meta = store
        .accounts
        .iter()
        .find(|a| a.id == account_id)
        .ok_or("账户不存在")?;
    if meta.account_type == "watch" {
        return Err("观察钱包不支持此操作".to_string());
    }
    Ok(())
}

// ── Phase 1 Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub fn generate_mnemonic() -> Result<Vec<String>, String> {
    let mnemonic = Mnemonic::new(bip39::MnemonicType::Words12, Language::English);
    let words: Vec<String> = mnemonic
        .phrase()
        .split_whitespace()
        .map(String::from)
        .collect();
    Ok(words)
}

#[tauri::command]
pub fn has_wallet() -> Result<bool, String> {
    let store = load();
    Ok(store.password_verify.is_some() && !store.accounts.is_empty())
}

#[tauri::command]
pub fn get_accounts() -> Result<Vec<AccountMeta>, String> {
    Ok(load().accounts)
}

#[tauri::command]
pub fn verify_password(password: String) -> Result<bool, String> {
    storage::check_rate_limit()?;
    let store = load();
    let blob = store
        .password_verify
        .as_ref()
        .ok_or("数据不存在，请重新创建钱包")?;
    match crypto::decrypt(blob, password.as_bytes()) {
        Ok(plain) if plain == b"OK" => {
            storage::record_success();
            Ok(true)
        }
        _ => {
            storage::record_fail();
            Err("密码不正确".to_string())
        }
    }
}

#[tauri::command]
pub fn create_from_mnemonic(
    words: Vec<String>,
    password: String,
    name: String,
) -> Result<AccountMeta, String> {
    let phrase = words.join(" ");
    let mnemonic = Mnemonic::from_phrase(&phrase, Language::English)
        .map_err(|_| "无效的助记词")?;

    let mut eth_key_bytes = derive_eth_key(&mnemonic, 0)?;
    let eth_address = eth_address_from_key(&eth_key_bytes)?;

    let account_id = Uuid::new_v4().to_string();
    let meta = AccountMeta {
        id: account_id.clone(),
        name: if name.is_empty() { "Account 1".to_string() } else { name },
        account_type: "hd".to_string(),
        chain: None,
        addresses: AccountAddresses { eth: Some(eth_address), btc: None, sol: None },
        index: Some(0),
    };

    let mut store = load();
    let pwd_bytes = password.as_bytes();
    store.password_verify = Some(crypto::encrypt(b"OK", pwd_bytes)?);
    store.mnemonic = Some(crypto::encrypt(phrase.as_bytes(), pwd_bytes)?);
    let eth_key_hex = hex::encode(&eth_key_bytes);
    store.eth_keys.insert(account_id.clone(), crypto::encrypt(eth_key_hex.as_bytes(), pwd_bytes)?);
    store.accounts.push(meta.clone());
    store.version = 1;
    eth_key_bytes.zeroize();
    save(&store)?;
    Ok(meta)
}

// ── Phase 2 Commands ──────────────────────────────────────────────────────────

/// Derive the next HD account from the existing mnemonic
#[tauri::command]
pub fn derive_next_account(password: String, name: String) -> Result<AccountMeta, String> {
    storage::check_rate_limit()?;
    let store = load();

    // Decrypt mnemonic
    let mnemonic_blob = store.mnemonic.as_ref().ok_or("助记词不存在")?;
    let mnemonic_bytes = crypto::decrypt(mnemonic_blob, password.as_bytes())
        .map_err(|_| { storage::record_fail(); "密码不正确" })?;
    storage::record_success();

    let phrase = std::str::from_utf8(&mnemonic_bytes).map_err(|_| "助记词格式错误")?;
    let mnemonic = Mnemonic::from_phrase(phrase, Language::English)
        .map_err(|_| "助记词格式错误")?;

    // Find next HD index
    let next_index = store
        .accounts
        .iter()
        .filter(|a| a.account_type == "hd")
        .filter_map(|a| a.index)
        .max()
        .map(|m| m + 1)
        .unwrap_or(1);

    let mut eth_key_bytes = derive_eth_key(&mnemonic, next_index)?;
    let eth_address = eth_address_from_key(&eth_key_bytes)?;

    let account_id = Uuid::new_v4().to_string();
    let account_name = if name.is_empty() {
        format!("Account {}", next_index + 1)
    } else {
        name
    };

    let meta = AccountMeta {
        id: account_id.clone(),
        name: account_name,
        account_type: "hd".to_string(),
        chain: None,
        addresses: AccountAddresses { eth: Some(eth_address), btc: None, sol: None },
        index: Some(next_index),
    };

    let mut store = load();
    let eth_key_hex = hex::encode(&eth_key_bytes);
    store.eth_keys.insert(account_id.clone(), crypto::encrypt(eth_key_hex.as_bytes(), password.as_bytes())?);
    store.accounts.push(meta.clone());
    eth_key_bytes.zeroize();
    save(&store)?;
    Ok(meta)
}

/// Import a single-chain private key
#[tauri::command]
pub fn import_private_key(
    chain: String,
    private_key: String,
    password: String,
    name: String,
) -> Result<AccountMeta, String> {
    storage::check_rate_limit()?;
    // Verify password first
    let store = load();
    if let Some(blob) = &store.password_verify {
        crypto::decrypt(blob, password.as_bytes())
            .map_err(|_| { storage::record_fail(); "密码不正确" })?;
    }
    storage::record_success();

    let chain = chain.to_uppercase();
    let account_id = Uuid::new_v4().to_string();
    let account_name = if name.is_empty() { format!("Imported {chain}") } else { name };

    let mut store = load();

    match chain.as_str() {
        "ETH" => {
            // Accept hex with or without 0x prefix
            let hex_clean = private_key.trim_start_matches("0x");
            let key_bytes = hex::decode(hex_clean).map_err(|_| "无效的 ETH 私钥（需要十六进制格式）")?;
            if key_bytes.len() != 32 {
                return Err("ETH 私钥长度错误（需要 32 字节）".to_string());
            }
            let eth_address = eth_address_from_key(&key_bytes)?;
            let meta = AccountMeta {
                id: account_id.clone(),
                name: account_name,
                account_type: "imported".to_string(),
                chain: Some("ETH".to_string()),
                addresses: AccountAddresses { eth: Some(eth_address), btc: None, sol: None },
                index: None,
            };
            store.eth_keys.insert(account_id.clone(), crypto::encrypt(hex_clean.as_bytes(), password.as_bytes())?);
            store.accounts.push(meta.clone());
            save(&store)?;
            Ok(meta)
        }
        _ => Err(format!("暂不支持导入 {chain} 私钥（Phase 4/5 实现）")),
    }
}

/// Import a watch-only wallet (address only, no private key)
#[tauri::command]
pub fn import_watch_wallet(
    address: String,
    chain: String,
    name: String,
) -> Result<AccountMeta, String> {
    let chain = chain.to_uppercase();
    let account_name = if name.is_empty() { format!("Watch {chain}") } else { name };

    // Basic address format validation
    match chain.as_str() {
        "ETH" => {
            if !address.starts_with("0x") || address.len() != 42 {
                return Err("无效的 ETH 地址格式（需要 0x 开头的 42 字符地址）".to_string());
            }
            Address::from_str(&address).map_err(|_| "无效的 ETH 地址")?;
        }
        "BTC" => {
            if !address.starts_with("bc1") && !address.starts_with('1') && !address.starts_with('3') {
                return Err("无效的 BTC 地址格式".to_string());
            }
        }
        "SOL" => {
            if address.len() < 32 || address.len() > 44 {
                return Err("无效的 SOL 地址格式".to_string());
            }
        }
        _ => return Err(format!("不支持的链: {chain}")),
    }

    let account_id = Uuid::new_v4().to_string();
    let addresses = match chain.as_str() {
        "ETH" => AccountAddresses { eth: Some(address), btc: None, sol: None },
        "BTC" => AccountAddresses { eth: None, btc: Some(address), sol: None },
        "SOL" => AccountAddresses { eth: None, btc: None, sol: Some(address) },
        _ => unreachable!(),
    };

    let meta = AccountMeta {
        id: account_id,
        name: account_name,
        account_type: "watch".to_string(),
        chain: Some(chain),
        addresses,
        index: None,
    };

    let mut store = load();
    store.accounts.push(meta.clone());
    save(&store)?;
    Ok(meta)
}

/// Export the mnemonic phrase (requires password, rate-limited)
#[tauri::command]
pub fn export_mnemonic(password: String) -> Result<Vec<String>, String> {
    storage::check_rate_limit()?;
    let store = load();
    let blob = store.mnemonic.as_ref().ok_or("助记词不存在")?;
    let mnemonic_bytes = crypto::decrypt(blob, password.as_bytes())
        .map_err(|_| { storage::record_fail(); "密码不正确" })?;
    storage::record_success();
    let phrase = std::str::from_utf8(&mnemonic_bytes).map_err(|_| "助记词格式错误")?;
    Ok(phrase.split_whitespace().map(String::from).collect())
}

/// Export a private key for a specific account and chain (requires password, rate-limited)
#[tauri::command]
pub fn get_private_key(
    account_id: String,
    chain: String,
    password: String,
) -> Result<String, String> {
    require_signing_account(&account_id)?;
    storage::check_rate_limit()?;

    let chain = chain.to_uppercase();
    match chain.as_str() {
        "ETH" => {
            let key_bytes = load_eth_private_key(&account_id, &password)?;
            Ok(format!("0x{}", hex::encode(&key_bytes)))
        }
        _ => Err(format!("{chain} 私钥导出将在 Phase 4/5 实现")),
    }
}

/// Change the wallet password — re-encrypts all stored keys
#[tauri::command]
pub fn change_password(old_password: String, new_password: String) -> Result<(), String> {
    storage::check_rate_limit()?;
    let mut store = load();

    // Verify old password
    let pv_blob = store.password_verify.as_ref().ok_or("钱包数据不存在")?;
    crypto::decrypt(pv_blob, old_password.as_bytes())
        .map_err(|_| { storage::record_fail(); "当前密码不正确" })?;
    storage::record_success();

    let old_pwd = old_password.as_bytes();
    let new_pwd = new_password.as_bytes();

    // Re-encrypt password verifier
    store.password_verify = Some(crypto::encrypt(b"OK", new_pwd)?);

    // Re-encrypt mnemonic if present
    if let Some(blob) = &store.mnemonic.clone() {
        let plain = crypto::decrypt(blob, old_pwd).map_err(|_| "助记词解密失败")?;
        store.mnemonic = Some(crypto::encrypt(&plain, new_pwd)?);
    }

    // Re-encrypt all ETH private keys
    let key_ids: Vec<String> = store.eth_keys.keys().cloned().collect();
    for id in key_ids {
        let blob = store.eth_keys[&id].clone();
        let plain = crypto::decrypt(&blob, old_pwd).map_err(|_| "私钥解密失败")?;
        store.eth_keys.insert(id, crypto::encrypt(&plain, new_pwd)?);
    }

    save(&store)?;
    Ok(())
}

// ── Shared helpers (used by eth.rs) ──────────────────────────────────────────

pub fn load_eth_private_key(account_id: &str, password: &str) -> Result<Vec<u8>, String> {
    require_signing_account(account_id)?;
    storage::check_rate_limit()?;

    let store = load();
    let blob = store.eth_keys.get(account_id).ok_or("账户不存在或无 ETH 私钥")?;

    // Single decrypt — the private key blob itself is the authoritative proof.
    // Removing the redundant password_verify re-check that previously caused
    // record_fail() to fire twice on a wrong password, halving the effective
    // rate-limit threshold from 5 to ~2-3 attempts.
    let hex_bytes = crypto::decrypt(blob, password.as_bytes()).map_err(|_| {
        storage::record_fail();
        "密码不正确"
    })?;
    storage::record_success();

    let hex_str = std::str::from_utf8(&hex_bytes).map_err(|_| "私钥格式错误")?;
    hex::decode(hex_str).map_err(|_| "私钥格式错误".to_string())
}

pub fn get_eth_address(account_id: &str) -> Result<Address, String> {
    let store = load();
    let meta = store.accounts.iter().find(|a| a.id == account_id).ok_or("账户不存在")?;
    let addr_str = meta.addresses.eth.as_deref().ok_or("账户无 ETH 地址")?;
    Address::from_str(addr_str).map_err(|_| "ETH 地址格式错误".to_string())
}
