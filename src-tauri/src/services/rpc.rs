use reqwest::Client;
use std::sync::LazyLock;
use std::time::Duration;

/// Single shared HTTP client — reuses TCP connections across all RPC calls.
/// Phase 7 will replace the constant RPC URL with a failover pool.
pub static HTTP: LazyLock<Client> = LazyLock::new(|| {
    Client::builder()
        .pool_max_idle_per_host(5)
        .connect_timeout(Duration::from_secs(10))
        .timeout(Duration::from_secs(30))
        .use_rustls_tls()
        .build()
        .expect("Failed to build reqwest client")
});

/// ETH mainnet RPC endpoint (Phase 7: replace with get_best_rpc())
pub const ETH_RPC: &str = "https://eth.llamarpc.com";
