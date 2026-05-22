import React, { useEffect, useState } from "react";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";

// Minimal QR code via a public CDN-free approach: encode as SVG data URL via online service
// For production, use @tauri-apps/api with a bundled qrcode library
function QRPlaceholder({ value }: { value: string }) {
  return (
    <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-2">
      <div className="w-full h-full bg-bg-secondary rounded-xl flex flex-col items-center justify-center gap-2 text-xs text-muted">
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm1 1h3v3H5V5zM13 3h7v7h-7V3zm1 1v5h5V4h-5zm1 1h3v3h-3V5zM3 13h7v7H3v-7zm1 1v5h5v-5H4zm1 1h3v3H5v-3zm8-1h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-6h2v2h-2v-2zm0 4h2v2h-2v-2zm2-6h-2v2h2v-2z"/>
        </svg>
        <span className="text-center px-2 break-all font-mono text-[9px] leading-tight">{value.slice(0, 12)}…</span>
        <span className="text-muted/60 text-[10px]">QR code</span>
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
      showNotification("success", "地址已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showNotification("error", "复制失败");
    }
  };

  // Reset copied state when unmounting
  useEffect(() => () => setCopied(false), []);

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("dashboard")}
          className="text-muted hover:text-white text-xl"
        >
          ←
        </button>
        <h1 className="text-base font-semibold">收款</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {/* Chain badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 rounded-full border border-brand/30">
          <div className="w-4 h-4 rounded-full bg-brand flex items-center justify-center text-[8px] font-bold text-white">Ξ</div>
          <span className="text-xs font-medium text-brand">Ethereum Mainnet</span>
        </div>

        {/* QR Code */}
        <div className="bg-bg-card rounded-3xl p-6 flex flex-col items-center gap-4">
          {ethAddress ? (
            <QRPlaceholder value={ethAddress} />
          ) : (
            <div className="w-48 h-48 bg-bg-hover rounded-2xl animate-pulse" />
          )}

          {/* Full address */}
          <div className="text-center w-full">
            <p className="text-xs text-muted mb-1">ETH 地址</p>
            <p className="font-mono text-xs text-white break-all leading-5 select-all">
              {ethAddress || "—"}
            </p>
          </div>
        </div>

        {/* Copy button */}
        <Button
          fullWidth
          onClick={handleCopy}
          className={copied ? "!bg-success" : ""}
        >
          {copied ? "✓ 已复制地址" : "复制地址"}
        </Button>

        {/* Warning */}
        <div className="bg-warning/10 border border-warning/30 rounded-xl px-4 py-3 w-full">
          <p className="text-xs text-warning/90 text-center leading-5">
            仅发送 <strong>ETH</strong> 或 <strong>ERC-20 代币</strong> 到此地址。发送其他链资产将导致永久丢失。
          </p>
        </div>
      </div>
    </div>
  );
};
