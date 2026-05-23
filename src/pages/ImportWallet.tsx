import React, { useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type Mode = "mnemonic" | "privatekey" | "watch";

const ModeTab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button onClick={onClick}
    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${active ? "bg-neon text-forest" : "text-slate hover:text-fog"}`}>
    {children}
  </button>
);

const ChainPill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active ? "bg-neon/10 border-neon/50 text-neon" : "border-ash/40 text-slate hover:border-canopy/50 hover:text-fog"}`}>
    {label}
  </button>
);

export const ImportWallet: React.FC = () => {
  const { setAccounts, setIsUnlocked, addAccount, accounts } = useWalletStore();
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

  // True when a wallet already exists on disk (guarded by accounts in store OR
  // by the has_wallet IPC result checked at startup).
  const hasWallet = accounts.length > 0;

  const handleImportMnemonic = async () => {
    const ws = mnemonicInput.trim().split(/\s+/);
    if (ws.length !== 12) { showNotification("error", "助记词需要 12 个单词"); return; }

    // ── Guard: wallet already exists ──────────────────────────────────────────
    // Calling create_from_mnemonic when a wallet is already set up would
    // silently overwrite the existing password_verify, mnemonic and all eth_keys.
    // Instead we block the path and direct the user to the safe alternatives.
    if (hasWallet) {
      showNotification(
        "error",
        "钱包已存在。如需添加账户，请使用"安全 → 派生新账户"；如需恢复此助记词，请先在新设备上使用，或卸载后重新安装。",
      );
      return;
    }
    // ── New wallet: proceed with creation ─────────────────────────────────────
    if (password.length < 8) { showNotification("error", "密码至少 8 位"); return; }
    if (password !== confirmPwd) { showNotification("error", "两次密码不一致"); return; }

    setLoading(true);
    try {
      const acc = await zoo.createWalletFromMnemonic({ words: ws, password, name: name || "Imported Wallet" });
      setAccounts([acc]);
      setIsUnlocked(true);
      navigate("dashboard");
    } catch (e) { showNotification("error", e instanceof IpcError ? e.message : "导入失败"); }
    finally { setLoading(false); }
  };

  const handleImportPrivateKey = async () => {
    if (!privateKey.trim() || !password) { showNotification("error", "请填写所有字段"); return; }
    setLoading(true);
    try {
      const acc = await zoo.importPrivateKey({ chain, private_key: privateKey.trim(), password, name: name || `Imported ${chain}` });
      addAccount(acc);
      showNotification("success", "私钥导入成功");
      navigate("dashboard");
    } catch (e) { showNotification("error", e instanceof IpcError ? e.message : "导入失败"); }
    finally { setLoading(false); }
  };

  const handleImportWatch = async () => {
    if (!watchAddress.trim()) { showNotification("error", "请输入地址"); return; }
    setLoading(true);
    try {
      const acc = await zoo.importWatchWallet({ address: watchAddress.trim(), chain, name: name || `Watch ${chain}` });
      addAccount(acc);
      showNotification("success", "观察钱包已添加");
      navigate("dashboard");
    } catch (e) { showNotification("error", e instanceof IpcError ? e.message : "导入失败"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-forest">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("welcome")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-base font-semibold text-fog">导入钱包</h1>
      </div>

      {/* Mode tabs */}
      <div className="mx-4 flex bg-midnight border border-canopy/20 rounded-xl p-1 gap-1 mb-4">
        <ModeTab active={mode === "mnemonic"} onClick={() => setMode("mnemonic")}>助记词</ModeTab>
        <ModeTab active={mode === "privatekey"} onClick={() => setMode("privatekey")}>私钥</ModeTab>
        <ModeTab active={mode === "watch"} onClick={() => setMode("watch")}>观察</ModeTab>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
        <Input label="账户名称" value={name} onChange={e => setName(e.target.value)} placeholder="My Wallet" />

        {/* ── Mnemonic ─────────────── */}
        {mode === "mnemonic" && (
          <>
            <div>
              <p className="label mb-1.5">助记词（12 个词，空格分隔）</p>
              <textarea
                value={mnemonicInput}
                onChange={e => setMnemonicInput(e.target.value)}
                rows={3}
                placeholder="word1 word2 word3 … word12"
                className="w-full bg-coal border border-canopy/45 rounded-lg px-3.5 py-2.5 text-sm text-fog placeholder-slate/60 font-mono resize-none outline-none focus:border-neon focus:shadow-[0_0_0_3px_rgba(0,237,100,0.15)] transition-all"
              />
            </div>
            {!hasWallet ? (
              <>
                <Input label="钱包密码（≥ 8 位）" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                <Input label="确认密码" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                  error={confirmPwd && confirmPwd !== password ? "密码不一致" : undefined} />
              </>
            ) : (
              /* Wallet already exists — show a warning banner instead of password fields.
                 The button click handler will surface the same message as a notification. */
              <div className="flex items-start gap-2.5 bg-warning/5 border border-warning/25 rounded-xl px-4 py-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p className="text-xs text-warning/80 leading-relaxed">
                  钱包已存在，导入助记词会覆盖当前钱包数据。<br />
                  如需添加账户，请前往 <strong className="text-warning">安全 → 派生新账户</strong>。
                </p>
              </div>
            )}
            <Button fullWidth size="lg" loading={loading} onClick={handleImportMnemonic}
              disabled={hasWallet}>
              导入助记词
            </Button>
          </>
        )}

        {/* ── Private Key ─────────────── */}
        {mode === "privatekey" && (
          <>
            <div>
              <p className="label mb-2">选择链</p>
              <div className="flex gap-2 flex-wrap">
                <ChainPill label="ETH" active={chain === "ETH"} onClick={() => setChain("ETH")} />
                <span className="text-xs text-ash self-center">(BTC/SOL Phase 4/5)</span>
              </div>
            </div>
            <Input label="私钥 (hex)" type="password" value={privateKey} onChange={e => setPrivateKey(e.target.value)} placeholder="0x..." />
            <Input label="钱包密码" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            <Button fullWidth size="lg" loading={loading} onClick={handleImportPrivateKey}>导入私钥</Button>
          </>
        )}

        {/* ── Watch ─────────────── */}
        {mode === "watch" && (
          <>
            <div>
              <p className="label mb-2">选择链</p>
              <div className="flex gap-2">
                {["ETH", "BTC", "SOL"].map(c => (
                  <ChainPill key={c} label={c} active={chain === c} onClick={() => setChain(c)} />
                ))}
              </div>
            </div>
            <Input label="地址" value={watchAddress} onChange={e => setWatchAddress(e.target.value)} placeholder="0x… / bc1… / SOL 地址" />
            <div className="flex items-start gap-2 bg-midnight border border-canopy/20 rounded-xl px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#89989B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <p className="text-xs text-slate">观察钱包仅查看资产，无法执行任何交易</p>
            </div>
            <Button fullWidth size="lg" loading={loading} onClick={handleImportWatch}>添加观察钱包</Button>
          </>
        )}
      </div>
    </div>
  );
};
