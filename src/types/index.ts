export interface AccountAddresses {
  ETH?: string;
  BTC?: string;
  SOL?: string;
}

export interface AccountMeta {
  id: string;
  name: string;
  type: "hd" | "imported" | "watch";
  chain?: string;
  addresses: AccountAddresses;
  index?: number;
}

// ── Network / Chain config ────────────────────────────────────────────────────

/** Full EVM-compatible network configuration (L1 / L2 / custom). */
export interface NetworkConfig {
  /** Short identifier used as the chain key, e.g. "ETH", "BASE", "ARB". */
  id: string;
  /** EIP-155 chain ID, e.g. 1, 8453, 42161. */
  chainId: number;
  /** Human-readable display name. */
  name: string;
  /** JSON-RPC endpoint URLs (first = preferred). */
  rpcUrls: string[];
  /** Native currency symbol, e.g. "ETH", "BNB", "MATIC". */
  symbol: string;
  /** Block-explorer base URL for tx/address links. */
  explorerUrl?: string;
  /** Explorer API base URL (for history / token lookups). */
  explorerApiUrl?: string;
  /** True when user-defined (not a built-in preset). */
  isCustom?: boolean;
}

export interface HashOut {
  hash: string;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  contractAddress: string;
}

export interface GasOption {
  gwei: string;
  maxFeeGwei?: string;
  priorityFeeGwei?: string;
  estimatedTime: string;
  isEip1559: boolean;
}

export interface GasOptions {
  slow: GasOption;
  medium: GasOption;
  fast: GasOption;
  baseFeeGwei?: string;
  isEip1559: boolean;
}

export interface CalldataParam {
  name: string;
  value: string;
}

export interface CalldataDecoded {
  name: string;
  params: CalldataParam[];
}

export interface EthTxPreview {
  isContract: boolean;
  decoded?: CalldataDecoded;
  gasEstimate: string;
  maxFeeGwei: string;
}

export interface TxRecord {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
  isError: boolean;
  method?: string;
  confirmations?: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
}

export type Page =
  | "welcome"
  | "create"
  | "import"
  | "unlock"
  | "dashboard"
  | "send"
  | "send-success"
  | "history"
  | "security"
  | "receive"
  | "settings";

export interface PriceData {
  usd: number;
  cny: number;
  change24h: number;
}

export interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
