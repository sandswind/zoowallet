import { create } from "zustand";
import type { Notification, Page } from "../types";

interface UiState {
  currentPage: Page;
  notifications: Notification[];
  lastSentHash: string | null;
  /** Auto-lock timeout in minutes. 0 = never. */
  autoLockMinutes: number;
  lastActivity: number;

  navigate: (page: Page) => void;
  showNotification: (type: Notification["type"], message: string) => void;
  dismissNotification: (id: string) => void;
  setLastSentHash: (hash: string | null) => void;
  setAutoLockMinutes: (minutes: number) => void;
  updateActivity: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentPage: "welcome",
  notifications: [],
  lastSentHash: null,
  autoLockMinutes: 5,
  lastActivity: Date.now(),

  navigate: (currentPage) => set({ currentPage }),

  showNotification: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({
      notifications: [...s.notifications, { id, type, message }],
    }));
    setTimeout(
      () => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
      4000,
    );
  },

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  setLastSentHash: (lastSentHash) => set({ lastSentHash }),
  setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
  updateActivity: () => set({ lastActivity: Date.now() }),
}));
