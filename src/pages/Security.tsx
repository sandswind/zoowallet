import React, { useEffect, useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { CopyButton } from "../components/ui/CopyButton";

function parseRateLimit(msg: string): number {
  const m = msg.match(/请\s*(\d+)\s*秒/);
  return m ? parseInt(m[1], 10) : 0;
}

const PRIVKEY_CLEAR_SECS = 30;

const SecurityCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}> = ({ icon, title, description, action, onClick }) => (
  <div className="bg-midnight border border-canopy/20 rounded-xl p-4 hover:border-canopy/35 transition-colors">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-canopy/10 flex items-center justify-center text-neon shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-fog">{title}</p>
        <p className="text-xs text-slate mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="mt-3">
      <Button size="sm" variant="ghost" onClick={onClick}>{action}</Button>
    </div>
  </div>
);

export const Security: React.FC = () => {
  const { currentAccount, addAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showDerive, setShowDerive] = useState(false);

  const [pwd, setPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [clearTimer, setClearTimer] = useState(0);
  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState("");

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (clearTimer <= 0) return;
    const t = setInterval(() => setClearTimer(c => {
      if (c <= 1) { setPrivateKey(""); setShowPrivKey(false); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [clearTimer]);

  const reset = () => {
    setPwd(""); setNewPwd(""); setConfirmPwd(""); setNewName("");
    setMnemonicWords([]); setPrivateKey(""); setCountdown(0); setClearTimer(0);
  };

  const onError = (e: unknown) => {
    if (e instanceof IpcError) {
      const s = parseRateLimit(e.message);
      if (s > 0) setCountdown(s);
      showNotification("error", e.message);
    } else showNotification("error", "操作失败");
  };

  const handleExportMnemonic = async () => {
    setLoading(true);
    try { setMnemonicWords(await zoo.exportMnemonic(pwd)); }
    catch (e) { onError(e); }
    finally { setLoading(false); }
  };

  const handleExportPrivKey = async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const key = await zoo.getPrivateKey({ account_id: currentAccount.id, chain: "ETH", password: pwd });
      setPrivateKey(key); setClearTimer(PRIVKEY_CLEAR_SECS);
    } catch (e) { onError(e); }
    finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) { showNotification("error", "新密码不一致"); return; }
    if (newPwd.length < 8) { showNotification("error", "密码至少 8 位"); return; }
    setLoading(true);
    try {
      await zoo.changePassword({ old_password: pwd, new_password: newPwd });
      showNotification("success", "密码修改成功");
      setShowChangePwd(false); reset();
    } catch (e) { onError(e); }
    finally { setLoading(false); }
  };

  const handleDerive = async () => {
    setLoading(true);
    try {
      const account = await zoo.deriveNextAccount({ password: pwd, name: newName });
      addAccount(account);
      showNotification("success", `账户 "${account.name}" 已创建`);
      setShowDerive(false); reset();
    } catch (e) { onError(e); }
    finally { setLoading(false); }
  };

  const icons = {
    derive: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    mnemonic: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
    privkey: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
    pwd: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  };

  const RateLimitNote = () => countdown > 0
    ? <p className="text-xs text-warning flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 已锁定，{countdown} 秒后重试</p>
    : null;

  return (
    <div className="flex flex-col h-screen bg-forest">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-base font-semibold text-fog">安全管理</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-2.5">
        <SecurityCard icon={icons.derive} title="派生新账户" description="从同一助记词派生下一个 HD 账户" action="派生账户" onClick={() => { setShowDerive(true); reset(); }} />
        <SecurityCard icon={icons.mnemonic} title="导出助记词" description="请在安全环境操作，切勿截图或上传" action="查看助记词" onClick={() => { setShowMnemonic(true); reset(); }} />
        {currentAccount?.type !== "watch" && (
          <SecurityCard icon={icons.privkey} title="导出私钥" description={`${currentAccount?.name ?? ""} 的 ETH 私钥，任何人持有即可控制资产`} action="导出私钥" onClick={() => { setShowPrivKey(true); reset(); }} />
        )}
        <SecurityCard icon={icons.pwd} title="修改密码" description="修改后所有密钥将用新密码重新加密" action="修改密码" onClick={() => { setShowChangePwd(true); reset(); }} />
      </div>

      {/* Derive */}
      <Modal open={showDerive} onClose={() => { setShowDerive(false); reset(); }} title="派生新账户">
        <div className="flex flex-col gap-4">
          <Input label="账户名称" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Account 2" />
          <Input type="password" label="验证密码" value={pwd} onChange={e => setPwd(e.target.value)} disabled={countdown > 0} />
          <RateLimitNote />
          <Button fullWidth loading={loading} onClick={handleDerive} disabled={!pwd || countdown > 0}>派生账户</Button>
        </div>
      </Modal>

      {/* Mnemonic */}
      <Modal open={showMnemonic} onClose={() => { setShowMnemonic(false); reset(); }} title="导出助记词">
        {mnemonicWords.length === 0 ? (
          <div className="flex flex-col gap-4">
            <Input type="password" label="验证密码" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus disabled={countdown > 0} />
            <RateLimitNote />
            <Button fullWidth loading={loading} onClick={handleExportMnemonic} disabled={!pwd || countdown > 0}>确认导出</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-1.5">
              {mnemonicWords.map((w, i) => (
                <div key={i} className="bg-coal border border-canopy/20 rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                  <span className="text-2xs text-ash w-4">{i + 1}</span>
                  <span className="text-xs font-mono text-fog">{w}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-warning/80 text-center">请抄写在纸上妥善保管，关闭后不再显示</p>
            <Button fullWidth onClick={() => { setShowMnemonic(false); reset(); }}>我已安全保存</Button>
          </div>
        )}
      </Modal>

      {/* Private key */}
      <Modal open={showPrivKey} onClose={() => { setShowPrivKey(false); reset(); }} title="导出私钥">
        {!privateKey ? (
          <div className="flex flex-col gap-4">
            <Input type="password" label="验证密码" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus disabled={countdown > 0} />
            <RateLimitNote />
            <Button fullWidth loading={loading} onClick={handleExportPrivKey} disabled={!pwd || countdown > 0}>确认导出</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative bg-coal border border-canopy/25 rounded-xl p-4">
              <p className="font-mono text-xs text-slate break-all leading-relaxed select-all pr-8">{privateKey}</p>
              <CopyButton text={privateKey} iconOnly className="absolute top-3 right-3" />
            </div>
            <div>
              <p className="text-xs text-warning/80 text-center mb-2">将在 {clearTimer} 秒后自动清除</p>
              <div className="w-full bg-coal rounded-full h-1">
                <div className="bg-warning rounded-full h-1 transition-all" style={{ width: `${(clearTimer / PRIVKEY_CLEAR_SECS) * 100}%` }} />
              </div>
            </div>
            <Button fullWidth variant="secondary" onClick={() => { setShowPrivKey(false); reset(); }}>立即关闭</Button>
          </div>
        )}
      </Modal>

      {/* Change password */}
      <Modal open={showChangePwd} onClose={() => { setShowChangePwd(false); reset(); }} title="修改密码">
        <div className="flex flex-col gap-4">
          <Input type="password" label="当前密码" value={pwd} onChange={e => setPwd(e.target.value)} autoFocus disabled={countdown > 0} />
          <Input type="password" label="新密码（≥ 8 位）" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          <Input type="password" label="确认新密码" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
            error={confirmPwd && confirmPwd !== newPwd ? "密码不一致" : undefined} />
          <RateLimitNote />
          <Button fullWidth loading={loading} onClick={handleChangePassword} disabled={!pwd || !newPwd || !confirmPwd || countdown > 0}>确认修改</Button>
        </div>
      </Modal>
    </div>
  );
};
