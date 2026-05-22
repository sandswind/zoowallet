import React from "react";
import { useUiStore } from "../../store/uiStore";

const icons = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const styles = {
  success: "bg-midnight border border-neon/30 text-neon",
  error:   "bg-midnight border border-danger/40 text-danger",
  info:    "bg-midnight border border-ash/50 text-fog",
};

export const ToastContainer: React.FC = () => {
  const { notifications, dismissNotification } = useUiStore();
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-32px)]">
      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => dismissNotification(n.id)}
          className={[
            "flex items-center gap-3 px-4 py-3 rounded-full shadow-raised",
            "text-sm font-medium cursor-pointer",
            "animate-slide-down",
            styles[n.type],
          ].join(" ")}
        >
          <span className="shrink-0">{icons[n.type]}</span>
          <span className="flex-1 leading-snug">{n.message}</span>
        </div>
      ))}
    </div>
  );
};
