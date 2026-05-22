import { create } from "zustand";
import type { AccountMeta, TokenBalance } from "../types";

interface WalletState {
  accounts: AccountMeta[];
  currentAccount: AccountMeta | null;
  balance: string | null;
  tokenBalances: TokenBalance[];
  isUnlocked: boolean;
  isLoadingBalance: boolean;
  isLoadingTokens: boolean;

  setAccounts: (accounts: AccountMeta[]) => void;
  setCurrentAccount: (account: AccountMeta | null) => void;
  setBalance: (balance: string | null) => void;
  setTokenBalances: (tokens: TokenBalance[]) => void;
  setIsUnlocked: (v: boolean) => void;
  setIsLoadingBalance: (v: boolean) => void;
  setIsLoadingTokens: (v: boolean) => void;
  addAccount: (account: AccountMeta) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  accounts: [],
  currentAccount: null,
  balance: null,
  tokenBalances: [],
  isUnlocked: false,
  isLoadingBalance: false,
  isLoadingTokens: false,

  setAccounts: (accounts) =>
    set({ accounts, currentAccount: accounts[0] ?? null }),
  setCurrentAccount: (currentAccount) => set({ currentAccount }),
  setBalance: (balance) => set({ balance }),
  setTokenBalances: (tokenBalances) => set({ tokenBalances }),
  setIsUnlocked: (isUnlocked) => set({ isUnlocked }),
  setIsLoadingBalance: (isLoadingBalance) => set({ isLoadingBalance }),
  setIsLoadingTokens: (isLoadingTokens) => set({ isLoadingTokens }),
  addAccount: (account) =>
    set((s) => ({ accounts: [...s.accounts, account] })),
  reset: () =>
    set({ accounts: [], currentAccount: null, balance: null, tokenBalances: [], isUnlocked: false }),
}));
