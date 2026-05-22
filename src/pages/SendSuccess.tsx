import React from "react";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { CopyButton } from "../components/ui/CopyButton";

export const SendSuccess: React.FC = () => {
  const { navigate, lastSentHash } = useUiStore();
  const hash = lastSentHash ?? "";

  return (
    <div className="flex flex-col h-screen bg-forest px-6 pb-8">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(0,237,100,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 relative">
        {/* Success mark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-midnight border border-neon/30 flex items-center justify-center shadow-card animate-scale-in">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#00ED64" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neon animate-glow-pulse" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-fog">发送成功</h1>
          <p className="text-sm text-slate mt-1.5">交易已广播至以太坊网络</p>
        </div>

        {/* TX hash card */}
        {hash && (
          <div className="w-full bg-midnight border border-canopy/25 rounded-2xl p-5 shadow-card">
            <p className="label mb-2">交易哈希</p>
            <p className="font-mono text-xs text-slate break-all leading-relaxed">{hash}</p>
            <div className="flex items-center gap-3 mt-4">
              <CopyButton text={hash} label="复制哈希" />
              <a
                href={`https://etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-sky hover:text-sky/80 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Etherscan 查看
              </a>
            </div>
          </div>
        )}
      </div>

      <Button fullWidth size="lg" onClick={() => navigate("dashboard")}>
        返回主界面
      </Button>
    </div>
  );
};
