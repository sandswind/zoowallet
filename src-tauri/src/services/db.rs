use rusqlite::{params, Connection, Result as SqlResult};
use serde_json::Value;
use std::{
    sync::{LazyLock, Mutex},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

// ── Global connection ─────────────────────────────────────────────────────────

static DB: LazyLock<Mutex<Option<Connection>>> = LazyLock::new(|| Mutex::new(None));

fn db() -> std::sync::MutexGuard<'static, Option<Connection>> {
    DB.lock().unwrap_or_else(|p| p.into_inner())
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs() as i64
}

// ── Init ──────────────────────────────────────────────────────────────────────

pub fn init_db(app: &tauri::AppHandle) {
    let path = app
        .path()
        .app_data_dir()
        .expect("app data dir")
        .join("cache.db");

    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    let conn = Connection::open(&path).expect("open cache.db");

    // WAL mode + NORMAL sync for performance
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         PRAGMA foreign_keys=ON;",
    )
    .ok();

    create_tables(&conn);
    *db() = Some(conn);

    // Background cleanup thread — runs every hour
    std::thread::spawn(cleanup_loop);
}

fn create_tables(conn: &Connection) {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS balances (
            chain TEXT NOT NULL,
            address TEXT NOT NULL,
            balance TEXT NOT NULL,
            extra_json TEXT,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (chain, address)
        );
        CREATE TABLE IF NOT EXISTS token_balances (
            chain TEXT NOT NULL,
            address TEXT NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (chain, address)
        );
        CREATE TABLE IF NOT EXISTS tx_history (
            chain TEXT NOT NULL,
            address TEXT NOT NULL,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (chain, address)
        );
        CREATE TABLE IF NOT EXISTS gas_cache (
            chain TEXT NOT NULL PRIMARY KEY,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS price_cache (
            symbol TEXT NOT NULL PRIMARY KEY,
            usd REAL NOT NULL,
            cny REAL NOT NULL,
            change_24h REAL NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS price_chart (
            symbol TEXT NOT NULL PRIMARY KEY,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS evm_chains (
            id TEXT NOT NULL PRIMARY KEY,
            data_json TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kv_cache (
            key TEXT NOT NULL PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );",
    )
    .ok();
}

fn cleanup_loop() {
    loop {
        std::thread::sleep(Duration::from_secs(3600));
        let cutoff = now_secs() - 7 * 24 * 3600;
        let guard = db();
        if let Some(conn) = guard.as_ref() {
            for table in &["balances", "token_balances", "tx_history", "gas_cache",
                           "price_cache", "price_chart", "kv_cache"] {
                conn.execute(
                    &format!("DELETE FROM {table} WHERE updated_at < ?1"),
                    params![cutoff],
                )
                .ok();
            }
        }
    }
}

// ── Helper ────────────────────────────────────────────────────────────────────

fn is_fresh(updated_at: i64, ttl_secs: i64) -> bool {
    now_secs() - updated_at < ttl_secs
}

// ── Balance cache (TTL 30s) ───────────────────────────────────────────────────

pub fn get_balance(chain: &str, address: &str, ttl: i64) -> Option<String> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(String, i64)> = conn.query_row(
        "SELECT balance, updated_at FROM balances WHERE chain=?1 AND address=?2",
        params![chain, address],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    res.ok().and_then(|(bal, ts)| is_fresh(ts, ttl).then_some(bal))
}

pub fn set_balance(chain: &str, address: &str, balance: &str, extra: Option<&str>) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        conn.execute(
            "INSERT OR REPLACE INTO balances (chain, address, balance, extra_json, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![chain, address, balance, extra, now_secs()],
        )
        .ok();
    }
}

// ── Token balances cache (TTL 60s) ────────────────────────────────────────────

pub fn get_token_balances(chain: &str, address: &str, ttl: i64) -> Option<Value> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(String, i64)> = conn.query_row(
        "SELECT data_json, updated_at FROM token_balances WHERE chain=?1 AND address=?2",
        params![chain, address],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    res.ok().and_then(|(json, ts)| {
        is_fresh(ts, ttl).then(|| serde_json::from_str(&json).ok()).flatten()
    })
}

pub fn set_token_balances(chain: &str, address: &str, data: &Value) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        let json = serde_json::to_string(data).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO token_balances (chain, address, data_json, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![chain, address, json, now_secs()],
        )
        .ok();
    }
}

// ── Transaction history cache (TTL 120s, page 1 only) ────────────────────────

pub fn get_tx_history(chain: &str, address: &str, ttl: i64) -> Option<Value> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(String, i64)> = conn.query_row(
        "SELECT data_json, updated_at FROM tx_history WHERE chain=?1 AND address=?2",
        params![chain, address],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    res.ok().and_then(|(json, ts)| {
        is_fresh(ts, ttl).then(|| serde_json::from_str(&json).ok()).flatten()
    })
}

pub fn set_tx_history(chain: &str, address: &str, data: &Value) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        let json = serde_json::to_string(data).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO tx_history (chain, address, data_json, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![chain, address, json, now_secs()],
        )
        .ok();
    }
}

// ── Gas cache (TTL 15s) ───────────────────────────────────────────────────────

pub fn get_gas(chain: &str, ttl: i64) -> Option<Value> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(String, i64)> = conn.query_row(
        "SELECT data_json, updated_at FROM gas_cache WHERE chain=?1",
        params![chain],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    res.ok().and_then(|(json, ts)| {
        is_fresh(ts, ttl).then(|| serde_json::from_str(&json).ok()).flatten()
    })
}

pub fn set_gas(chain: &str, data: &Value) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        let json = serde_json::to_string(data).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO gas_cache (chain, data_json, updated_at)
             VALUES (?1, ?2, ?3)",
            params![chain, json, now_secs()],
        )
        .ok();
    }
}

// ── Price cache (TTL 60s) ─────────────────────────────────────────────────────

pub fn get_price(symbol: &str, ttl: i64) -> Option<(f64, f64, f64)> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(f64, f64, f64, i64)> = conn.query_row(
        "SELECT usd, cny, change_24h, updated_at FROM price_cache WHERE symbol=?1",
        params![symbol],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    );
    res.ok().and_then(|(usd, cny, ch, ts)| is_fresh(ts, ttl).then_some((usd, cny, ch)))
}

pub fn set_price(symbol: &str, usd: f64, cny: f64, change_24h: f64) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        conn.execute(
            "INSERT OR REPLACE INTO price_cache (symbol, usd, cny, change_24h, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![symbol, usd, cny, change_24h, now_secs()],
        )
        .ok();
    }
}

// ── Price chart cache (TTL 300s) ──────────────────────────────────────────────

pub fn get_price_chart(symbol: &str, ttl: i64) -> Option<Value> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(String, i64)> = conn.query_row(
        "SELECT data_json, updated_at FROM price_chart WHERE symbol=?1",
        params![symbol],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    res.ok().and_then(|(json, ts)| {
        is_fresh(ts, ttl).then(|| serde_json::from_str(&json).ok()).flatten()
    })
}

pub fn set_price_chart(symbol: &str, data: &Value) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        let json = serde_json::to_string(data).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO price_chart (symbol, data_json, updated_at)
             VALUES (?1, ?2, ?3)",
            params![symbol, json, now_secs()],
        )
        .ok();
    }
}

// ── EVM chains (permanent) ────────────────────────────────────────────────────

pub fn get_evm_chain(id: &str) -> Option<Value> {
    let guard = db();
    let conn = guard.as_ref()?;
    conn.query_row(
        "SELECT data_json FROM evm_chains WHERE id=?1",
        params![id],
        |r| r.get::<_, String>(0),
    )
    .ok()
    .and_then(|j| serde_json::from_str(&j).ok())
}

pub fn get_all_evm_chains() -> Vec<Value> {
    let guard = db();
    let conn = match guard.as_ref() { Some(c) => c, None => return vec![] };
    let mut stmt = match conn.prepare("SELECT data_json FROM evm_chains") {
        Ok(s) => s, Err(_) => return vec![],
    };
    stmt.query_map([], |r| r.get::<_, String>(0))
        .ok()
        .map(|rows| {
            rows.filter_map(|r| r.ok())
                .filter_map(|j| serde_json::from_str(&j).ok())
                .collect()
        })
        .unwrap_or_default()
}

pub fn set_evm_chain(id: &str, data: &Value) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        let json = serde_json::to_string(data).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO evm_chains (id, data_json, updated_at)
             VALUES (?1, ?2, ?3)",
            params![id, json, now_secs()],
        )
        .ok();
    }
}

// ── KV cache (variable TTL) ───────────────────────────────────────────────────

pub fn kv_get(key: &str, ttl: i64) -> Option<Value> {
    let guard = db();
    let conn = guard.as_ref()?;
    let res: SqlResult<(String, i64)> = conn.query_row(
        "SELECT value, updated_at FROM kv_cache WHERE key=?1",
        params![key],
        |r| Ok((r.get(0)?, r.get(1)?)),
    );
    res.ok().and_then(|(json, ts)| {
        is_fresh(ts, ttl).then(|| serde_json::from_str(&json).ok()).flatten()
    })
}

pub fn kv_set(key: &str, value: &Value) {
    let guard = db();
    if let Some(conn) = guard.as_ref() {
        let json = serde_json::to_string(value).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO kv_cache (key, value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, json, now_secs()],
        )
        .ok();
    }
}

// ── TTL constants (seconds) ───────────────────────────────────────────────────
pub const TTL_BALANCE: i64 = 30;
pub const TTL_TOKENS: i64 = 60;
pub const TTL_HISTORY: i64 = 120;
pub const TTL_GAS: i64 = 15;
pub const TTL_PRICE: i64 = 60;
pub const TTL_CHART: i64 = 300;
pub const TTL_UTXO: i64 = 30;
pub const TTL_MINT_EXT: i64 = 300;
