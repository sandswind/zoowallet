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

/// Derive an ETH private key from a mnemonic at m/44'/60'/0'/0/{index}
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

/// Format ETH address as EIP-55 checksum address
fn eth_address_from_key(private_key_bytes: &[u8]) -> Result<String, String> {
    let signing_key = SigningKey::from_slice(private_key_bytes)
        .map_err(|e| format!("私钥格式错误: {e}"))?;
    let signer = PrivateKeySigner::from_signing_key(signing_key);
    Ok(format!("{}", signer.address()))
}

// ── Commands ──────────────────────────────────────────────────────────────────

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
        Ok(plain) => {
            let ok = plain == b"OK";
            if ok {
                storage::record_success();
            } else {
                storage::record_fail();
            }
            if ok {
                Ok(true)
            } else {
                Err("密码不正确".to_string())
            }
        }
        Err(_) => {
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
    // Validate mnemonic
    let phrase = words.join(" ");
    let mnemonic = Mnemonic::from_phrase(&phrase, Language::English)
        .map_err(|_| "无效的助记词")?;

    // Derive ETH key at index 0
    let mut eth_key_bytes = derive_eth_key(&mnemonic, 0)?;
    let eth_address = eth_address_from_key(&eth_key_bytes)?;

    // Build AccountMeta
    let account_id = Uuid::new_v4().to_string();
    let meta = AccountMeta {
        id: account_id.clone(),
        name: if name.is_empty() {
            "Account 1".to_string()
        } else {
            name
        },
        account_type: "hd".to_string(),
        chain: None,
        addresses: AccountAddresses {
            eth: Some(eth_address),
            btc: None,
            sol: None,
        },
        index: Some(0),
    };

    // Encrypt and persist
    let mut store = load();

    // Encrypt password verification token
    let pwd_bytes = password.as_bytes();
    store.password_verify = Some(crypto::encrypt(b"OK", pwd_bytes)?);

    // Encrypt mnemonic
    store.mnemonic = Some(crypto::encrypt(phrase.as_bytes(), pwd_bytes)?);

    // Encrypt ETH private key
    let eth_key_hex = hex::encode(&eth_key_bytes);
    store
        .eth_keys
        .insert(account_id.clone(), crypto::encrypt(eth_key_hex.as_bytes(), pwd_bytes)?);

    // Save account metadata (not encrypted)
    store.accounts.push(meta.clone());
    store.version = 1;

    // Zeroize sensitive data before returning
    eth_key_bytes.zeroize();

    save(&store)?;

    Ok(meta)
}

/// Helper used by eth commands to decrypt a private key
pub fn load_eth_private_key(account_id: &str, password: &str) -> Result<Vec<u8>, String> {
    storage::check_rate_limit()?;

    let store = load();
    let blob = store
        .eth_keys
        .get(account_id)
        .ok_or("账户不存在或无 ETH 私钥")?;

    let hex_bytes = crypto::decrypt(blob, password.as_bytes())
        .map_err(|_| {
            storage::record_fail();
            "密码不正确"
        })?;

    // Verify password against password_verify too
    if let Some(pv_blob) = &store.password_verify {
        let _ = crypto::decrypt(pv_blob, password.as_bytes()).map_err(|_| {
            storage::record_fail();
            "密码不正确"
        })?;
    }

    storage::record_success();

    let hex_str = std::str::from_utf8(&hex_bytes).map_err(|_| "私钥格式错误")?;
    hex::decode(hex_str).map_err(|_| "私钥格式错误".to_string())
}

/// Returns the ETH address for a given account_id
pub fn get_eth_address(account_id: &str) -> Result<Address, String> {
    let store = load();
    let meta = store
        .accounts
        .iter()
        .find(|a| a.id == account_id)
        .ok_or("账户不存在")?;
    let addr_str = meta.addresses.eth.as_deref().ok_or("账户无 ETH 地址")?;
    Address::from_str(addr_str).map_err(|_| "ETH 地址格式错误".to_string())
}
