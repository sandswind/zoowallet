import { invoke } from "@tauri-apps/api/core";
import type {
  AccountMeta, TokenBalance, GasOptions, EthTxPreview,
  TxRecord, TokenInfo, HashOut, NetworkConfig,
} from "../types";

// ─── Error ────────────────────────────────────────────────────────────────────

export class IpcError extends Error {
  constructor(public readonly command: string, message: string) {
    super(message);
    this.name = "IpcError";
  }
}

export async function safeInvoke<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (e) {
    const msg = typeof e === "string" ? e : "操作失败，请重试";
    throw new IpcError(command, msg);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceData {
  usd: number;
  cny: number;
  change24h: number;
}

export interface SendEthArgs extends Record<string, unknown> {
  account_id: string;
  password: string;
  to: string;
  amount: string;
  max_fee_gwei: string;
  priority_fee_gwei: string;
}

export interface SendTokenArgs extends Record<string, unknown> {
  account_id: string;
  password: string;
  contract_address: string;
  to: string;
  amount: string;
  decimals: number;
  max_fee_gwei: string;
  priority_fee_gwei: string;
}

// ─── zoo namespace ────────────────────────────────────────────────────────────

export const zoo = {
  // Phase 1 wallet
  generateMnemonic: () => safeInvoke<string[]>("generate_mnemonic"),
  hasWallet: () => safeInvoke<boolean>("has_wallet"),
  verifyPassword: (password: string) => safeInvoke<boolean>("verify_password", { password }),
  createWalletFromMnemonic: (args: { words: string[]; password: string; name: string }) =>
    safeInvoke<AccountMeta>("create_from_mnemonic", args),
  getAccounts: () => safeInvoke<AccountMeta[]>("get_accounts"),

  // Phase 2 wallet management
  deriveNextAccount: (args: { password: string; name: string }) =>
    safeInvoke<AccountMeta>("derive_next_account", args),
  importPrivateKey: (args: { chain: string; private_key: string; password: string; name: string }) =>
    safeInvoke<AccountMeta>("import_private_key", args),
  importWatchWallet: (args: { address: string; chain: string; name: string }) =>
    safeInvoke<AccountMeta>("import_watch_wallet", args),
  exportMnemonic: (password: string) =>
    safeInvoke<string[]>("export_mnemonic", { password }),
  getPrivateKey: (args: { account_id: string; chain: string; password: string }) =>
    safeInvoke<string>("get_private_key", args),
  changePassword: (args: { old_password: string; new_password: string }) =>
    safeInvoke<void>("change_password", args),

  // ETH
  eth: {
    getBalance: (address: string) => safeInvoke<string>("eth_get_balance", { address }),
    sendTransaction: (args: SendEthArgs) => safeInvoke<HashOut>("eth_send_transaction", args),
    // Phase 3
    getGasOptions: () => safeInvoke<GasOptions>("eth_get_gas_options"),
    getTokenBalances: (address: string) => safeInvoke<TokenBalance[]>("eth_get_token_balances", { address }),
    sendToken: (args: SendTokenArgs) => safeInvoke<HashOut>("eth_send_token", args),
    decodeCalldata: (data: string) => safeInvoke<import("../types").CalldataDecoded | null>("eth_decode_calldata", { data }),
    previewTransaction: (args: Record<string, unknown>) => safeInvoke<EthTxPreview>("eth_preview_transaction", args),
    queryTokenInfo: (contract_address: string) => safeInvoke<TokenInfo>("eth_query_token_info", { contract_address }),
    getCustomTokenBalance: (args: { address: string; contract_address: string; decimals: number }) =>
      safeInvoke<string>("eth_get_custom_token_balance", args),
    getHistory: (args: { address: string; page: number; offset: number }) =>
      safeInvoke<TxRecord[]>("eth_get_history", args),
    estimateGas: (args: { from: string; to: string; value: string; data: string }) =>
      safeInvoke<string>("eth_estimate_gas", args),
    speedUpTransaction: (args: { account_id: string; password: string; tx_hash: string }) =>
      safeInvoke<{ hash: string; oldHash: string }>("eth_speed_up_transaction", args),
    cancelTransaction: (args: { account_id: string; password: string; tx_hash: string }) =>
      safeInvoke<{ hash: string; oldHash: string }>("eth_cancel_transaction", args),
  },

  // Price (Phase 8 — Rust not yet implemented; these will error gracefully)
  price: {
    getMultiple: (symbols: string[]) =>
      safeInvoke<Record<string, PriceData>>("price_get_multiple", { symbols }),
    getChart: (symbol: string) =>
      safeInvoke<[number, number][]>("price_get_chart", { symbol }),
  },

  // Network management — dynamic EVM L2 registration
  network: {
    /** List all available networks (builtins + custom). */
    list: () => safeInvoke<NetworkConfig[]>("list_networks"),

    /** Get the currently active network. */
    getActive: () => safeInvoke<NetworkConfig>("get_active_network"),

    /** Switch the active network by ID (e.g. "BASE", "ARB"). */
    setActive: (chainId: string) =>
      safeInvoke<NetworkConfig>("set_active_network", { chain_id: chainId }),

    /** Register or update a custom EVM-compatible network. */
    register: (config: NetworkConfig) =>
      safeInvoke<NetworkConfig>("register_network", { config }),

    /** Remove a user-defined custom network (built-ins cannot be removed). */
    remove: (chainId: string) =>
      safeInvoke<void>("remove_network", { chain_id: chainId }),
  },
} as const;
