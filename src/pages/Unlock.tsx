import React, { useEffect, useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

export const Unlock: React.FC = () => {
  const { setAccounts, setIsUnlocked } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || countdown > 0 || loading) return;
    setLoading(true);
    setError("");
    try {
      const ok = await zoo.verifyPassword(password);
      if (!ok) { setError("密码不正确"); return; }
      const accounts = await zoo.getAccounts();
      setAccounts(accounts);
      setIsUnlocked(true);
      navigate("dashboard");
    } catch (e) {
      if (e instanceof IpcError) {
        const m = e.message.match(/请\s*(\d+)\s*秒/);
        if (m) setCountdown(parseInt(m[1], 10));
        setError(e.message);
      } else {
        showNotification("error", "解锁失败");
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-forest px-6">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(0,237,100,0.06) 0%, transparent 70%)" }} />

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-2xl bg-midnight border border-canopy/40 flex items-center justify-center shadow-card">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ED64" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-fog">欢迎回来</h1>
          <p className="text-sm text-slate mt-1">输入密码解锁钱包</p>
        </div>

        <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4">
          <Input
            type="password"
            placeholder="钱包密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            disabled={countdown > 0 || loading}
            autoFocus
          />

          {countdown > 0 && (
            <div className="flex items-center gap-2 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC010" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-xs text-warning">已锁定，请 {countdown} 秒后重试</p>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            disabled={!password || countdown > 0}
          >
            解锁
          </Button>
        </form>
      </div>

      {/* Version */}
      <div className="pb-4 text-center">
        <span className="text-xs text-ash">ZooWallet v0.1.0</span>
      </div>
    </div>
  );
};
