import React from "react";
import { Button } from "../components/ui/Button";
import { useUiStore } from "../store/uiStore";

export const Welcome: React.FC = () => {
  const navigate = useUiStore((s) => s.navigate);

  return (
    <div className="flex flex-col h-screen bg-forest px-6 pb-10">
      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,237,100,0.08) 0%, transparent 70%)" }} />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
        {/* Logo mark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-midnight border border-canopy/40 flex items-center justify-center shadow-card">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4C11.163 4 4 11.163 4 20s7.163 16 16 16 16-7.163 16-16S28.837 4 20 4z" fill="#001E2B"/>
              <path d="M20 6C12.268 6 6 12.268 6 20s6.268 14 14 14 14-6.268 14-14S27.732 6 20 6z" stroke="#00684A" strokeWidth="1.5"/>
              <path d="M20 10v20M14 14l6-4 6 4M14 26l6 4 6-4" stroke="#00ED64" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Neon dot */}
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neon shadow-[0_0_8px_rgba(0,237,100,0.8)]" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-fog tracking-tight mb-2">ZooWallet</h1>
          <p className="text-sm text-slate max-w-xs leading-relaxed">
            跨链桌面钱包，支持 Ethereum、Bitcoin、Solana 及 EVM L2
          </p>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {["AES-256-GCM 加密", "BIP-39 助记词", "多链支持"].map((f) => (
            <span key={f} className="text-2xs text-canopy border border-canopy/30 rounded-full px-3 py-1 bg-canopy/5">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-2">
        <Button fullWidth size="lg" variant="primary" onClick={() => navigate("create")}>
          创建新钱包
        </Button>
        <Button fullWidth size="lg" variant="secondary" onClick={() => navigate("import")}>
          导入钱包
        </Button>
      </div>
    </div>
  );
};
