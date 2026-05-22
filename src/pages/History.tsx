import React, { useCallback, useEffect, useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import type { TxRecord } from "../types";
import { CopyButton } from "../components/ui/CopyButton";
import { Button } from "../components/ui/Button";
import { PasswordModal } from "../components/ui/PasswordModal";

function formatValue(wei: string): string {
  try {
    const n = BigInt(wei);
    const eth = Number(n) / 1e18;
    return eth.toFixed(6);
  } catch {
    return "0.000000";
  }
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString("zh-CN", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** A tx is likely pending if confirmations is "0" or missing and it's recent (<5 min) */
function isPending(tx: TxRecord): boolean {
  const confs = parseInt(tx.confirmations ?? "0", 10);
  const ageMs = Date.now() - tx.timestamp * 1000;
  return confs === 0 && ageMs < 5 * 60 * 1000;
}

export const History: React.FC = () => {
  const { currentAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();
  const [txs, setTxs] = useState<TxRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Speed-up / cancel modal state
  const [actionModal, setActionModal] = useState<{
    type: "speedup" | "cancel";
    txHash: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const ethAddress = currentAccount?.addresses?.ETH ?? "";

  const fetchHistory = useCallback(async (p: number) => {
    if (!ethAddress) return;
    setLoading(true);
    try {
      const data = await zoo.eth.getHistory({ address: ethAddress, page: p, offset: 20 });
      if (p === 1) {
        setTxs(data);
      } else {
        setTxs((prev) => [...prev, ...data]);
      }
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "获取历史失败");
    } finally {
      setLoading(false);
    }
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
      const label = actionModal.type === "speedup" ? "加速" : "取消";
      showNotification("success", `${label}交易已广播: ${result.hash.slice(0, 12)}…`);
      setActionModal(null);
      // Refresh history after 2s
      setTimeout(() => { setPage(1); fetchHistory(1); }, 2000);
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "操作失败");
    } finally {
      setActionLoading(false);
    }
  };

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
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-bg-card rounded-xl animate-pulse" />
            ))}
          </div>
        ) : txs.length === 0 ? (
          <div className="text-center text-muted text-sm mt-16">暂无交易记录</div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {txs.map((tx) => {
                const isSend = tx.from.toLowerCase() === ethAddress.toLowerCase();
                const pending = isSend && isPending(tx);

                return (
                  <div key={tx.hash} className="bg-bg-card rounded-xl p-3 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                      tx.isError ? "bg-danger/20 text-danger"
                      : isSend ? "bg-red-900/40 text-red-400"
                      : "bg-green-900/40 text-green-400"
                    }`}>
                      {tx.isError ? "✕" : isSend ? "↑" : "↓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {isSend ? "发送" : "接收"}
                          {tx.method ? ` · ${tx.method.split("(")[0]}` : ""}
                          {pending && <span className="ml-1.5 text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded">待确认</span>}
                        </p>
                        <p className={`text-sm font-medium ${
                          tx.isError ? "text-muted line-through"
                          : isSend ? "text-red-400"
                          : "text-green-400"
                        }`}>
                          {isSend ? "-" : "+"}{formatValue(tx.value)} ETH
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted">
                          {isSend ? `→ ${addrShort(tx.to)}` : `← ${addrShort(tx.from)}`}
                        </p>
                        <span className="text-xs text-muted">·</span>
                        <p className="text-xs text-muted">{formatTime(tx.timestamp)}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-mono text-xs text-muted truncate">{tx.hash.slice(0, 14)}…</p>
                        <CopyButton text={tx.hash} label="" />
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand"
                        >
                          查看
                        </a>
                      </div>
                      {/* Speed-up / cancel for pending sent txs */}
                      {pending && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => setActionModal({ type: "speedup", txHash: tx.hash })}
                            className="text-xs text-warning border border-warning/40 px-2 py-0.5 rounded hover:bg-warning/10 transition-colors"
                          >
                            加速
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "cancel", txHash: tx.hash })}
                            className="text-xs text-danger border border-danger/40 px-2 py-0.5 rounded hover:bg-danger/10 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {txs.length >= 20 && (
              <Button
                variant="secondary"
                fullWidth
                className="mt-3"
                loading={loading}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchHistory(next);
                }}
              >
                加载更多
              </Button>
            )}
          </>
        )}
      </div>

      {/* Speed-up / cancel password modal */}
      <PasswordModal
        open={actionModal !== null}
        title={actionModal?.type === "speedup" ? "加速交易" : "取消交易"}
        description={
          actionModal?.type === "speedup"
            ? "提高 Gas 费，用相同 nonce 替换待处理交易"
            : "向自己发送 0 ETH，取消待处理交易"
        }
        loading={actionLoading}
        onSubmit={handleAction}
        onCancel={() => setActionModal(null)}
      />
    </div>
  );
};
