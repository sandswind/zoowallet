import React from "react";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { CopyButton } from "../components/ui/CopyButton";

export const SendSuccess: React.FC = () => {
  const { navigate, lastSentHash } = useUiStore();
  const hash = lastSentHash ?? "";

  const explorerUrl = hash
    ? `https://etherscan.io/tx/${hash}`
    : "https://etherscan.io";

  return (
    <div className="flex flex-col h-screen bg-bg-primary px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-900/40 flex items-center justify-center text-4xl">
          ✅
        </div>
        <div>
          <h1 className="text-xl font-bold">发送成功</h1>
          <p className="text-muted text-sm mt-1">交易已广播到以太坊网络</p>
        </div>

        {hash && (
          <div className="w-full bg-bg-card rounded-xl p-4 flex flex-col gap-2">
            <p className="text-xs text-muted">交易哈希</p>
            <p className="font-mono text-xs text-white break-all">{hash}</p>
            <CopyButton text={hash} label="复制哈希" className="self-end" />
          </div>
        )}

        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand text-sm underline"
        >
          在 Etherscan 查看 →
        </a>
      </div>

      <Button fullWidth size="lg" onClick={() => navigate("dashboard")}>
        完成
      </Button>
    </div>
  );
};
