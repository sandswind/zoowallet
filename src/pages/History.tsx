import React, { useCallback, useEffect, useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import type { TxRecord } from "../types";
import { CopyButton } from "../components/ui/CopyButton";
import { Button } from "../components/ui/Button";
import { PasswordModal } from "../components/ui/PasswordModal";

function formatValue(wei: string): string {
  try { return (Number(BigInt(wei)) / 1e18).toFixed(6); }
  catch { return "0.000000"; }
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isPending(tx: TxRecord): boolean {
  return parseInt(tx.confirmations ?? "0", 10) === 0 && Date.now() - tx.timestamp * 1000 < 5 * 60 * 1000;
}

export const History: React.FC = () => {
  const { currentAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<{ type: "speedup" | "cancel"; txHash: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const ethAddress = currentAccount?.addresses?.ETH ?? "";

  const fetchHistory = useCallback(async (p: number) => {
    if (!ethAddress) return;
    setLoading(true);
    try {
      const data = await zoo.eth.getHistory({ address: ethAddress, page: p, offset: 20 });
      setTxs(p === 1 ? data : (prev) => [...prev, ...data]);
    } catch (e) { showNotification("error", e instanceof IpcError ? e.message : "获取历史失败"); }
    finally { setLoading(false); }
  }, [ethAddress, showNotification]);

  useEffect(() => { fetchHistory(1); }, [fetchHistory]);

  const handleAction = async (password: string) => {
    if (!actionModal || !currentAccount?.id) return;
    setActionLoading(true);
    try {
      const args = { account_id: currentAccount.id, password, tx_hash: actionModal.txHash };
      const result = actionModal.type === "speedup"
        ? await zoo.eth.speedUpTransaction(args)
        : await zoo.eth.cancelTransaction(args);
      showNotification("success", `${actionModal.type === "speedup" ? "加速" : "取消"}成功: ${result.hash.slice(0, 10)}…`);
      setActionModal(null);
      setTimeout(() => { setPage(1); fetchHistory(1); }, 2000);
    } catch (e) { showNotification("error", e instanceof IpcError ? e.message : "操作失败"); }
    finally { setActionLoading(false); }
  };

  const addrShort = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div className="flex flex-col h-screen bg-forest">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-base font-semibold text-fog">交易历史</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {loading && txs.length === 0 ? (
          <div className="flex flex-col gap-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-midnight rounded-xl animate-pulse border border-canopy/15" />)}
          </div>
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3D4F58" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4.5"/>
              <polyline points="3 3 3 9 9 9"/>
            </svg>
            <p className="text-sm text-ash">暂无交易记录</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {txs.map((tx) => {
                const isSend = tx.from.toLowerCase() === ethAddress.toLowerCase();
                const pending = isSend && isPending(tx);
                return (
                  <div key={tx.hash} className="bg-midnight border border-canopy/20 rounded-xl p-4 hover:border-canopy/35 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Direction icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.isError ? "bg-danger/10 text-danger"
                        : isSend ? "bg-coal text-slate"
                        : "bg-neon/10 text-neon"
                      }`}>
                        {tx.isError
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          : isSend
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-fog">
                              {isSend ? "发送" : "接收"}
                              {tx.method ? ` · ${tx.method.split("(")[0]}` : ""}
                            </p>
                            {pending && (
                              <span className="text-2xs text-warning border border-warning/30 rounded px-1.5 py-0.5">待确认</span>
                            )}
                          </div>
                          <p className={`text-sm font-semibold tabular-nums ${
                            tx.isError ? "text-ash line-through" : isSend ? "text-slate" : "text-neon"
                          }`}>
                            {isSend ? "-" : "+"}{formatValue(tx.value)} ETH
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-slate">{isSend ? `→ ${addrShort(tx.to)}` : `← ${addrShort(tx.from)}`}</p>
                          <span className="text-ash">·</span>
                          <p className="text-xs text-ash">{formatTime(tx.timestamp)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="font-mono text-xs text-ash truncate max-w-[120px]">{tx.hash.slice(0, 14)}…</p>
                          <CopyButton text={tx.hash} iconOnly />
                          <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-sky hover:text-sky/80 transition-colors flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            查看
                          </a>
                        </div>
                        {pending && (
                          <div className="flex gap-2 mt-2.5">
                            <button onClick={() => setActionModal({ type: "speedup", txHash: tx.hash })}
                              className="text-xs text-warning border border-warning/30 rounded-md px-2.5 py-1 hover:bg-warning/10 transition-colors">
                              加速
                            </button>
                            <button onClick={() => setActionModal({ type: "cancel", txHash: tx.hash })}
                              className="text-xs text-danger border border-danger/30 rounded-md px-2.5 py-1 hover:bg-danger/10 transition-colors">
                              取消
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {txs.length >= 20 && (
              <Button variant="secondary" fullWidth className="mt-3" loading={loading}
                onClick={() => { const n = page + 1; setPage(n); fetchHistory(n); }}>
                加载更多
              </Button>
            )}
          </>
        )}
      </div>

      <PasswordModal
        open={actionModal !== null}
        title={actionModal?.type === "speedup" ? "加速交易" : "取消交易"}
        description={actionModal?.type === "speedup" ? "提高 Gas 费替换原交易" : "向自己发送 0 ETH 占用 nonce"}
        loading={actionLoading}
        onSubmit={handleAction}
        onCancel={() => setActionModal(null)}
      />
    </div>
  );
};
