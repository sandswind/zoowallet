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
    const t = setInterval(
      () => setCountdown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearInterval(t);
  }, [countdown]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || countdown > 0) return;
    setLoading(true);
    setError("");
    try {
      const ok = await zoo.verifyPassword(password);
      if (!ok) {
        setError("密码不正确");
        return;
      }
      const accounts = await zoo.getAccounts();
      setAccounts(accounts);
      setIsUnlocked(true);
      navigate("dashboard");
    } catch (e) {
      if (e instanceof IpcError) {
        const msg = e.message;
        // Extract countdown from rate-limit message
        const m = msg.match(/请\s*(\d+)\s*秒/);
        if (m) setCountdown(parseInt(m[1], 10));
        setError(msg);
      } else {
        showNotification("error", "解锁失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary px-6 py-10">
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-brand/20 flex items-center justify-center text-3xl">
          🔒
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold">欢迎回来</h1>
          <p className="text-muted text-sm mt-1">输入密码解锁钱包</p>
        </div>

        <form onSubmit={handleUnlock} className="w-full flex flex-col gap-4">
          <Input
            type="password"
            placeholder="输入密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error || undefined}
            disabled={countdown > 0}
            autoFocus
          />
          {countdown > 0 && (
            <p className="text-xs text-warning text-center">
              已锁定，请 {countdown} 秒后重试
            </p>
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
    </div>
  );
};
