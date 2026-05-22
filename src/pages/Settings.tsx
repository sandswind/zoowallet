import React from "react";
import { useUiStore } from "../store/uiStore";
import { useWalletStore } from "../store/walletStore";

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-midnight border border-canopy/20 rounded-xl overflow-hidden">
    <p className="label px-4 pt-3 pb-2 border-b border-canopy/10">{title}</p>
    {children}
  </div>
);

const Row: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-canopy/10 last:border-0">
    <p className="text-sm text-fog">{label}</p>
    {value && <p className="text-sm text-slate">{value}</p>}
    {children}
  </div>
);

const Toggle: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    role="switch"
    aria-checked={on}
    className={`relative w-11 h-6 rounded-full transition-colors duration-[200ms] focus-visible:shadow-glow ${on ? "bg-neon" : "bg-ash/50"}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-[200ms] ${on ? "translate-x-5" : ""}`} />
  </button>
);

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
    <div className="flex flex-col h-screen bg-forest">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-fog">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">
        {/* Security */}
        <SectionCard title="安全">
          <Row label="余额隐藏">
            <Toggle on={isBalanceHidden} onToggle={() => setIsBalanceHidden(!isBalanceHidden)} />
          </Row>
          <div className="px-4 py-3 border-b border-canopy/10 last:border-0">
            <p className="text-sm text-fog mb-2.5">自动锁屏</p>
            <div className="flex flex-wrap gap-2">
              {lockOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAutoLockMinutes(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-[120ms] ${
                    autoLockMinutes === opt.value
                      ? "bg-neon/10 border-neon/50 text-neon"
                      : "border-ash/40 text-slate hover:border-canopy/50 hover:text-fog"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* About */}
        <SectionCard title="关于">
          <Row label="版本" value="0.1.0" />
          <Row label="框架" value="Tauri v2 + React 18" />
          <Row label="加密算法" value="AES-256-GCM" />
          <Row label="密钥派生" value="PBKDF2-SHA512 × 310,000" />
        </SectionCard>
      </div>
    </div>
  );
};
