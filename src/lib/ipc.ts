import { invoke } from "@tauri-apps/api/core";
import type { AccountMeta } from "../types";

// ─── Error class ─────────────────────────────────────────────────────────────

export class IpcError extends Error {
  constructor(
    public readonly command: string,
    message: string,
  ) {
    super(message);
    this.name = "IpcError";
  }
}

// ─── Safe wrapper ─────────────────────────────────────────────────────────────

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

// ─── Send args types ──────────────────────────────────────────────────────────

export interface SendEthArgs extends Record<string, unknown> {
  account_id: string;
  password: string;
  to: string;
  amount: string;
  max_fee_gwei: string;
  priority_fee_gwei: string;
}

// ─── zoo namespace ────────────────────────────────────────────────────────────

export const zoo = {
  // wallet
  generateMnemonic: () =>
    safeInvoke<string[]>("generate_mnemonic"),

  hasWallet: () =>
    safeInvoke<boolean>("has_wallet"),

  verifyPassword: (password: string) =>
    safeInvoke<boolean>("verify_password", { password }),

  createWalletFromMnemonic: (args: {
    words: string[];
    password: string;
    name: string;
  }) => safeInvoke<AccountMeta>("create_from_mnemonic", args),

  getAccounts: () =>
    safeInvoke<AccountMeta[]>("get_accounts"),

  // eth
  eth: {
    getBalance: (address: string) =>
      safeInvoke<string>("eth_get_balance", { address }),

    sendTransaction: (args: SendEthArgs) =>
      safeInvoke<{ hash: string }>("eth_send_transaction", args),
  },
} as const;
