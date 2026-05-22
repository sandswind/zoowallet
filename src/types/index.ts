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

export type Page =
  | "welcome"
  | "create"
  | "unlock"
  | "dashboard"
  | "send"
  | "send-success";

export interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}
