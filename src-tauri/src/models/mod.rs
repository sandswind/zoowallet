use serde::{Deserialize, Serialize};

/// Encrypted data blob stored in wallet-store.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedBlob {
    /// 12-byte nonce, base64
    pub iv: String,
    /// AES-256-GCM ciphertext, base64
    pub ciphertext: String,
    /// 16-byte authentication tag, base64
    pub tag: String,
    /// 32-byte PBKDF2 salt, base64
    pub salt: String,
}

/// Multi-chain addresses for one account
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AccountAddresses {
    #[serde(rename = "ETH", skip_serializing_if = "Option::is_none")]
    pub eth: Option<String>,
    #[serde(rename = "BTC", skip_serializing_if = "Option::is_none")]
    pub btc: Option<String>,
    #[serde(rename = "SOL", skip_serializing_if = "Option::is_none")]
    pub sol: Option<String>,
}

/// Account metadata returned to the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountMeta {
    pub id: String,
    pub name: String,
    /// "hd" | "imported" | "watch"
    #[serde(rename = "type")]
    pub account_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chain: Option<String>,
    pub addresses: AccountAddresses,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub index: Option<u32>,
}

/// Hash result from a send transaction command
#[derive(Debug, Serialize, Deserialize)]
pub struct HashOut {
    pub hash: String,
}
