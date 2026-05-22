import React, { useCallback, useEffect } from "react";
import { zoo } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { CopyButton } from "../components/ui/CopyButton";

export const Dashboard: React.FC = () => {
  const { currentAccount, balance, isLoadingBalance, setBalance, setIsUnlocked, setIsLoadingBalance } =
    useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const ethAddress = currentAccount?.addresses?.ETH;

  const fetchBalance = useCallback(async () => {
    if (!ethAddress) return;
    setIsLoadingBalance(true);
    try {
      const b = await zoo.eth.getBalance(ethAddress);
      setBalance(b);
    } catch {
      showNotification("error", "余额加载失败");
    } finally {
      setIsLoadingBalance(false);
    }
  }, [ethAddress, setBalance, setIsLoadingBalance, showNotification]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleLock = () => {
    setIsUnlocked(false);
    navigate("unlock");
  };

  // Truncate address for display
  const shortAddr = ethAddress
    ? `${ethAddress.slice(0, 6)}…${ethAddress.slice(-4)}`
    : "—";

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <div>
          <p className="text-xs text-muted">{currentAccount?.name ?? "—"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm text-white">{shortAddr}</span>
            {ethAddress && <CopyButton text={ethAddress} label="" />}
          </div>
        </div>
        <button
          onClick={handleLock}
          className="text-muted hover:text-white text-xl"
          title="锁定"
        >
          🔒
        </button>
      </div>

      {/* Balance card */}
      <div className="mx-4 mt-4 bg-bg-card rounded-2xl p-6 flex flex-col items-center gap-2">
        <p className="text-xs text-muted uppercase tracking-wide">ETH 余额</p>
        {isLoadingBalance ? (
          <div className="h-9 w-36 bg-bg-hover rounded-lg animate-pulse" />
        ) : (
          <p className="text-3xl font-bold">
            {balance ?? "—"} <span className="text-muted text-lg">ETH</span>
          </p>
        )}
        <button
          onClick={fetchBalance}
          disabled={isLoadingBalance}
          className="text-xs text-muted hover:text-white mt-1 transition-colors"
        >
          ↻ 刷新
        </button>
      </div>

      {/* ETH address (full) */}
      {ethAddress && (
        <div className="mx-4 mt-3 bg-bg-card rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="font-mono text-xs text-muted truncate">{ethAddress}</p>
          <CopyButton text={ethAddress} />
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mt-6 flex gap-3">
        <Button fullWidth onClick={() => navigate("send")}>
          发送
        </Button>
      </div>
    </div>
  );
};
