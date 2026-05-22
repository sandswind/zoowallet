import { create } from "zustand";
import type { Notification, Page } from "../types";

interface UiState {
  currentPage: Page;
  notifications: Notification[];
  lastSentHash: string | null;

  navigate: (page: Page) => void;
  showNotification: (
    type: Notification["type"],
    message: string,
  ) => void;
  dismissNotification: (id: string) => void;
  setLastSentHash: (hash: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currentPage: "welcome",
  notifications: [],
  lastSentHash: null,

  navigate: (currentPage) => set({ currentPage }),

  showNotification: (type, message) => {
    const id = crypto.randomUUID();
    set((s) => ({
      notifications: [...s.notifications, { id, type, message }],
    }));
    // Auto-dismiss after 4 s
    setTimeout(
      () =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
      4000,
    );
  },

  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    })),

  setLastSentHash: (lastSentHash) => set({ lastSentHash }),
}));
