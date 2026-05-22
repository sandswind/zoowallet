import React, { useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type Step = 1 | 2 | 3;

function pickQuizIndices(words: string[]): number[] {
  const pool = Array.from({ length: words.length }, (_, i) => i);
  const picked: number[] = [];
  while (picked.length < 3) {
    const idx = Math.floor(Math.random() * pool.length);
    const [r] = pool.splice(idx, 1);
    picked.push(r);
  }
  return picked.sort((a, b) => a - b);
}

const steps = [
  { n: 1, label: "备份助记词" },
  { n: 2, label: "验证词序" },
  { n: 3, label: "设置密码" },
];

export const CreateWallet: React.FC = () => {
  const { setAccounts, setIsUnlocked } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const [step, setStep] = useState<Step>(1);
  const [words, setWords] = useState<string[]>([]);
  const [quizIdx, setQuizIdx] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [accountName, setAccountName] = useState("Account 1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    zoo.generateMnemonic().then(setWords).catch(console.error);
  }, []);

  const goStep2 = () => {
    setQuizIdx(pickQuizIndices(words));
    setAnswers({});
    setStep(2);
  };

  const verifyQuiz = () => {
    const ok = quizIdx.every(i => answers[i]?.trim().toLowerCase() === words[i]?.toLowerCase());
    if (!ok) { setError("验证失败，请检查填写的词序"); return; }
    setError("");
    setStep(3);
  };

  const strength = (p: string) => {
    if (p.length < 8) return { label: "弱", color: "text-danger" };
    if (p.length < 12 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: "中", color: "text-warning" };
    return { label: "强", color: "text-neon" };
  };

  const handleCreate = async () => {
    if (password.length < 8) { setError("密码至少 8 位"); return; }
    if (password !== confirmPwd) { setError("两次密码不一致"); return; }
    setError("");
    setLoading(true);
    try {
      const account = await zoo.createWalletFromMnemonic({ words, password, name: accountName || "Account 1" });
      setAccounts([account]);
      setIsUnlocked(true);
      navigate("dashboard");
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "创建失败");
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-forest">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => step === 1 ? navigate("welcome") : setStep(s => (s - 1) as Step)}
          className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold text-fog">{steps[step - 1].label}</h1>
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-1.5">
          {steps.map(s => (
            <div key={s.n} className={`w-2 h-2 rounded-full transition-colors ${s.n === step ? "bg-neon" : s.n < step ? "bg-canopy" : "bg-ash/40"}`} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">

        {/* ── Step 1: Show mnemonic ────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="bg-midnight border border-warning/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFC010" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <p className="text-xs text-warning/80 leading-relaxed">请抄写以下 12 个助记词，勿截图或存入云端。丢失将无法恢复资产。</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {words.map((w, i) => (
                <div key={i} className="bg-midnight border border-canopy/25 rounded-lg px-2 py-2 flex items-center gap-1.5">
                  <span className="text-2xs text-ash w-5 text-right">{i + 1}</span>
                  <span className="text-sm font-mono text-fog">{w}</span>
                </div>
              ))}
            </div>

            <Button fullWidth size="lg" onClick={goStep2} disabled={words.length === 0}>
              已抄写，继续验证
            </Button>
          </div>
        )}

        {/* ── Step 2: Quiz ────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate">请填写以下位置的助记词，验证您已正确备份：</p>

            {quizIdx.map(idx => (
              <Input
                key={idx}
                label={`第 ${idx + 1} 个助记词`}
                placeholder={`第 ${idx + 1} 个词`}
                value={answers[idx] ?? ""}
                onChange={e => setAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                error={
                  answers[idx] !== undefined && answers[idx].trim().toLowerCase() !== words[idx]?.toLowerCase()
                    ? "不正确" : undefined
                }
              />
            ))}

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button fullWidth size="lg" onClick={verifyQuiz} disabled={quizIdx.some(i => !answers[i])}>
              验证并继续
            </Button>
          </div>
        )}

        {/* ── Step 3: Password ────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate leading-relaxed">设置一个强密码来保护您的钱包。<span className="text-warning">密码无法找回</span>，请务必记住。</p>

            <Input label="账户名称" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account 1" />

            <div>
              <Input label="钱包密码（≥ 8 位）" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入密码" />
              {password && (
                <p className={`text-xs mt-1 font-medium ${strength(password).color}`}>
                  强度：{strength(password).label}
                </p>
              )}
            </div>

            <Input label="确认密码" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="再次输入"
              error={confirmPwd && confirmPwd !== password ? "两次密码不一致" : undefined} />

            {error && <p className="text-xs text-danger">{error}</p>}

            <Button fullWidth size="lg" loading={loading} onClick={handleCreate} disabled={!password || !confirmPwd}>
              创建钱包
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
