import { create } from "zustand";

export interface PriceData {
  usd: number;
  cny: number;
  change24h: number;
}

interface PriceState {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  lastUpdated: number | null;

  setPrices: (prices: Record<string, PriceData>) => void;
  setIsLoading: (v: boolean) => void;
}

export const usePriceStore = create<PriceState>((set) => ({
  prices: {},
  isLoading: false,
  lastUpdated: null,

  setPrices: (prices) => set({ prices, lastUpdated: Date.now() }),
  setIsLoading: (isLoading) => set({ isLoading }),
}));
