import React, { useCallback, useEffect, useRef, useState } from "react";
import { zoo } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { CopyButton } from "../components/ui/CopyButton";

export const Dashboard: React.FC = () => {
  const {
    accounts, currentAccount, balance, tokenBalances,
    isLoadingBalance, isLoadingTokens,
    setBalance, setTokenBalances, setIsUnlocked, setIsLoadingBalance, setIsLoadingTokens, setCurrentAccount,
  } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const fetchIdRef = useRef(0);
  const ethAddress = currentAccount?.addresses?.ETH;
  const isWatch = currentAccount?.type === "watch";

  const fetchData = useCallback(async () => {
    if (!ethAddress) return;
    const fetchId = ++fetchIdRef.current;

    setIsLoadingBalance(true);
    setIsLoadingTokens(true);

    try {
      const [bal] = await Promise.allSettled([zoo.eth.getBalance(ethAddress)]);
      if (fetchId !== fetchIdRef.current) return;
      if (bal.status === "fulfilled") setBalance(bal.value);
      else showNotification("error", "余额加载失败");
    } finally {
      setIsLoadingBalance(false);
    }

    try {
      const [tokens] = await Promise.allSettled([zoo.eth.getTokenBalances(ethAddress)]);
      if (fetchId !== fetchIdRef.current) return;
      if (tokens.status === "fulfilled") setTokenBalances(tokens.value);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [ethAddress, setBalance, setTokenBalances, setIsLoadingBalance, setIsLoadingTokens, showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLock = () => { setIsUnlocked(false); navigate("unlock"); };
  const shortAddr = ethAddress ? `${ethAddress.slice(0, 6)}…${ethAddress.slice(-4)}` : "—";

  const [showAccounts, setShowAccounts] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <button onClick={() => setShowAccounts(!showAccounts)} className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-full bg-brand/30 flex items-center justify-center text-xs font-bold text-brand">
            {currentAccount?.name?.[0] ?? "A"}
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">{currentAccount?.name ?? "—"}</p>
            <div className="flex items-center gap-1">
              <span className="font-mono text-xs text-muted">{shortAddr}</span>
              {ethAddress && <CopyButton text={ethAddress} label="" />}
            </div>
          </div>
          <span className="text-muted text-xs ml-1">▾</span>
        </button>
        <button onClick={handleLock} className="text-muted hover:text-white text-lg" title="锁定">🔒</button>
      </div>

      {/* Account switcher dropdown */}
      {showAccounts && accounts.length > 1 && (
        <div className="mx-4 bg-bg-card border border-border rounded-xl overflow-hidden z-10 shadow-lg">
          {accounts.map((acc) => (
            <button key={acc.id} onClick={() => { setCurrentAccount(acc); setShowAccounts(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors text-left ${acc.id === currentAccount?.id ? "bg-bg-hover" : ""}`}>
              <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand flex-shrink-0">
                {acc.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{acc.name}</p>
                <p className="text-xs text-muted font-mono truncate">{acc.addresses.ETH?.slice(0, 10)}…</p>
              </div>
              {acc.type === "watch" && <span className="ml-auto text-xs bg-bg-primary px-2 py-0.5 rounded text-muted">观察</span>}
            </button>
          ))}
          <button onClick={() => { navigate("security"); setShowAccounts(false); }}
            className="w-full px-4 py-3 text-sm text-brand hover:bg-bg-hover border-t border-border">
            + 添加账户
          </button>
        </div>
      )}

      {/* Balance card */}
      <div className="mx-4 mt-3 bg-bg-card rounded-2xl p-5 flex flex-col items-center gap-1">
        {isWatch && <span className="text-xs bg-muted/20 text-muted px-2 py-0.5 rounded mb-1">观察钱包</span>}
        <p className="text-xs text-muted uppercase tracking-wide">ETH 余额</p>
        {isLoadingBalance ? (
          <div className="h-9 w-40 bg-bg-hover rounded-lg animate-pulse" />
        ) : (
          <p className="text-3xl font-bold">{balance ?? "—"} <span className="text-muted text-lg">ETH</span></p>
        )}
        <button onClick={fetchData} disabled={isLoadingBalance} className="text-xs text-muted hover:text-white transition-colors mt-1">↻ 刷新</button>
      </div>

      {/* Action buttons */}
      <div className="px-4 mt-3 flex gap-2">
        <Button fullWidth onClick={() => navigate("send")} disabled={isWatch}>发送</Button>
        <Button fullWidth variant="secondary" onClick={() => navigate("history")}>历史</Button>
        <Button fullWidth variant="secondary" onClick={() => navigate("security")}>安全</Button>
      </div>

      {/* Token list */}
      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-4">
        <p className="text-xs text-muted uppercase tracking-wide mb-2">代币</p>
        {isLoadingTokens ? (
          <div className="flex flex-col gap-2">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : tokenBalances.length === 0 ? (
          <p className="text-xs text-muted text-center py-6">暂无代币</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {tokenBalances.map((t) => (
              <div key={t.contractAddress} className="bg-bg-card rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t.symbol}</p>
                  <p className="text-xs text-muted">{t.name}</p>
                </div>
                <p className="text-sm font-medium">{t.balance}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
