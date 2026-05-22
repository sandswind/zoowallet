import React from "react";
import { useUiStore } from "../store/uiStore";
import { useWalletStore } from "../store/walletStore";

export const Settings: React.FC = () => {
  const { navigate, autoLockMinutes, setAutoLockMinutes } = useUiStore();
  const { isBalanceHidden, setIsBalanceHidden } = useWalletStore();

  const lockOptions = [
    { label: "1 分钟", value: 1 },
    { label: "5 分钟", value: 5 },
    { label: "15 分钟", value: 15 },
    { label: "30 分钟", value: 30 },
    { label: "永不", value: 0 },
  ];

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="text-muted hover:text-white text-xl">←</button>
        <h1 className="text-base font-semibold">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">
        {/* Auto-lock */}
        <div className="bg-bg-card rounded-2xl p-4">
          <p className="text-sm font-medium mb-1">自动锁屏</p>
          <p className="text-xs text-muted mb-3">空闲多久后自动锁定钱包</p>
          <div className="flex flex-wrap gap-2">
            {lockOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAutoLockMinutes(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  autoLockMinutes === opt.value
                    ? "bg-brand border-brand text-white"
                    : "border-border text-muted hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Balance hide */}
        <div className="bg-bg-card rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">隐藏余额</p>
            <p className="text-xs text-muted">遮盖余额数字，保护隐私</p>
          </div>
          <button
            onClick={() => setIsBalanceHidden(!isBalanceHidden)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              isBalanceHidden ? "bg-brand" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isBalanceHidden ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* App info */}
        <div className="bg-bg-card rounded-2xl p-4">
          <p className="text-sm font-medium mb-2">关于</p>
          <div className="space-y-1.5 text-xs text-muted">
            <div className="flex justify-between">
              <span>版本</span>
              <span className="text-white">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span>框架</span>
              <span className="text-white">Tauri v2 + React 18</span>
            </div>
            <div className="flex justify-between">
              <span>加密</span>
              <span className="text-white">AES-256-GCM + PBKDF2</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
