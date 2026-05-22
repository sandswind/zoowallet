import React, { useEffect, useState } from "react";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";

function QRMockup({ value }: { value: string }) {
  // Deterministic pattern from address
  const seed = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 25 }, (_, i) => {
    const r = (seed * (i + 7) * 13 + i * 31) % 100;
    return r > 45;
  });
  return (
    <div className="bg-fog p-4 rounded-2xl inline-block">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "repeat(5,1fr)", width: 140 }}>
        {cells.map((on, i) => (
          <div key={i} className={`w-5 h-5 rounded-sm ${on ? "bg-forest" : "bg-fog"}`} />
        ))}
      </div>
    </div>
  );
}

export const Receive: React.FC = () => {
  const { currentAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();
  const [copied, setCopied] = useState(false);

  const ethAddress = currentAccount?.addresses?.ETH ?? "";

  const handleCopy = async () => {
    if (!ethAddress) return;
    try {
      await navigator.clipboard.writeText(ethAddress);
      setCopied(true);
      showNotification("success", "地址已复制");
      setTimeout(() => setCopied(false), 2000);
    } catch { showNotification("error", "复制失败"); }
  };

  useEffect(() => () => setCopied(false), []);

  return (
    <div className="flex flex-col h-screen bg-forest">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-fog">收款</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
        {/* Chain badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-neon/10 border border-neon/20 rounded-full">
          <div className="w-4 h-4 rounded-full bg-neon flex items-center justify-center text-[8px] font-bold text-forest">Ξ</div>
          <span className="text-xs font-medium text-neon">Ethereum Mainnet</span>
        </div>

        {/* QR card */}
        <div className="bg-midnight rounded-2xl border border-canopy/25 p-6 flex flex-col items-center gap-4 w-full shadow-card">
          {ethAddress ? <QRMockup value={ethAddress} /> : <div className="w-[148px] h-[148px] bg-coal rounded-2xl animate-pulse" />}

          <div className="text-center w-full">
            <p className="label mb-2">ETH 地址</p>
            <p className="font-mono text-xs text-slate leading-relaxed select-all break-all">
              {ethAddress || "—"}
            </p>
          </div>
        </div>

        {/* Copy button */}
        <Button
          fullWidth
          onClick={handleCopy}
          className={copied ? "!bg-neon/20 !text-neon !border-neon/40" : ""}
          variant={copied ? "ghost" : "primary"}
          icon={
            copied
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          }
        >
          {copied ? "已复制地址" : "复制地址"}
        </Button>

        {/* Warning */}
        <div className="flex items-start gap-2.5 bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 w-full">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <p className="text-xs text-warning/80 leading-relaxed">
            仅发送 <strong className="text-warning">ETH</strong> 或 <strong className="text-warning">ERC-20 代币</strong>。其他链资产发送至此地址将永久丢失。
          </p>
        </div>
      </div>
    </div>
  );
};
