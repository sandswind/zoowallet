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
