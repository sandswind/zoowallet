pub mod commands;
pub mod models;
pub mod services;

use commands::{eth, wallet};
use services::storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Initialize wallet store path using app data directory
            storage::init_store_path(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // wallet commands
            wallet::generate_mnemonic,
            wallet::create_from_mnemonic,
            wallet::verify_password,
            wallet::has_wallet,
            wallet::get_accounts,
            // eth commands
            eth::eth_get_balance,
            eth::eth_send_transaction,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
