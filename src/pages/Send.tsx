import React, { useEffect, useState } from "react";
import { zoo, IpcError, type SendEthArgs } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { PasswordModal } from "../components/ui/PasswordModal";
import type { GasOptions, GasOption, EthTxPreview } from "../types";

type GasTier = "slow" | "medium" | "fast";
const isValidEthAddress = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);

const gasTierLabels: Record<GasTier, { label: string; icon: string }> = {
  slow:   { label: "慢速", icon: "🐢" },
  medium: { label: "标准", icon: "⚡" },
  fast:   { label: "快速", icon: "🚀" },
};

export const Send: React.FC = () => {
  const { currentAccount, tokenBalances, balance } = useWalletStore();
  const { navigate, showNotification, setLastSentHash } = useUiStore();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [gasTier, setGasTier] = useState<GasTier>("medium");
  const [gasOptions, setGasOptions] = useState<GasOptions | null>(null);
  const [loadingGas, setLoadingGas] = useState(false);
  const [preview, setPreview] = useState<EthTxPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [sending, setSending] = useState(false);

  const toError = to && !isValidEthAddress(to) ? "无效的以太坊地址 (0x…)" : undefined;
  const amountError = amount && (isNaN(Number(amount)) || Number(amount) <= 0) ? "请输入有效金额" : undefined;
  const canProceed = isValidEthAddress(to) && amount && !amountError && currentAccount?.id;
  const ethAddress = currentAccount?.addresses?.ETH ?? "";
  const selectedGasOpt: GasOption | undefined = gasOptions?.[gasTier];

  const currentTokenInfo = selectedToken === "ETH"
    ? null
    : tokenBalances.find(t => t.contractAddress === selectedToken);

  useEffect(() => {
    setLoadingGas(true);
    zoo.eth.getGasOptions()
      .then(setGasOptions)
      .catch(() => showNotification("error", "Gas 费率加载失败"))
      .finally(() => setLoadingGas(false));
  }, [showNotification]);

  useEffect(() => {
    if (!isValidEthAddress(to) || !amount || !ethAddress) { setPreview(null); return; }
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) { setPreview(null); return; }
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const wei = BigInt(Math.floor(n * 1e18));
        const p = await zoo.eth.previewTransaction({ from: ethAddress, to, value: `0x${wei.toString(16)}`, data: "" });
        setPreview(p);
      } catch { setPreview(null); }
      finally { setLoadingPreview(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [to, amount, ethAddress]);

  const handleSend = async (password: string) => {
    if (!currentAccount?.id) return;
    setSending(true);
    try {
      if (selectedToken === "ETH") {
        const args: SendEthArgs = {
          account_id: currentAccount.id, password, to, amount,
          max_fee_gwei: selectedGasOpt?.maxFeeGwei ?? "0",
          priority_fee_gwei: selectedGasOpt?.priorityFeeGwei ?? "0",
        };
        const result = await zoo.eth.sendTransaction(args);
        setLastSentHash(result.hash);
      } else {
        if (!currentTokenInfo) throw new Error("代币不存在");
        const result = await zoo.eth.sendToken({
          account_id: currentAccount.id, password,
          contract_address: currentTokenInfo.contractAddress, to, amount,
          decimals: currentTokenInfo.decimals,
          max_fee_gwei: selectedGasOpt?.maxFeeGwei ?? "0",
          priority_fee_gwei: selectedGasOpt?.priorityFeeGwei ?? "0",
        });
        setLastSentHash(result.hash);
      }
      setShowPwdModal(false);
      navigate("send-success");
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "发送失败");
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-forest">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1 className="text-base font-semibold text-fog">发送</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-4">
        {/* Token selector */}
        {tokenBalances.length > 0 && (
          <div>
            <p className="label mb-2">选择代币</p>
            <div className="flex gap-2 flex-wrap">
              {["ETH", ...tokenBalances.map(t => t.contractAddress)].map((id) => {
                const sym = id === "ETH" ? "ETH" : tokenBalances.find(t => t.contractAddress === id)?.symbol ?? id.slice(0,6);
                return (
                  <button key={id} onClick={() => setSelectedToken(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-[120ms] ${
                      selectedToken === id
                        ? "bg-neon/10 border-neon/50 text-neon"
                        : "border-ash/40 text-slate hover:border-canopy/50 hover:text-fog"
                    }`}>
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* To address */}
        <Input label="收款地址" placeholder="0x..." value={to} onChange={e => setTo(e.target.value)} error={toError} />

        {/* Amount + Max */}
        <div>
          <Input
            label={`发送金额 (${selectedToken === "ETH" ? "ETH" : currentTokenInfo?.symbol ?? ""})`}
            placeholder="0.001" type="number" min="0" step="any"
            value={amount} onChange={e => setAmount(e.target.value)}
            error={amountError}
          />
          {selectedToken === "ETH" && balance && (
            <button
              onClick={() => {
                const max = Math.max(0, parseFloat(balance) - 0.001);
                setAmount(max > 0 ? max.toFixed(6) : "0");
              }}
              className="mt-1 text-xs text-neon hover:text-brand-light transition-colors"
            >
              MAX {balance} ETH
            </button>
          )}
        </div>

        {/* Gas options */}
        <div>
          <p className="label mb-2">
            网络手续费
            {loadingGas && <span className="ml-2 text-ash font-normal normal-case">加载中…</span>}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["slow","medium","fast"] as GasTier[]).map(tier => {
              const opt = gasOptions?.[tier];
              const { label, icon } = gasTierLabels[tier];
              const active = gasTier === tier;
              return (
                <button key={tier} onClick={() => setGasTier(tier)}
                  className={`flex flex-col items-center rounded-xl p-3 border transition-all duration-[120ms] ${
                    active
                      ? "border-neon/50 bg-neon/5 shadow-glow-sm"
                      : "border-canopy/25 bg-midnight hover:border-canopy/45"
                  }`}>
                  <span className="text-base mb-1">{icon}</span>
                  <p className={`text-xs font-semibold ${active ? "text-neon" : "text-fog"}`}>{label}</p>
                  {loadingGas ? (
                    <div className="h-3 w-14 bg-coal/60 rounded animate-pulse mt-1" />
                  ) : opt ? (
                    <>
                      <p className="text-2xs text-slate mt-0.5">{parseFloat(opt.gwei).toFixed(2)} Gwei</p>
                      <p className="text-2xs text-ash">{opt.estimatedTime}</p>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        {(preview || loadingPreview) && (
          <div className="bg-midnight border border-canopy/20 rounded-xl px-4 py-3 text-xs space-y-1.5">
            {loadingPreview ? (
              <p className="text-slate animate-pulse">正在分析交易…</p>
            ) : preview ? (
              <>
                {preview.isContract && (
                  <div className="flex items-center gap-1.5 text-warning">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    目标是合约地址
                  </div>
                )}
                {preview.decoded && (
                  <p className="text-slate">调用: <span className="text-fog font-medium">{preview.decoded.name}</span></p>
                )}
                <p className="text-slate">Gas 估算: <span className="text-fog font-mono">{preview.gasEstimate}</span></p>
              </>
            ) : null}
          </div>
        )}

        {/* Notice */}
        <div className="flex items-start gap-2 bg-midnight border border-canopy/20 rounded-xl px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#89989B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-xs text-slate space-y-1">
            <p>收款地址一旦确认无法撤回</p>
            <p>Gas 费用从 ETH 余额中扣除</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6">
        <Button fullWidth size="lg" disabled={!canProceed} onClick={() => setShowPwdModal(true)}>
          预览并发送
        </Button>
      </div>

      <PasswordModal
        open={showPwdModal}
        title="确认发送"
        description={`发送 ${amount} ${selectedToken === "ETH" ? "ETH" : currentTokenInfo?.symbol ?? ""} 到 ${to.slice(0, 10)}…${to.slice(-8)}`}
        loading={sending}
        onSubmit={handleSend}
        onCancel={() => setShowPwdModal(false)}
      />
    </div>
  );
};
