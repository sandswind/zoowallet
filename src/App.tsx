import React, { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/ui/Toast";
import { Welcome } from "./pages/Welcome";
import { CreateWallet } from "./pages/CreateWallet";
import { Unlock } from "./pages/Unlock";
import { Dashboard } from "./pages/Dashboard";
import { Send } from "./pages/Send";
import { SendSuccess } from "./pages/SendSuccess";
import { useUiStore } from "./store/uiStore";
import { useWalletStore } from "./store/walletStore";
import { zoo } from "./lib/ipc";

const AppInner: React.FC = () => {
  const { currentPage, navigate } = useUiStore();
  const { isUnlocked } = useWalletStore();

  // On mount: determine initial page based on wallet state
  useEffect(() => {
    zoo
      .hasWallet()
      .then((has) => {
        if (!has) {
          navigate("welcome");
        } else if (!isUnlocked) {
          navigate("unlock");
        }
        // else stay on current page (dashboard after create)
      })
      .catch(() => navigate("welcome"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case "welcome":
        return <Welcome />;
      case "create":
        return <CreateWallet />;
      case "unlock":
        return <Unlock />;
      case "dashboard":
        return <Dashboard />;
      case "send":
        return <Send />;
      case "send-success":
        return <SendSuccess />;
      default:
        return <Welcome />;
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
