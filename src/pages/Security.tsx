import React, { useEffect, useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Modal } from "../components/ui/Modal";
import { CopyButton } from "../components/ui/CopyButton";

/** Parse "请 N 秒后重试" from IpcError message, return seconds or 0 */
function parseRateLimit(msg: string): number {
  const m = msg.match(/请\s*(\d+)\s*秒/);
  return m ? parseInt(m[1], 10) : 0;
}

const PRIVKEY_AUTO_CLEAR_SECS = 30;

export const Security: React.FC = () => {
  const { currentAccount, addAccount } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showPrivKey, setShowPrivKey] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showDeriveModal, setShowDeriveModal] = useState(false);

  const [pwd, setPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmNewPwd, setConfirmNewPwd] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);     // rate-limit countdown
  const [privKeyClear, setPrivKeyClear] = useState(0); // auto-clear countdown

  const [mnemonicWords, setMnemonicWords] = useState<string[]>([]);
  const [privateKey, setPrivateKey] = useState("");

  // Rate-limit countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Private key auto-clear countdown
  useEffect(() => {
    if (privKeyClear <= 0) return;
    const t = setInterval(() => setPrivKeyClear((c) => {
      if (c <= 1) {
        setPrivateKey("");
        setShowPrivKey(false);
        return 0;
      }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [privKeyClear]);

  const reset = () => {
    setPwd(""); setNewPwd(""); setConfirmNewPwd("");
    setMnemonicWords([]); setPrivateKey("");
    setCountdown(0); setPrivKeyClear(0);
  };

  const handleRateLimitError = (e: unknown) => {
    if (e instanceof IpcError) {
      const secs = parseRateLimit(e.message);
      if (secs > 0) setCountdown(secs);
      showNotification("error", e.message);
    } else {
      showNotification("error", "操作失败");
    }
  };

  const handleExportMnemonic = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const words = await zoo.exportMnemonic(pwd);
      setMnemonicWords(words);
    } catch (e) {
      handleRateLimitError(e);
    } finally { setLoading(false); }
  };

  const handleExportPrivKey = async () => {
    if (!currentAccount || countdown > 0) return;
    setLoading(true);
    try {
      const key = await zoo.getPrivateKey({ account_id: currentAccount.id, chain: "ETH", password: pwd });
      setPrivateKey(key);
      setPrivKeyClear(PRIVKEY_AUTO_CLEAR_SECS);
    } catch (e) {
      handleRateLimitError(e);
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmNewPwd) { showNotification("error", "新密码不一致"); return; }
    if (newPwd.length < 8) { showNotification("error", "密码至少 8 位"); return; }
    if (countdown > 0) return;
    setLoading(true);
    try {
      await zoo.changePassword({ old_password: pwd, new_password: newPwd });
      showNotification("success", "密码修改成功");
      setShowChangePwd(false);
      reset();
    } catch (e) {
      handleRateLimitError(e);
    } finally { setLoading(false); }
  };

  const handleDeriveAccount = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const account = await zoo.deriveNextAccount({ password: pwd, name: newAccountName });
      addAccount(account);
      showNotification("success", `账户 "${account.name}" 创建成功`);
      setShowDeriveModal(false);
      reset();
    } catch (e) {
      handleRateLimitError(e);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="text-muted hover:text-white text-xl">←</button>
        <h1 className="text-base font-semibold">安全管理</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">
        {/* Derive new account */}
        <div className="bg-bg-card rounded-2xl p-4">
          <p className="text-sm font-medium mb-1">添加账户（HD 派生）</p>
          <p className="text-xs text-muted mb-3">从同一助记词派生新的以太坊账户</p>
          <Button size="sm" variant="secondary" onClick={() => setShowDeriveModal(true)}>派生新账户</Button>
        </div>

        {/* Export mnemonic */}
        <div className="bg-bg-card rounded-2xl p-4">
          <p className="text-sm font-medium mb-1">导出助记词</p>
          <p className="text-xs text-muted mb-3">请在安全环境中操作，切勿截图</p>
          <Button size="sm" variant="secondary" onClick={() => { setShowMnemonic(true); reset(); }}>查看助记词</Button>
        </div>

        {/* Export private key */}
        {currentAccount?.type !== "watch" && (
          <div className="bg-bg-card rounded-2xl p-4">
            <p className="text-sm font-medium mb-1">导出私钥</p>
            <p className="text-xs text-muted mb-3">当前账户：{currentAccount?.name} (ETH)</p>
            <Button size="sm" variant="secondary" onClick={() => { setShowPrivKey(true); reset(); }}>导出私钥</Button>
          </div>
        )}

        {/* Change password */}
        <div className="bg-bg-card rounded-2xl p-4">
          <p className="text-sm font-medium mb-1">修改密码</p>
          <p className="text-xs text-muted mb-3">修改后所有密钥将用新密码重新加密</p>
          <Button size="sm" variant="secondary" onClick={() => { setShowChangePwd(true); reset(); }}>修改密码</Button>
        </div>
      </div>

      {/* Export mnemonic modal */}
      <Modal open={showMnemonic} onClose={() => { setShowMnemonic(false); reset(); }} title="导出助记词">
        {mnemonicWords.length === 0 ? (
          <div className="flex flex-col gap-4">
            <Input type="password" label="钱包密码" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus
              disabled={countdown > 0} />
            {countdown > 0 && (
              <p className="text-xs text-warning text-center">已锁定，请 {countdown} 秒后重试</p>
            )}
            <Button fullWidth loading={loading} onClick={handleExportMnemonic} disabled={!pwd || countdown > 0}>
              确认导出
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {mnemonicWords.map((w, i) => (
                <div key={i} className="bg-bg-hover rounded-lg px-2 py-1.5 flex items-center gap-1">
                  <span className="text-xs text-muted">{i + 1}.</span>
                  <span className="text-xs font-mono">{w}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-warning text-center">请安全保存，关闭后不再显示</p>
            <Button fullWidth onClick={() => { setShowMnemonic(false); reset(); }}>我已安全保存</Button>
          </div>
        )}
      </Modal>

      {/* Export private key modal */}
      <Modal open={showPrivKey} onClose={() => { setShowPrivKey(false); reset(); }} title="导出私钥">
        {!privateKey ? (
          <div className="flex flex-col gap-4">
            <Input type="password" label="钱包密码" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus
              disabled={countdown > 0} />
            {countdown > 0 && (
              <p className="text-xs text-warning text-center">已锁定，请 {countdown} 秒后重试</p>
            )}
            <Button fullWidth loading={loading} onClick={handleExportPrivKey} disabled={!pwd || countdown > 0}>
              确认导出
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-bg-hover rounded-xl p-3 relative">
              <p className="font-mono text-xs break-all select-all leading-5">{privateKey}</p>
              <CopyButton text={privateKey} label="复制" className="absolute top-2 right-2" />
            </div>
            <p className="text-xs text-warning text-center">
              妥善保管，任何人持有私钥可控制资产。将在 {privKeyClear} 秒后自动清除。
            </p>
            <div className="w-full bg-bg-card rounded-full h-1">
              <div
                className="bg-warning rounded-full h-1 transition-all"
                style={{ width: `${(privKeyClear / PRIVKEY_AUTO_CLEAR_SECS) * 100}%` }}
              />
            </div>
            <Button fullWidth onClick={() => { setShowPrivKey(false); reset(); }}>立即关闭</Button>
          </div>
        )}
      </Modal>

      {/* Change password modal */}
      <Modal open={showChangePwd} onClose={() => { setShowChangePwd(false); reset(); }} title="修改密码">
        <div className="flex flex-col gap-4">
          <Input type="password" label="当前密码" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus
            disabled={countdown > 0} />
          <Input type="password" label="新密码" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          <Input type="password" label="确认新密码" value={confirmNewPwd} onChange={(e) => setConfirmNewPwd(e.target.value)}
            error={confirmNewPwd && confirmNewPwd !== newPwd ? "密码不一致" : undefined} />
          {countdown > 0 && (
            <p className="text-xs text-warning text-center">已锁定，请 {countdown} 秒后重试</p>
          )}
          <Button fullWidth loading={loading} onClick={handleChangePassword}
            disabled={!pwd || !newPwd || !confirmNewPwd || countdown > 0}>
            确认修改
          </Button>
        </div>
      </Modal>

      {/* Derive account modal */}
      <Modal open={showDeriveModal} onClose={() => { setShowDeriveModal(false); reset(); }} title="派生新账户">
        <div className="flex flex-col gap-4">
          <Input label="账户名称" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Account 2" />
          <Input type="password" label="钱包密码" value={pwd} onChange={(e) => setPwd(e.target.value)}
            disabled={countdown > 0} />
          {countdown > 0 && (
            <p className="text-xs text-warning text-center">已锁定，请 {countdown} 秒后重试</p>
          )}
          <Button fullWidth loading={loading} onClick={handleDeriveAccount} disabled={!pwd || countdown > 0}>
            派生账户
          </Button>
        </div>
      </Modal>
    </div>
  );
};
