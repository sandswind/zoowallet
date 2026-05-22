use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::PathBuf,
    sync::{LazyLock, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

use crate::models::{AccountMeta, EncryptedBlob};

/// Rate limiter state persisted inside WalletStore
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RateLimitState {
    pub fails: u32,
    /// Unix timestamp (seconds) until which the wallet is locked
    pub locked_until: u64,
}

/// Top-level wallet storage schema
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WalletStore {
    pub version: u32,
    /// Encrypted "OK" string — used to verify the password
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password_verify: Option<EncryptedBlob>,
    /// Encrypted BIP-39 mnemonic (space-joined)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mnemonic: Option<EncryptedBlob>,
    /// account_id → AccountMeta (public metadata, not encrypted)
    #[serde(default)]
    pub accounts: Vec<AccountMeta>,
    /// account_id → encrypted ETH private key (hex)
    #[serde(default)]
    pub eth_keys: HashMap<String, EncryptedBlob>,
    pub rate_limit: RateLimitState,
}

static STORE_PATH: LazyLock<Mutex<Option<PathBuf>>> = LazyLock::new(|| Mutex::new(None));
static WALLET_STORE: LazyLock<Mutex<WalletStore>> =
    LazyLock::new(|| Mutex::new(WalletStore::default()));

/// Call once at app startup with the Tauri app handle to set the data dir
pub fn init_store_path(app: &tauri::AppHandle) {
    let path = app
        .path()
        .app_data_dir()
        .expect("Could not get app data dir")
        .join("wallet-store.json");
    *STORE_PATH.lock().unwrap() = Some(path.clone());

    // Load from disk if exists
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(store) = serde_json::from_str::<WalletStore>(&data) {
                *WALLET_STORE.lock().unwrap_or_else(|p| p.into_inner()) = store;
            }
        }
    }
}

fn store_path() -> PathBuf {
    STORE_PATH
        .lock()
        .unwrap()
        .clone()
        .expect("store path not initialized")
}

/// Read a clone of the current in-memory store
pub fn load() -> WalletStore {
    WALLET_STORE
        .lock()
        .unwrap_or_else(|p| p.into_inner())
        .clone()
}

/// Atomically persist the store to disk and update in-memory state
pub fn save(store: &WalletStore) -> Result<(), String> {
    let path = store_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {e}"))?;
    }

    let json = serde_json::to_string_pretty(store).map_err(|e| format!("序列化失败: {e}"))?;
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, &json).map_err(|e| format!("写入临时文件失败: {e}"))?;
    fs::rename(&tmp_path, &path).map_err(|e| format!("原子重命名失败: {e}"))?;

    *WALLET_STORE.lock().unwrap_or_else(|p| p.into_inner()) = store.clone();
    Ok(())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
}

/// Returns `Ok(())` if allowed, `Err(message)` if locked
pub fn check_rate_limit() -> Result<(), String> {
    let store = load();
    let rl = &store.rate_limit;
    if rl.locked_until > now_secs() {
        let remaining = rl.locked_until - now_secs();
        return Err(format!("密码尝试次数过多，请 {remaining} 秒后重试"));
    }
    Ok(())
}

/// Record a failed password attempt; locks after 5 failures
pub fn record_fail() {
    let mut store = load();
    store.rate_limit.fails += 1;
    if store.rate_limit.fails >= 5 {
        store.rate_limit.locked_until = now_secs() + 60;
        store.rate_limit.fails = 0;
    }
    let _ = save(&store);
}

/// Reset the rate limiter on success
pub fn record_success() {
    let mut store = load();
    store.rate_limit.fails = 0;
    store.rate_limit.locked_until = 0;
    let _ = save(&store);
}
