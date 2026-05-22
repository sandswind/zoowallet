import { create } from "zustand";
import type { AccountMeta } from "../types";

interface WalletState {
  accounts: AccountMeta[];
  currentAccount: AccountMeta | null;
  balance: string | null;
  isUnlocked: boolean;
  isLoadingBalance: boolean;

  setAccounts: (accounts: AccountMeta[]) => void;
  setCurrentAccount: (account: AccountMeta | null) => void;
  setBalance: (balance: string | null) => void;
  setIsUnlocked: (v: boolean) => void;
  setIsLoadingBalance: (v: boolean) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  accounts: [],
  currentAccount: null,
  balance: null,
  isUnlocked: false,
  isLoadingBalance: false,

  setAccounts: (accounts) =>
    set({ accounts, currentAccount: accounts[0] ?? null }),
  setCurrentAccount: (currentAccount) => set({ currentAccount }),
  setBalance: (balance) => set({ balance }),
  setIsUnlocked: (isUnlocked) => set({ isUnlocked }),
  setIsLoadingBalance: (isLoadingBalance) => set({ isLoadingBalance }),
  reset: () =>
    set({
      accounts: [],
      currentAccount: null,
      balance: null,
      isUnlocked: false,
    }),
}));
