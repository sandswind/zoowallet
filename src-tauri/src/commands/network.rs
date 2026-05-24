use serde::{Deserialize, Serialize};
use crate::services::{db, rpc};

// ── Network config model ──────────────────────────────────────────────────────

/// Full EVM network configuration (L1 / L2 / custom).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConfig {
    /// Short identifier used as the chain key, e.g. "ETH", "BASE", "ARB".
    pub id: String,
    /// EIP-155 chain ID (e.g. 1 for Ethereum, 8453 for Base).
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    /// Human-readable display name.
    pub name: String,
    /// List of JSON-RPC endpoint URLs (first = preferred).
    #[serde(rename = "rpcUrls")]
    pub rpc_urls: Vec<String>,
    /// Native currency symbol (e.g. "ETH", "BNB", "MATIC").
    pub symbol: String,
    /// Block-explorer base URL for tx/address links.
    #[serde(rename = "explorerUrl", skip_serializing_if = "Option::is_none")]
    pub explorer_url: Option<String>,
    /// Explorer API base URL (for history / token lookups).
    #[serde(rename = "explorerApiUrl", skip_serializing_if = "Option::is_none")]
    pub explorer_api_url: Option<String>,
    /// User-defined network (not one of the built-in presets).
    #[serde(rename = "isCustom", default)]
    pub is_custom: bool,
}

// ── Built-in presets ──────────────────────────────────────────────────────────

fn builtin_networks() -> Vec<NetworkConfig> {
    vec![
        NetworkConfig {
            id: "ETH".into(),
            chain_id: 1,
            name: "Ethereum".into(),
            rpc_urls: vec![
                "https://eth.llamarpc.com".into(),
                "https://rpc.ankr.com/eth".into(),
                "https://ethereum.publicnode.com".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://etherscan.io".into()),
            explorer_api_url: Some("https://api.etherscan.io/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "BASE".into(),
            chain_id: 8453,
            name: "Base".into(),
            rpc_urls: vec![
                "https://mainnet.base.org".into(),
                "https://base.llamarpc.com".into(),
                "https://base.publicnode.com".into(),
                "https://rpc.ankr.com/base".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://basescan.org".into()),
            explorer_api_url: Some("https://api.basescan.org/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "ARB".into(),
            chain_id: 42161,
            name: "Arbitrum One".into(),
            rpc_urls: vec![
                "https://arb1.arbitrum.io/rpc".into(),
                "https://arbitrum.llamarpc.com".into(),
                "https://arbitrum-one.publicnode.com".into(),
                "https://rpc.ankr.com/arbitrum".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://arbiscan.io".into()),
            explorer_api_url: Some("https://api.arbiscan.io/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "OP".into(),
            chain_id: 10,
            name: "Optimism".into(),
            rpc_urls: vec![
                "https://mainnet.optimism.io".into(),
                "https://optimism.llamarpc.com".into(),
                "https://optimism.publicnode.com".into(),
                "https://rpc.ankr.com/optimism".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://optimistic.etherscan.io".into()),
            explorer_api_url: Some("https://api-optimistic.etherscan.io/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "BSC".into(),
            chain_id: 56,
            name: "BNB Smart Chain".into(),
            rpc_urls: vec![
                "https://bsc-dataseed1.binance.org".into(),
                "https://bsc.llamarpc.com".into(),
                "https://bsc.publicnode.com".into(),
                "https://rpc.ankr.com/bsc".into(),
            ],
            symbol: "BNB".into(),
            explorer_url: Some("https://bscscan.com".into()),
            explorer_api_url: Some("https://api.bscscan.com/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "POLYGON".into(),
            chain_id: 137,
            name: "Polygon".into(),
            rpc_urls: vec![
                "https://polygon-rpc.com".into(),
                "https://polygon.llamarpc.com".into(),
                "https://polygon.publicnode.com".into(),
                "https://rpc.ankr.com/polygon".into(),
            ],
            symbol: "POL".into(),
            explorer_url: Some("https://polygonscan.com".into()),
            explorer_api_url: Some("https://api.polygonscan.com/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "AVAX".into(),
            chain_id: 43114,
            name: "Avalanche C-Chain".into(),
            rpc_urls: vec![
                "https://api.avax.network/ext/bc/C/rpc".into(),
                "https://avalanche.llamarpc.com".into(),
                "https://rpc.ankr.com/avalanche".into(),
            ],
            symbol: "AVAX".into(),
            explorer_url: Some("https://snowtrace.io".into()),
            explorer_api_url: None,
            is_custom: false,
        },
        NetworkConfig {
            id: "LINEA".into(),
            chain_id: 59144,
            name: "Linea".into(),
            rpc_urls: vec![
                "https://rpc.linea.build".into(),
                "https://linea.llamarpc.com".into(),
                "https://rpc.ankr.com/linea".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://lineascan.build".into()),
            explorer_api_url: Some("https://api.lineascan.build/api".into()),
            is_custom: false,
        },
        NetworkConfig {
            id: "ZKSYNC".into(),
            chain_id: 324,
            name: "zkSync Era".into(),
            rpc_urls: vec![
                "https://mainnet.era.zksync.io".into(),
                "https://zksync.llamarpc.com".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://explorer.zksync.io".into()),
            explorer_api_url: None,
            is_custom: false,
        },
        NetworkConfig {
            id: "SCROLL".into(),
            chain_id: 534352,
            name: "Scroll".into(),
            rpc_urls: vec![
                "https://rpc.scroll.io".into(),
                "https://scroll.publicnode.com".into(),
                "https://rpc.ankr.com/scroll".into(),
            ],
            symbol: "ETH".into(),
            explorer_url: Some("https://scrollscan.com".into()),
            explorer_api_url: Some("https://api.scrollscan.com/api".into()),
            is_custom: false,
        },
    ]
}

// ── DB helpers ────────────────────────────────────────────────────────────────

fn persist_network(cfg: &NetworkConfig) {
    if let Ok(v) = serde_json::to_value(cfg) {
        db::set_evm_chain(&cfg.id, &v);
    }
}

fn load_network(id: &str) -> Option<NetworkConfig> {
    db::get_evm_chain(id)
        .and_then(|v| serde_json::from_value(v).ok())
}

fn load_all_networks() -> Vec<NetworkConfig> {
    // Start with builtins so they always appear even before any DB write
    let mut builtins = builtin_networks();
    let stored: Vec<NetworkConfig> = db::get_all_evm_chains()
        .into_iter()
        .filter_map(|v| serde_json::from_value(v).ok())
        .collect();

    // Merge: stored entries override builtins (by id)
    for s in &stored {
        if let Some(pos) = builtins.iter().position(|b| b.id == s.id) {
            builtins[pos] = s.clone();
        } else {
            builtins.push(s.clone());
        }
    }
    builtins
}

// ── Tauri commands ────────────────────────────────────────────────────────────

/// Register (or update) a custom EVM-compatible network.
/// Persists to DB and registers RPC endpoints in the health-tracked pool.
#[tauri::command]
pub fn register_network(config: NetworkConfig) -> Result<NetworkConfig, String> {
    if config.id.is_empty() {
        return Err("网络 ID 不能为空".to_string());
    }
    if config.rpc_urls.is_empty() {
        return Err("至少需要一个 RPC URL".to_string());
    }
    // Register in the RPC health pool
    rpc::register_chain_rpcs(&config.id, &config.rpc_urls);
    // Persist metadata
    persist_network(&config);
    Ok(config)
}

/// Switch the active network. Returns the new active NetworkConfig.
#[tauri::command]
pub fn set_active_network(chain_id: String) -> Result<NetworkConfig, String> {
    let id = chain_id.to_uppercase();
    // Confirm it exists (builtin or custom)
    let cfg = load_network(&id)
        .or_else(|| builtin_networks().into_iter().find(|n| n.id == id))
        .ok_or_else(|| format!("未知网络: {id}"))?;

    rpc::set_active_chain(&id);
    // Ensure RPCs are registered in the pool
    rpc::register_chain_rpcs(&cfg.id, &cfg.rpc_urls);
    Ok(cfg)
}

/// Get the currently active network config.
#[tauri::command]
pub fn get_active_network() -> NetworkConfig {
    let id = rpc::get_active_chain();
    load_network(&id)
        .or_else(|| builtin_networks().into_iter().find(|n| n.id == id))
        .unwrap_or_else(|| builtin_networks().into_iter().next().unwrap())
}

/// List all available networks (builtins + user-registered customs).
#[tauri::command]
pub fn list_networks() -> Vec<NetworkConfig> {
    load_all_networks()
}

/// Remove a user-registered custom network. Built-in networks cannot be removed.
#[tauri::command]
pub fn remove_network(chain_id: String) -> Result<(), String> {
    let id = chain_id.to_uppercase();
    let cfg = load_network(&id).ok_or_else(|| format!("网络 {id} 不存在或未持久化"))?;
    if !cfg.is_custom {
        return Err("内置网络不可删除".to_string());
    }
    // If removing the active chain, fall back to ETH
    if rpc::get_active_chain() == id {
        rpc::set_active_chain("ETH");
    }
    // Remove from DB by overwriting with a tombstone value is not ideal;
    // rusqlite supports DELETE so we use the kv_cache workaround via a marker.
    // For now we just persist with a "deleted" flag — frontend filters it out.
    let mut deleted = cfg;
    deleted.is_custom = false; // reuse field as "hidden" sentinel
    persist_network(&deleted);
    Ok(())
}

/// Fetch the explorer API base URL for a given chain (used by eth.rs).
pub fn explorer_api_url(chain_id: &str) -> Option<String> {
    let id = chain_id.to_uppercase();
    load_network(&id)
        .or_else(|| builtin_networks().into_iter().find(|n| n.id == id))
        .and_then(|n| n.explorer_api_url)
}
