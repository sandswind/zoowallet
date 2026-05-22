import React, { useCallback, useEffect, useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import type { TxRecord } from "../types";
import { CopyButton } from "../components/ui/CopyButton";
import { Button } from "../components/ui/Button";

function formatValue(wei: string): string {
  const n = BigInt(wei);
  const eth = Number(n) / 1e18;
  return eth.toFixed(6);
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const History: React.FC = () => {
  const { currentAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const ethAddress = currentAccount?.addresses?.ETH ?? "";

  const fetchHistory = useCallback(async (p: number) => {
    if (!ethAddress) return;
    setLoading(true);
    try {
      const data = await zoo.eth.getHistory({ address: ethAddress, page: p, offset: 20 });
      setTxs(p === 1 ? data : (prev) => [...prev, ...data] as TxRecord[]);
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "获取历史失败");
    } finally { setLoading(false); }
  }, [ethAddress, showNotification]);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const addrShort = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="text-muted hover:text-white text-xl">←</button>
        <h1 className="text-base font-semibold">交易历史</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading && txs.length === 0 ? (
          <div className="flex flex-col gap-2 mt-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-bg-card rounded-xl animate-pulse" />)}
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center text-muted text-sm mt-16">暂无交易记录</div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {txs.map((tx) => {
                const isSend = tx.from.toLowerCase() === ethAddress.toLowerCase();
                return (
                  <div key={tx.hash} className="bg-bg-card rounded-xl p-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isSend ? "bg-red-900/40 text-red-400" : "bg-green-900/40 text-green-400"}`}>
                      {isSend ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{isSend ? "发送" : "接收"}{tx.method ? ` · ${tx.method.split("(")[0]}` : ""}</p>
                        <p className={`text-sm font-medium ${isSend ? "text-red-400" : "text-green-400"}`}>
                          {isSend ? "-" : "+"}{formatValue(tx.value)} ETH
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted">{isSend ? `→ ${addrShort(tx.to)}` : `← ${addrShort(tx.from)}`}</p>
                        <span className="text-xs text-muted">·</span>
                        <p className="text-xs text-muted">{formatTime(tx.timestamp)}</p>
                        {tx.isError && <span className="text-xs text-danger">失败</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-mono text-xs text-muted truncate">{tx.hash.slice(0, 16)}…</p>
                        <CopyButton text={tx.hash} label="" />
                        <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-brand">查看</a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {txs.length >= 20 && (
              <Button variant="secondary" fullWidth className="mt-3" loading={loading}
                onClick={() => { const next = page + 1; setPage(next); fetchHistory(next); }}>
                加载更多
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
