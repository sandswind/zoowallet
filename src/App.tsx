import React, { useEffect, useRef } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/ui/Toast";
import { Welcome } from "./pages/Welcome";
import { CreateWallet } from "./pages/CreateWallet";
import { ImportWallet } from "./pages/ImportWallet";
import { Unlock } from "./pages/Unlock";
import { Dashboard } from "./pages/Dashboard";
import { Send } from "./pages/Send";
import { SendSuccess } from "./pages/SendSuccess";
import { History } from "./pages/History";
import { Security } from "./pages/Security";
import { Receive } from "./pages/Receive";
import { Settings } from "./pages/Settings";
import { useUiStore } from "./store/uiStore";
import { useWalletStore } from "./store/walletStore";
import { zoo } from "./lib/ipc";
import { usePriceStore } from "./store/priceStore";

const AppInner: React.FC = () => {
  const { currentPage, navigate, autoLockMinutes, updateActivity } = useUiStore();
  const { isUnlocked, setAccounts, lock } = useWalletStore();
  const { setPrices } = usePriceStore();
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial routing ────────────────────────────────────────────────────────
  useEffect(() => {
    zoo.hasWallet()
      .then(async (has) => {
        if (!has) {
          navigate("welcome");
        } else if (!isUnlocked) {
          navigate("unlock");
        } else {
          const accounts = await zoo.getAccounts();
          setAccounts(accounts);
        }
      })
      .catch(() => navigate("welcome"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-lock idle timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isUnlocked || autoLockMinutes === 0) {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      return;
    }

    const resetTimer = () => {
      updateActivity();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        lock();
        navigate("unlock");
      }, autoLockMinutes * 60 * 1000);
    };

    // Listen for any user activity
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start timer immediately

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [isUnlocked, autoLockMinutes, lock, navigate, updateActivity]);

  // ── Price fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isUnlocked) return;

    const fetchPrices = async () => {
      try {
        const data = await zoo.price.getMultiple(["ETH", "BTC", "SOL"]);
        setPrices(data);
      } catch {
        // Price service not yet implemented in Rust (Phase 8) — silently ignore
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, [isUnlocked, setPrices]);

  // ── Page renderer ──────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case "welcome":      return <Welcome />;
      case "create":       return <CreateWallet />;
      case "import":       return <ImportWallet />;
      case "unlock":       return <Unlock />;
      case "dashboard":    return <Dashboard />;
      case "send":         return <Send />;
      case "send-success": return <SendSuccess />;
      case "history":      return <History />;
      case "security":     return <Security />;
      case "receive":      return <Receive />;
      case "settings":     return <Settings />;
      default:             return <Welcome />;
    }
  };

  return (
    <div className="w-full h-screen overflow-hidden relative">
      {renderPage()}
      <ToastContainer />
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppInner />
  </ErrorBoundary>
);

export default App;
