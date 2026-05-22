import React from "react";
import { Button } from "../components/ui/Button";
import { useUiStore } from "../store/uiStore";

export const Welcome: React.FC = () => {
  const navigate = useUiStore((s) => s.navigate);

  return (
    <div className="flex flex-col h-screen bg-bg-primary px-6 py-10">
      {/* Logo area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-brand/20 flex items-center justify-center text-4xl">
          🦁
        </div>
        <h1 className="text-2xl font-bold tracking-tight">ZooWallet</h1>
        <p className="text-muted text-sm text-center max-w-xs">
          安全、跨链的桌面钱包，支持 ETH、BTC、SOL 及 EVM L2 网络
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pb-4">
        <Button fullWidth size="lg" onClick={() => navigate("create")}>
          创建新钱包
        </Button>
        <Button
          fullWidth
          size="lg"
          variant="secondary"
          disabled
          title="Phase 2 上线"
        >
          导入钱包
        </Button>
        <p className="text-xs text-muted text-center mt-1">
          导入功能将在 Phase 2 开放
        </p>
      </div>
    </div>
  );
};
