import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NetworkConfig } from "../types";

// ── Built-in presets (mirrors Rust network.rs) ────────────────────────────────

export const BUILTIN_NETWORKS: NetworkConfig[] = [
  {
    id: "ETH",
    chainId: 1,
    name: "Ethereum",
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    symbol: "ETH",
    explorerUrl: "https://etherscan.io",
    explorerApiUrl: "https://api.etherscan.io/api",
    isCustom: false,
  },
  {
    id: "BASE",
    chainId: 8453,
    name: "Base",
    rpcUrls: ["https://mainnet.base.org", "https://base.llamarpc.com", "https://rpc.ankr.com/base"],
    symbol: "ETH",
    explorerUrl: "https://basescan.org",
    explorerApiUrl: "https://api.basescan.org/api",
    isCustom: false,
  },
  {
    id: "ARB",
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrls: ["https://arb1.arbitrum.io/rpc", "https://arbitrum.llamarpc.com", "https://rpc.ankr.com/arbitrum"],
    symbol: "ETH",
    explorerUrl: "https://arbiscan.io",
    explorerApiUrl: "https://api.arbiscan.io/api",
    isCustom: false,
  },
  {
    id: "OP",
    chainId: 10,
    name: "Optimism",
    rpcUrls: ["https://mainnet.optimism.io", "https://optimism.llamarpc.com", "https://rpc.ankr.com/optimism"],
    symbol: "ETH",
    explorerUrl: "https://optimistic.etherscan.io",
    explorerApiUrl: "https://api-optimistic.etherscan.io/api",
    isCustom: false,
  },
  {
    id: "BSC",
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrls: ["https://bsc-dataseed1.binance.org", "https://bsc.llamarpc.com", "https://rpc.ankr.com/bsc"],
    symbol: "BNB",
    explorerUrl: "https://bscscan.com",
    explorerApiUrl: "https://api.bscscan.com/api",
    isCustom: false,
  },
  {
    id: "POLYGON",
    chainId: 137,
    name: "Polygon",
    rpcUrls: ["https://polygon-rpc.com", "https://polygon.llamarpc.com", "https://rpc.ankr.com/polygon"],
    symbol: "POL",
    explorerUrl: "https://polygonscan.com",
    explorerApiUrl: "https://api.polygonscan.com/api",
    isCustom: false,
  },
  {
    id: "AVAX",
    chainId: 43114,
    name: "Avalanche C-Chain",
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc", "https://rpc.ankr.com/avalanche"],
    symbol: "AVAX",
    explorerUrl: "https://snowtrace.io",
    isCustom: false,
  },
  {
    id: "LINEA",
    chainId: 59144,
    name: "Linea",
    rpcUrls: ["https://rpc.linea.build", "https://linea.llamarpc.com", "https://rpc.ankr.com/linea"],
    symbol: "ETH",
    explorerUrl: "https://lineascan.build",
    explorerApiUrl: "https://api.lineascan.build/api",
    isCustom: false,
  },
  {
    id: "ZKSYNC",
    chainId: 324,
    name: "zkSync Era",
    rpcUrls: ["https://mainnet.era.zksync.io", "https://zksync.llamarpc.com"],
    symbol: "ETH",
    explorerUrl: "https://explorer.zksync.io",
    isCustom: false,
  },
  {
    id: "SCROLL",
    chainId: 534352,
    name: "Scroll",
    rpcUrls: ["https://rpc.scroll.io", "https://rpc.ankr.com/scroll"],
    symbol: "ETH",
    explorerUrl: "https://scrollscan.com",
    explorerApiUrl: "https://api.scrollscan.com/api",
    isCustom: false,
  },
];

// ── Store ─────────────────────────────────────────────────────────────────────

interface NetworkState {
  /** All networks: builtins merged with user-registered custom chains. */
  networks: NetworkConfig[];
  /** Currently active network ID, e.g. "ETH", "BASE". */
  activeNetworkId: string;

  /** Derived: returns the active NetworkConfig object. */
  activeNetwork: () => NetworkConfig;

  /** Switch active network (also calls Rust backend). */
  setActiveNetworkId: (id: string) => void;

  /** Add or update a custom network (persisted locally). */
  upsertNetwork: (cfg: NetworkConfig) => void;

  /** Remove a user-defined custom network. */
  removeNetwork: (id: string) => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set, get) => ({
      networks: BUILTIN_NETWORKS,
      activeNetworkId: "ETH",

      activeNetwork: () => {
        const { networks, activeNetworkId } = get();
        return networks.find((n) => n.id === activeNetworkId) ?? BUILTIN_NETWORKS[0];
      },

      setActiveNetworkId: (id: string) => {
        set({ activeNetworkId: id.toUpperCase() });
      },

      upsertNetwork: (cfg: NetworkConfig) => {
        set((s) => {
          const existing = s.networks.findIndex((n) => n.id === cfg.id);
          if (existing >= 0) {
            const updated = [...s.networks];
            updated[existing] = cfg;
            return { networks: updated };
          }
          return { networks: [...s.networks, cfg] };
        });
      },

      removeNetwork: (id: string) => {
        set((s) => ({
          networks: s.networks.filter((n) => n.id !== id),
          // Fall back to ETH if removing the active network
          activeNetworkId: s.activeNetworkId === id ? "ETH" : s.activeNetworkId,
        }));
      },
    }),
    {
      name: "zoo-network-store",
      // Only persist custom networks + active selection; builtins are always re-merged
      partialize: (s) => ({
        activeNetworkId: s.activeNetworkId,
        networks: s.networks.filter((n) => n.isCustom),
      }),
      // On rehydrate: merge stored custom networks back on top of builtins
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<NetworkState> | null;
        const customNets: NetworkConfig[] = (p as any)?.networks ?? [];
        const merged = [...BUILTIN_NETWORKS];
        for (const c of customNets) {
          const idx = merged.findIndex((n) => n.id === c.id);
          if (idx >= 0) merged[idx] = c;
          else merged.push(c);
        }
        return {
          ...current,
          networks: merged,
          activeNetworkId: (p as any)?.activeNetworkId ?? "ETH",
        };
      },
    },
  ),
);
