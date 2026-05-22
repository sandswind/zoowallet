import React from "react";
import { useUiStore } from "../../store/uiStore";

export const ToastContainer: React.FC = () => {
  const { notifications, dismissNotification } = useUiStore();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[340px]">
      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => dismissNotification(n.id)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm cursor-pointer transition-all
            ${n.type === "success" ? "bg-green-900/80 border border-green-700 text-green-200" : ""}
            ${n.type === "error" ? "bg-red-900/80 border border-red-700 text-red-200" : ""}
            ${n.type === "info" ? "bg-bg-card border border-border text-white" : ""}
          `}
        >
          <span>
            {n.type === "success" && "✓"}
            {n.type === "error" && "✕"}
            {n.type === "info" && "ℹ"}
          </span>
          <span className="flex-1">{n.message}</span>
        </div>
      ))}
    </div>
  );
};
