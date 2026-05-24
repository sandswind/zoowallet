import { create } from "zustand";
import type { AccountMeta, TokenBalance, NetworkConfig } from "../types";
import { BUILTIN_NETWORKS } from "./networkStore";

interface WalletState {
  accounts: AccountMeta[];
  currentAccount: AccountMeta | null;
  balance: string | null;
  prevBalance: string | null;
  tokenBalances: TokenBalance[];
  isUnlocked: boolean;
  isLoadingBalance: boolean;
  isLoadingTokens: boolean;
  isBalanceHidden: boolean;

  setAccounts: (accounts: AccountMeta[]) => void;
  setCurrentAccount: (account: AccountMeta | null) => void;
  setBalance: (balance: string | null) => void;
  setTokenBalances: (tokens: TokenBalance[]) => void;
  setIsUnlocked: (v: boolean) => void;
  setIsLoadingBalance: (v: boolean) => void;
  setIsLoadingTokens: (v: boolean) => void;
  setIsBalanceHidden: (v: boolean) => void;
  addAccount: (account: AccountMeta) => void;
  lock: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  accounts: [],
  currentAccount: null,
  balance: null,
  prevBalance: null,
  tokenBalances: [],
  isUnlocked: false,
  isLoadingBalance: false,
  isLoadingTokens: false,
  isBalanceHidden: false,

  setAccounts: (accounts) =>
    set({ accounts, currentAccount: accounts[0] ?? null }),
  setCurrentAccount: (currentAccount) =>
    set({ currentAccount, balance: null, tokenBalances: [] }),
  setBalance: (balance) =>
    set((s) => ({ prevBalance: s.balance, balance })),
  setTokenBalances: (tokenBalances) => set({ tokenBalances }),
  setIsUnlocked: (isUnlocked) => set({ isUnlocked }),
  setIsLoadingBalance: (isLoadingBalance) => set({ isLoadingBalance }),
  setIsLoadingTokens: (isLoadingTokens) => set({ isLoadingTokens }),
  setIsBalanceHidden: (isBalanceHidden) => set({ isBalanceHidden }),
  addAccount: (account) =>
    set((s) => ({ accounts: [...s.accounts, account] })),
  /** Lock: clear sensitive in-memory state */
  lock: () =>
    set({
      isUnlocked: false,
      balance: null,
      prevBalance: null,
      tokenBalances: [],
    }),
  reset: () =>
    set({
      accounts: [],
      currentAccount: null,
      balance: null,
      prevBalance: null,
      tokenBalances: [],
      isUnlocked: false,
    }),
}));
