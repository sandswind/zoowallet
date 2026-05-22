import React, { useCallback, useEffect, useRef, useState } from "react";
import { zoo } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { usePriceStore } from "../store/priceStore";
import { CopyButton } from "../components/ui/CopyButton";

// ── Action Button ─────────────────────────────────────────────────────────────
const ActionBtn: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center gap-1.5 flex-1 py-3 bg-coal rounded-xl border border-canopy/30 hover:border-canopy/60 hover:bg-coal/80 transition-all duration-[120ms] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <span className="text-neon">{icon}</span>
    <span className="text-2xs text-slate font-medium">{label}</span>
  </button>
);

export const Dashboard: React.FC = () => {
  const {
    accounts, currentAccount, balance, prevBalance, tokenBalances,
    isLoadingBalance, isLoadingTokens, isBalanceHidden,
    setBalance, setTokenBalances, setIsLoadingBalance, setIsLoadingTokens,
    setCurrentAccount, lock,
  } = useWalletStore();
  const { navigate, showNotification } = useUiStore();
  const { prices } = usePriceStore();

  const fetchIdRef = useRef(0);
  const ethAddress = currentAccount?.addresses?.ETH;
  const isWatch = currentAccount?.type === "watch";
  const ethPrice = prices["ETH"];
  const usdValue = balance && ethPrice
    ? (parseFloat(balance) * ethPrice.usd).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
    : null;

  const fetchData = useCallback(async () => {
    if (!ethAddress) return;
    const id = ++fetchIdRef.current;
    setIsLoadingBalance(true);
    setIsLoadingTokens(true);
    try {
      const [bal] = await Promise.allSettled([zoo.eth.getBalance(ethAddress)]);
      if (id !== fetchIdRef.current) return;
      if (bal.status === "fulfilled") setBalance(bal.value);
      else showNotification("error", "余额加载失败");
    } finally { setIsLoadingBalance(false); }
    try {
      const [tokens] = await Promise.allSettled([zoo.eth.getTokenBalances(ethAddress)]);
      if (id !== fetchIdRef.current) return;
      if (tokens.status === "fulfilled") setTokenBalances(tokens.value);
    } finally { setIsLoadingTokens(false); }
  }, [ethAddress, setBalance, setTokenBalances, setIsLoadingBalance, setIsLoadingTokens, showNotification]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Balance increase notification
  useEffect(() => {
    if (!balance || !prevBalance) return;
    const delta = parseFloat(balance) - parseFloat(prevBalance);
    if (delta > 0) showNotification("success", `收到 ${delta.toFixed(6)} ETH`);
  }, [balance, prevBalance, showNotification]);

  const shortAddr = ethAddress ? `${ethAddress.slice(0, 8)}…${ethAddress.slice(-6)}` : "—";
  const [showAccts, setShowAccts] = useState(false);

  const icons = {
    send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    receive: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    history: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4.5"/><polyline points="3 3 3 9 9 9"/></svg>,
    security: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  };

  return (
    <div className="flex flex-col h-screen bg-forest overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button
          onClick={() => setShowAccts(!showAccts)}
          className="flex items-center gap-2.5 group rounded-lg px-2 py-1.5 hover:bg-coal/60 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-midnight border border-canopy/40 flex items-center justify-center text-neon text-sm font-bold">
            {currentAccount?.name?.[0] ?? "A"}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-fog leading-tight">{currentAccount?.name ?? "—"}</p>
            <p className="font-mono text-xs text-slate">{shortAddr}</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#89989B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate("settings")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button onClick={() => { lock(); navigate("unlock"); }} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Account switcher ────────────────────────────────────────── */}
      {showAccts && accounts.length > 0 && (
        <div className="mx-4 mb-2 bg-midnight border border-canopy/30 rounded-xl overflow-hidden shadow-raised animate-scale-in z-10">
          {accounts.map((acc) => (
            <button key={acc.id}
              onClick={() => { setCurrentAccount(acc); setShowAccts(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-coal/50 transition-colors text-left border-b border-canopy/10 last:border-0 ${acc.id === currentAccount?.id ? "bg-coal/40" : ""}`}
            >
              <div className="w-7 h-7 rounded-md bg-canopy/20 flex items-center justify-center text-xs font-bold text-neon shrink-0">
                {acc.name[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fog">{acc.name}</p>
                <p className="font-mono text-xs text-slate truncate">{acc.addresses.ETH?.slice(0, 14)}…</p>
              </div>
              {acc.id === currentAccount?.id && (
                <div className="ml-auto w-2 h-2 rounded-full bg-neon" />
              )}
              {acc.type === "watch" && (
                <span className="ml-auto text-2xs text-slate border border-ash/50 rounded px-1.5 py-0.5">观察</span>
              )}
            </button>
          ))}
          <button
            onClick={() => { navigate("security"); setShowAccts(false); }}
            className="w-full px-4 py-3 text-sm text-neon hover:bg-coal/40 text-left flex items-center gap-2 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            添加账户
          </button>
        </div>
      )}

      {/* ── Balance card ─────────────────────────────────────────────── */}
      <div className="mx-4 mt-1 bg-midnight rounded-2xl border border-canopy/25 px-5 py-5 shadow-card">
        {isWatch && (
          <span className="inline-flex items-center gap-1 text-2xs text-slate border border-ash/40 rounded px-2 py-0.5 mb-3">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            观察钱包
          </span>
        )}

        <p className="label mb-2">ETH 余额</p>

        {isLoadingBalance ? (
          <div className="space-y-2">
            <div className="h-9 w-40 bg-coal/60 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-coal/40 rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-fog tabular-nums tracking-tight">
                {isBalanceHidden ? "●●●●●" : (balance ?? "—")}
              </span>
              <span className="text-base text-slate font-medium">ETH</span>
            </div>
            {!isBalanceHidden && usdValue && (
              <p className="text-sm text-slate mt-1 tabular-nums">{usdValue}</p>
            )}
            {ethPrice && (
              <p className={`text-xs mt-0.5 font-medium ${ethPrice.change24h >= 0 ? "text-neon" : "text-danger"}`}>
                {ethPrice.change24h >= 0 ? "↑" : "↓"} {Math.abs(ethPrice.change24h).toFixed(2)}% 24h
              </p>
            )}
          </>
        )}

        {/* Address row */}
        {ethAddress && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-canopy/15">
            <span className="font-mono text-xs text-slate truncate flex-1">{shortAddr}</span>
            <CopyButton text={ethAddress} iconOnly />
          </div>
        )}
      </div>

      {/* ── Action buttons ───────────────────────────────────────────── */}
      <div className="px-4 mt-3 grid grid-cols-4 gap-2">
        <ActionBtn icon={icons.send}    label="发送"   onClick={() => navigate("send")}    disabled={isWatch} />
        <ActionBtn icon={icons.receive} label="收款"   onClick={() => navigate("receive")} />
        <ActionBtn icon={icons.history} label="历史"   onClick={() => navigate("history")} />
        <ActionBtn icon={icons.security}label="安全"   onClick={() => navigate("security")} />
      </div>

      {/* ── Token list ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 mt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="label">代币</p>
          <button onClick={fetchData} disabled={isLoadingBalance} className="text-2xs text-slate hover:text-neon transition-colors flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isLoadingBalance ? "animate-spin" : ""}>
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            刷新
          </button>
        </div>

        {isLoadingTokens ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-midnight rounded-xl animate-pulse border border-canopy/15" />)}
          </div>
        ) : tokenBalances.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3D4F58" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <p className="text-xs text-ash">暂无 ERC-20 代币</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {tokenBalances.map((t) => (
              <div key={t.contractAddress} className="bg-midnight rounded-xl border border-canopy/20 px-4 py-3 flex items-center justify-between hover:border-canopy/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-canopy/15 flex items-center justify-center text-xs font-bold text-neon">
                    {t.symbol[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-fog">{t.symbol}</p>
                    <p className="text-xs text-slate">{t.name}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-fog tabular-nums">
                  {isBalanceHidden ? "●●●●" : t.balance}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
