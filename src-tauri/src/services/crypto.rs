use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use hmac::Hmac;
use pbkdf2::pbkdf2;
use rand::RngCore;
use sha2::Sha512;
use zeroize::Zeroize;

use crate::models::EncryptedBlob;

/// PBKDF2 iteration count — never lower this
const PBKDF2_ROUNDS: u32 = 310_000;

/// Derive a 32-byte AES key from password + salt using PBKDF2-HMAC-SHA512.
/// Caller is responsible for calling `.zeroize()` on the returned array.
pub fn derive_key(password: &[u8], salt: &[u8; 32]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::<Hmac<Sha512>>(password, salt, PBKDF2_ROUNDS, &mut key)
        .expect("PBKDF2 error — should never happen with valid params");
    key
}

/// Encrypt `plain` bytes with `password`.
/// Generates a fresh random salt (32B) and IV (12B) each call.
pub fn encrypt(plain: &[u8], password: &[u8]) -> Result<EncryptedBlob, String> {
    let mut salt = [0u8; 32];
    let mut iv = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut salt);
    rand::thread_rng().fill_bytes(&mut iv);

    let mut key_bytes = derive_key(password, &salt);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&iv);

    let ciphertext_with_tag = cipher
        .encrypt(nonce, Payload { msg: plain, aad: b"" })
        .map_err(|e| format!("加密失败: {e}"))?;

    key_bytes.zeroize();

    // aes-gcm appends the 16-byte tag after ciphertext
    let tag_start = ciphertext_with_tag.len().saturating_sub(16);
    let tag = ciphertext_with_tag[tag_start..].to_vec();
    let ciphertext = ciphertext_with_tag[..tag_start].to_vec();

    Ok(EncryptedBlob {
        iv: B64.encode(iv),
        ciphertext: B64.encode(&ciphertext),
        tag: B64.encode(&tag),
        salt: B64.encode(salt),
    })
}

/// Decrypt an `EncryptedBlob` using `password`.
/// Returns `Err("密码不正确")` on any authentication failure.
pub fn decrypt(blob: &EncryptedBlob, password: &[u8]) -> Result<Vec<u8>, String> {
    let iv_bytes = B64.decode(&blob.iv).map_err(|_| "密码不正确")?;
    let mut ciphertext = B64.decode(&blob.ciphertext).map_err(|_| "密码不正确")?;
    let tag_bytes = B64.decode(&blob.tag).map_err(|_| "密码不正确")?;
    let salt_bytes = B64.decode(&blob.salt).map_err(|_| "密码不正确")?;

    let salt: [u8; 32] = salt_bytes.try_into().map_err(|_| "密码不正确")?;
    let mut key_bytes = derive_key(password, &salt);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&iv_bytes);

    // Re-assemble ciphertext+tag for aes-gcm
    ciphertext.extend_from_slice(&tag_bytes);

    let plaintext = cipher
        .decrypt(nonce, Payload { msg: &ciphertext, aad: b"" })
        .map_err(|_| "密码不正确")?;

    key_bytes.zeroize();

    Ok(plaintext)
}
