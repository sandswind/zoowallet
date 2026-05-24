pub mod commands;
pub mod models;
pub mod services;

use commands::{eth, network, wallet};
use services::{db, storage};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            storage::init_store_path(app.handle());
            db::init_db(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Phase 1 — wallet
            wallet::generate_mnemonic,
            wallet::create_from_mnemonic,
            wallet::verify_password,
            wallet::has_wallet,
            wallet::get_accounts,
            // Phase 2 — wallet management
            wallet::derive_next_account,
            wallet::import_private_key,
            wallet::import_watch_wallet,
            wallet::export_mnemonic,
            wallet::get_private_key,
            wallet::change_password,
            // Phase 1 — eth
            eth::eth_get_balance,
            eth::eth_send_transaction,
            // Phase 3 — eth complete
            eth::eth_get_gas_options,
            eth::eth_get_token_balances,
            eth::eth_send_token,
            eth::eth_decode_calldata,
            eth::eth_preview_transaction,
            eth::eth_query_token_info,
            eth::eth_get_custom_token_balance,
            eth::eth_get_history,
            eth::eth_estimate_gas,
            eth::eth_speed_up_transaction,
            eth::eth_cancel_transaction,
            // Network management — dynamic EVM L2 registration
            network::register_network,
            network::set_active_network,
            network::get_active_network,
            network::list_networks,
            network::remove_network,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
