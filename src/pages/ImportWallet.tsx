import React, { useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type Mode = "mnemonic" | "privatekey" | "watch";

export const ImportWallet: React.FC = () => {
  const { setAccounts, setIsUnlocked, addAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const [mode, setMode] = useState<Mode>("mnemonic");
  const [mnemonicInput, setMnemonicInput] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [watchAddress, setWatchAddress] = useState("");
  const [chain, setChain] = useState("ETH");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const hasWallet = useWalletStore((s) => s.accounts.length > 0);

  const handleImportMnemonic = async () => {
    const words = mnemonicInput.trim().split(/\s+/);
    if (words.length !== 12) {
      showNotification("error", "助记词需要 12 个单词");
      return;
    }
    if (!hasWallet && password.length < 8) {
      showNotification("error", "密码至少 8 位");
      return;
    }
    setLoading(true);
    try {
      const account = await zoo.createWalletFromMnemonic({
        words, password, name: name || "Imported Wallet",
      });
      setAccounts([account]);
      setIsUnlocked(true);
      navigate("dashboard");
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "导入失败");
    } finally { setLoading(false); }
  };

  const handleImportPrivateKey = async () => {
    if (!privateKey.trim()) { showNotification("error", "请输入私钥"); return; }
    if (!password) { showNotification("error", "请输入密码"); return; }
    setLoading(true);
    try {
      const account = await zoo.importPrivateKey({
        chain, private_key: privateKey.trim(), password, name: name || `Imported ${chain}`,
      });
      addAccount(account);
      showNotification("success", "私钥导入成功");
      navigate("dashboard");
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "导入失败");
    } finally { setLoading(false); }
  };

  const handleImportWatch = async () => {
    if (!watchAddress.trim()) { showNotification("error", "请输入地址"); return; }
    setLoading(true);
    try {
      const account = await zoo.importWatchWallet({
        address: watchAddress.trim(), chain, name: name || `Watch ${chain}`,
      });
      addAccount(account);
      showNotification("success", "观察钱包添加成功");
      navigate("dashboard");
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "导入失败");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("welcome")} className="text-muted hover:text-white text-xl">←</button>
        <h1 className="text-base font-semibold">导入钱包</h1>
      </div>

      {/* Mode tabs */}
      <div className="flex mx-4 bg-bg-card rounded-xl p-1 gap-1 mb-4">
        {(["mnemonic", "privatekey", "watch"] as Mode[]).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${mode === m ? "bg-brand text-white" : "text-muted hover:text-white"}`}>
            {m === "mnemonic" ? "助记词" : m === "privatekey" ? "私钥" : "观察"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-4">
        <Input label="账户名称" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Wallet" />

        {mode === "mnemonic" && (
          <>
            <div>
              <label className="text-xs font-medium text-muted uppercase tracking-wide">助记词（12个词，空格分隔）</label>
              <textarea value={mnemonicInput} onChange={(e) => setMnemonicInput(e.target.value)}
                className="mt-1.5 w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted outline-none focus:border-brand transition-colors resize-none"
                rows={3} placeholder="word1 word2 word3 ..." />
            </div>
            {!hasWallet && (
              <>
                <Input label="设置密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 8 位" />
                <Input label="确认密码" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
                  error={confirmPwd && confirmPwd !== password ? "密码不一致" : undefined} />
              </>
            )}
            {hasWallet && (
              <Input label="验证密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入钱包密码" />
            )}
            <Button fullWidth loading={loading} onClick={handleImportMnemonic}>导入助记词</Button>
          </>
        )}

        {mode === "privatekey" && (
          <>
            <div className="flex gap-2">
              {["ETH"].map((c) => (
                <button key={c} onClick={() => setChain(c)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${chain === c ? "bg-brand border-brand text-white" : "border-border text-muted hover:text-white"}`}>
                  {c}
                </button>
              ))}
              <span className="text-xs text-muted self-center ml-1">(BTC/SOL Phase 4/5)</span>
            </div>
            <Input label="私钥" type="password" value={privateKey} onChange={(e) => setPrivateKey(e.target.value)} placeholder="0x..." />
            <Input label="钱包密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入钱包密码" />
            <Button fullWidth loading={loading} onClick={handleImportPrivateKey}>导入私钥</Button>
          </>
        )}

        {mode === "watch" && (
          <>
            <div className="flex gap-2">
              {["ETH", "BTC", "SOL"].map((c) => (
                <button key={c} onClick={() => setChain(c)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${chain === c ? "bg-brand border-brand text-white" : "border-border text-muted hover:text-white"}`}>
                  {c}
                </button>
              ))}
            </div>
            <Input label="地址" value={watchAddress} onChange={(e) => setWatchAddress(e.target.value)} placeholder="0x... / bc1... / SOL地址" />
            <div className="bg-bg-card rounded-xl p-3 text-xs text-muted">
              观察钱包仅查看资产，无法执行任何交易操作
            </div>
            <Button fullWidth loading={loading} onClick={handleImportWatch}>添加观察钱包</Button>
          </>
        )}
      </div>
    </div>
  );
};
