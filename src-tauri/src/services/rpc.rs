use reqwest::Client;
use std::{
    collections::HashMap,
    sync::{LazyLock, RwLock},
    time::{Duration, Instant},
};

// ── Active chain (default: ETH) ───────────────────────────────────────────────

static ACTIVE_CHAIN: LazyLock<RwLock<String>> =
    LazyLock::new(|| RwLock::new("ETH".to_string()));

pub fn get_active_chain() -> String {
    ACTIVE_CHAIN
        .read()
        .unwrap_or_else(|p| p.into_inner())
        .clone()
}

pub fn set_active_chain(chain_id: &str) {
    let mut guard = ACTIVE_CHAIN.write().unwrap_or_else(|p| p.into_inner());
    *guard = chain_id.to_uppercase();
}

// ── Global HTTP client ────────────────────────────────────────────────────────

pub static HTTP: LazyLock<Client> = LazyLock::new(|| {
    Client::builder()
        .pool_max_idle_per_host(5)
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .use_rustls_tls()
        .build()
        .expect("Failed to build reqwest client")
});

// ── Endpoint health tracking ──────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct Endpoint {
    url: String,
    /// Exponential moving average latency in ms
    latency_ms: f64,
    fail_count: u32,
    healthy: bool,
}

impl Endpoint {
    fn new(url: &str) -> Self {
        Self { url: url.to_string(), latency_ms: 100.0, fail_count: 0, healthy: true }
    }

    /// Lower score = preferred
    fn score(&self) -> f64 {
        self.latency_ms + self.fail_count as f64 * 1000.0
    }
}

static ENDPOINTS: LazyLock<RwLock<HashMap<String, Vec<Endpoint>>>> =
    LazyLock::new(|| RwLock::new(build_default_endpoints()));

fn build_default_endpoints() -> HashMap<String, Vec<Endpoint>> {
    let mut map = HashMap::new();

    // ── L1 ────────────────────────────────────────────────────────────────────
    map.insert("ETH".to_string(), vec![
        Endpoint::new("https://eth.llamarpc.com"),
        Endpoint::new("https://rpc.ankr.com/eth"),
        Endpoint::new("https://ethereum.publicnode.com"),
        Endpoint::new("https://1rpc.io/eth"),
        Endpoint::new("https://cloudflare-eth.com"),
    ]);

    // ── EVM L2 / Alt-L1 ──────────────────────────────────────────────────────
    map.insert("BASE".to_string(), vec![
        Endpoint::new("https://mainnet.base.org"),
        Endpoint::new("https://base.llamarpc.com"),
        Endpoint::new("https://base.publicnode.com"),
        Endpoint::new("https://1rpc.io/base"),
        Endpoint::new("https://rpc.ankr.com/base"),
    ]);

    map.insert("ARB".to_string(), vec![
        Endpoint::new("https://arb1.arbitrum.io/rpc"),
        Endpoint::new("https://arbitrum.llamarpc.com"),
        Endpoint::new("https://arbitrum-one.publicnode.com"),
        Endpoint::new("https://1rpc.io/arb"),
        Endpoint::new("https://rpc.ankr.com/arbitrum"),
    ]);

    map.insert("OP".to_string(), vec![
        Endpoint::new("https://mainnet.optimism.io"),
        Endpoint::new("https://optimism.llamarpc.com"),
        Endpoint::new("https://optimism.publicnode.com"),
        Endpoint::new("https://1rpc.io/op"),
        Endpoint::new("https://rpc.ankr.com/optimism"),
    ]);

    map.insert("BSC".to_string(), vec![
        Endpoint::new("https://bsc-dataseed1.binance.org"),
        Endpoint::new("https://bsc-dataseed2.binance.org"),
        Endpoint::new("https://bsc.llamarpc.com"),
        Endpoint::new("https://bsc.publicnode.com"),
        Endpoint::new("https://rpc.ankr.com/bsc"),
    ]);

    map.insert("POLYGON".to_string(), vec![
        Endpoint::new("https://polygon-rpc.com"),
        Endpoint::new("https://polygon.llamarpc.com"),
        Endpoint::new("https://polygon.publicnode.com"),
        Endpoint::new("https://1rpc.io/matic"),
        Endpoint::new("https://rpc.ankr.com/polygon"),
    ]);

    map.insert("AVAX".to_string(), vec![
        Endpoint::new("https://api.avax.network/ext/bc/C/rpc"),
        Endpoint::new("https://avalanche.llamarpc.com"),
        Endpoint::new("https://avalanche-c-chain.publicnode.com"),
        Endpoint::new("https://rpc.ankr.com/avalanche"),
    ]);

    map.insert("LINEA".to_string(), vec![
        Endpoint::new("https://rpc.linea.build"),
        Endpoint::new("https://linea.llamarpc.com"),
        Endpoint::new("https://linea.publicnode.com"),
        Endpoint::new("https://rpc.ankr.com/linea"),
    ]);

    map.insert("ZKSYNC".to_string(), vec![
        Endpoint::new("https://mainnet.era.zksync.io"),
        Endpoint::new("https://zksync.llamarpc.com"),
        Endpoint::new("https://zksync.publicnode.com"),
    ]);

    map.insert("SCROLL".to_string(), vec![
        Endpoint::new("https://rpc.scroll.io"),
        Endpoint::new("https://scroll.publicnode.com"),
        Endpoint::new("https://rpc.ankr.com/scroll"),
    ]);

    // ── Non-EVM ───────────────────────────────────────────────────────────────
    map.insert("SOL".to_string(), vec![
        Endpoint::new("https://api.mainnet-beta.solana.com"),
        Endpoint::new("https://solana.publicnode.com"),
    ]);

    map.insert("BTC".to_string(), vec![
        Endpoint::new("https://mempool.space/api"),
        Endpoint::new("https://blockstream.info/api"),
    ]);

    map
}

/// Returns all registered chain IDs.
pub fn list_chains() -> Vec<String> {
    let map = ENDPOINTS.read().unwrap_or_else(|p| p.into_inner());
    let mut chains: Vec<String> = map.keys().cloned().collect();
    chains.sort();
    chains
}

// ── Public API ────────────────────────────────────────────────────────────────

/// Returns the best (lowest score) healthy RPC URL for a chain.
/// If all are unhealthy, resets them all and returns the first.
pub fn get_best_rpc(chain: &str) -> Option<String> {
    let mut map = ENDPOINTS.write().unwrap_or_else(|p| p.into_inner());
    let endpoints = map.get_mut(chain)?;

    // Find best healthy endpoint
    let best = endpoints
        .iter()
        .filter(|e| e.healthy)
        .min_by(|a, b| a.score().partial_cmp(&b.score()).unwrap());

    if let Some(e) = best {
        return Some(e.url.clone());
    }

    // All unhealthy — reset and retry
    for e in endpoints.iter_mut() {
        e.healthy = true;
        e.fail_count = 0;
    }
    endpoints.first().map(|e| e.url.clone())
}

/// Record a successful request, updating the EMA latency.
pub fn mark_success(chain: &str, url: &str, elapsed: Duration) {
    let mut map = ENDPOINTS.write().unwrap_or_else(|p| p.into_inner());
    if let Some(endpoints) = map.get_mut(chain) {
        if let Some(ep) = endpoints.iter_mut().find(|e| e.url == url) {
            let ms = elapsed.as_secs_f64() * 1000.0;
            // EMA with alpha=0.3
            ep.latency_ms = ep.latency_ms * 0.7 + ms * 0.3;
            ep.fail_count = ep.fail_count.saturating_sub(1);
            ep.healthy = true;
        }
    }
}

/// Record a failed request. After 3 failures the endpoint is marked unhealthy.
pub fn mark_failure(chain: &str, url: &str) {
    let mut map = ENDPOINTS.write().unwrap_or_else(|p| p.into_inner());
    if let Some(endpoints) = map.get_mut(chain) {
        if let Some(ep) = endpoints.iter_mut().find(|e| e.url == url) {
            ep.fail_count += 1;
            if ep.fail_count >= 3 {
                ep.healthy = false;
                log::warn!("[rpc] endpoint marked unhealthy: {} ({})", url, chain);
            }
        }
    }
}

/// Register a custom chain's RPC endpoints (for EVM L2).
pub fn register_chain_rpcs(chain_id: &str, urls: &[String]) {
    let mut map = ENDPOINTS.write().unwrap_or_else(|p| p.into_inner());
    let endpoints: Vec<Endpoint> = urls.iter().map(|u| Endpoint::new(u)).collect();
    map.insert(chain_id.to_string(), endpoints);
}

/// Convenience: make a timed HTTP POST and auto-update endpoint health.
/// Returns the response JSON on success.
pub async fn rpc_post(chain: &str, body: &serde_json::Value) -> Result<serde_json::Value, String> {
    let url = get_best_rpc(chain).ok_or_else(|| format!("{chain} 无可用 RPC 节点"))?;
    let start = Instant::now();

    match HTTP.post(&url).json(body).send().await {
        Ok(resp) => {
            let elapsed = start.elapsed();
            match resp.json::<serde_json::Value>().await {
                Ok(json) => {
                    mark_success(chain, &url, elapsed);
                    Ok(json)
                }
                Err(e) => {
                    mark_failure(chain, &url);
                    Err(format!("RPC 响应解析失败: {e}"))
                }
            }
        }
        Err(e) => {
            mark_failure(chain, &url);
            Err(format!("RPC 请求失败: {e}"))
        }
    }
}

// ── Phase 1 compatibility alias ───────────────────────────────────────────────
// eth.rs and wallet.rs reference ETH_RPC as a constant; Phase 7 replaces it
// with a function call but we keep the alias so Phase 1 code still compiles.

/// Returns the current best ETH RPC URL (replaces the old constant).
#[inline]
pub fn eth_rpc() -> String {
    get_best_rpc("ETH").unwrap_or_else(|| "https://eth.llamarpc.com".to_string())
}

/// Legacy constant kept for compatibility — callers should migrate to eth_rpc().
pub const ETH_RPC: &str = "https://eth.llamarpc.com";
