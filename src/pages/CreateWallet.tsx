import React, { useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

type Step = 1 | 2 | 3;

/* Randomly pick 3 word indices to quiz the user */
function pickQuizIndices(words: string[]): number[] {
  const pool = Array.from({ length: words.length }, (_, i) => i);
  const picked: number[] = [];
  while (picked.length < 3) {
    const idx = Math.floor(Math.random() * pool.length);
    const [removed] = pool.splice(idx, 1);
    picked.push(removed);
  }
  return picked.sort((a, b) => a - b);
}

export const CreateWallet: React.FC = () => {
  const { setAccounts, setIsUnlocked } = useWalletStore();
  const { navigate, showNotification } = useUiStore();

  const [step, setStep] = useState<Step>(1);
  const [words, setWords] = useState<string[]>([]);
  const [quizIdx, setQuizIdx] = useState<number[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [accountName, setAccountName] = useState("Account 1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: generate mnemonic ───────────────────────────────────────────────
  React.useEffect(() => {
    zoo.generateMnemonic().then(setWords).catch(console.error);
  }, []);

  const goToStep2 = () => {
    setQuizIdx(pickQuizIndices(words));
    setQuizAnswers({});
    setStep(2);
  };

  // ── Step 2: quiz verification ───────────────────────────────────────────────
  const verifyQuiz = () => {
    const allCorrect = quizIdx.every(
      (i) =>
        quizAnswers[i]?.trim().toLowerCase() === words[i]?.toLowerCase(),
    );
    if (!allCorrect) {
      setError("助记词验证失败，请仔细检查");
      return;
    }
    setError("");
    setStep(3);
  };

  // ── Step 3: set password & create ──────────────────────────────────────────
  const passwordStrength = (pwd: string): string => {
    if (pwd.length < 8) return "弱";
    if (pwd.length < 12 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
      return "中";
    return "强";
  };

  const strengthColor = {
    弱: "text-danger",
    中: "text-warning",
    强: "text-success",
  } as const;

  const handleCreate = async () => {
    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirmPwd) {
      setError("两次密码不一致");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const account = await zoo.createWalletFromMnemonic({
        words,
        password,
        name: accountName || "Account 1",
      });
      setAccounts([account]);
      setIsUnlocked(true);
      navigate("dashboard");
    } catch (e) {
      const msg = e instanceof IpcError ? e.message : "创建失败，请重试";
      showNotification("error", msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() =>
            step === 1 ? navigate("welcome") : setStep((s) => (s - 1) as Step)
          }
          className="text-muted hover:text-white text-xl"
        >
          ←
        </button>
        <h1 className="text-base font-semibold">
          {step === 1 && "备份助记词"}
          {step === 2 && "验证助记词"}
          {step === 3 && "设置密码"}
        </h1>
        <span className="ml-auto text-xs text-muted">{step}/3</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Step 1: Show mnemonic */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted">
              请将以下 12 个助记词按顺序抄写在纸上妥善保管，<span className="text-warning">切勿截图或存入云端</span>。
            </p>
            <div className="grid grid-cols-3 gap-2">
              {words.map((w, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-bg-card rounded-lg px-3 py-2"
                >
                  <span className="text-xs text-muted w-4">{i + 1}.</span>
                  <span className="text-sm font-mono">{w}</span>
                </div>
              ))}
            </div>
            <Button fullWidth onClick={goToStep2} disabled={words.length === 0}>
              我已抄写，继续
            </Button>
          </div>
        )}

        {/* Step 2: Quiz */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <p className="text-sm text-muted">
              请填写对应位置的助记词，验证您已正确备份。
            </p>
            {quizIdx.map((idx) => (
              <Input
                key={idx}
                label={`第 ${idx + 1} 个词`}
                placeholder="请输入"
                value={quizAnswers[idx] ?? ""}
                onChange={(e) =>
                  setQuizAnswers((prev) => ({
                    ...prev,
                    [idx]: e.target.value,
                  }))
                }
                error={
                  quizAnswers[idx] !== undefined &&
                  quizAnswers[idx].trim().toLowerCase() !==
                    words[idx]?.toLowerCase()
                    ? "不正确"
                    : undefined
                }
              />
            ))}
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button
              fullWidth
              onClick={verifyQuiz}
              disabled={quizIdx.some((i) => !quizAnswers[i])}
            >
              验证并继续
            </Button>
          </div>
        )}

        {/* Step 3: Password */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              设置一个强密码来保护您的钱包。<span className="text-warning">密码无法找回</span>，请务必记住。
            </p>
            <Input
              label="账户名称"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Account 1"
            />
            <div>
              <Input
                label="钱包密码"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 8 位"
              />
              {password && (
                <p
                  className={`text-xs mt-1 ${strengthColor[passwordStrength(password) as keyof typeof strengthColor]}`}
                >
                  强度：{passwordStrength(password)}
                </p>
              )}
            </div>
            <Input
              label="确认密码"
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder="再次输入密码"
              error={
                confirmPwd && confirmPwd !== password
                  ? "两次密码不一致"
                  : undefined
              }
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button
              fullWidth
              size="lg"
              loading={loading}
              onClick={handleCreate}
              disabled={!password || !confirmPwd}
            >
              创建钱包
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
