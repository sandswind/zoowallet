import React, { useEffect, useState } from "react";
import { zoo, IpcError, type SendEthArgs } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { PasswordModal } from "../components/ui/PasswordModal";
import type { GasOptions, GasOption, EthTxPreview } from "../types";

type GasTier = "slow" | "medium" | "fast";

function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export const Send: React.FC = () => {
  const { currentAccount, tokenBalances, balance } = useWalletStore();
  const { navigate, showNotification, setLastSentHash } = useUiStore();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState<string>("ETH");
  const [gasTier, setGasTier] = useState<GasTier>("medium");
  const [gasOptions, setGasOptions] = useState<GasOptions | null>(null);
  const [loadingGas, setLoadingGas] = useState(false);
  const [preview, setPreview] = useState<EthTxPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [sending, setSending] = useState(false);

  const toError = to && !isValidEthAddress(to) ? "无效的以太坊地址" : undefined;
  const amountError = amount && (isNaN(Number(amount)) || Number(amount) <= 0) ? "请输入有效金额" : undefined;
  const canProceed = isValidEthAddress(to) && amount && !amountError && currentAccount?.id;
  const ethAddress = currentAccount?.addresses?.ETH ?? "";

  // Fetch gas options on mount
  useEffect(() => {
    setLoadingGas(true);
    zoo.eth.getGasOptions()
      .then(setGasOptions)
      .catch(() => showNotification("error", "Gas 费率加载失败"))
      .finally(() => setLoadingGas(false));
  }, [showNotification]);

  // Preview when address + amount are valid — pass actual amount as Wei
  useEffect(() => {
    if (!isValidEthAddress(to) || !amount || !ethAddress) { setPreview(null); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { setPreview(null); return; }
    const timer = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        // Convert ETH amount to hex Wei for preview
        const weiValue = BigInt(Math.floor(amountNum * 1e18));
        const p = await zoo.eth.previewTransaction({
          from: ethAddress,
          to,
          value: `0x${weiValue.toString(16)}`,
          data: "",
        });
        setPreview(p);
      } catch { setPreview(null); }
      finally { setLoadingPreview(false); }
    }, 500);
    return () => clearTimeout(timer);
  }, [to, amount, ethAddress]);

  const selectedGasOpt: GasOption | undefined = gasOptions?.[gasTier];

  const handleSend = async (password: string) => {
    if (!currentAccount?.id) return;
    setSending(true);
    try {
      if (selectedToken === "ETH") {
        const args: SendEthArgs = {
          account_id: currentAccount.id,
          password,
          to,
          amount,
          max_fee_gwei: selectedGasOpt?.maxFeeGwei ?? "0",
          priority_fee_gwei: selectedGasOpt?.priorityFeeGwei ?? "0",
        };
        const result = await zoo.eth.sendTransaction(args);
        setLastSentHash(result.hash);
      } else {
        const token = tokenBalances.find(t => t.contractAddress === selectedToken);
        if (!token) throw new Error("代币不存在");
        const result = await zoo.eth.sendToken({
          account_id: currentAccount.id, password,
          contract_address: token.contractAddress, to, amount,
          decimals: token.decimals,
          max_fee_gwei: selectedGasOpt?.maxFeeGwei ?? "0",
          priority_fee_gwei: selectedGasOpt?.priorityFeeGwei ?? "0",
        });
        setLastSentHash(result.hash);
      }
      setShowPwdModal(false);
      navigate("send-success");
    } catch (e) {
      showNotification("error", e instanceof IpcError ? e.message : "发送失败，请重试");
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("dashboard")} className="text-muted hover:text-white text-xl">←</button>
        <h1 className="text-base font-semibold">发送</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-4">
        {/* Token selector */}
        {tokenBalances.length > 0 && (
          <div>
            <label className="text-xs font-medium text-muted uppercase tracking-wide">选择代币</label>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <button onClick={() => setSelectedToken("ETH")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedToken === "ETH" ? "bg-brand border-brand text-white" : "border-border text-muted hover:text-white"}`}>
                ETH
              </button>
              {tokenBalances.map(t => (
                <button key={t.contractAddress} onClick={() => setSelectedToken(t.contractAddress)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedToken === t.contractAddress ? "bg-brand border-brand text-white" : "border-border text-muted hover:text-white"}`}>
                  {t.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input label="收款地址" placeholder="0x..." value={to} onChange={(e) => setTo(e.target.value)} error={toError} />
        <Input label={`发送金额 (${selectedToken === "ETH" ? "ETH" : tokenBalances.find(t => t.contractAddress === selectedToken)?.symbol ?? ""})`}
          placeholder="0.001" type="number" min="0" step="any"
          value={amount} onChange={(e) => setAmount(e.target.value)} error={amountError} />
        {selectedToken === "ETH" && balance && (
          <button
            type="button"
            onClick={() => {
              // Leave ~0.001 ETH for gas
              const maxEth = Math.max(0, parseFloat(balance) - 0.001);
              setAmount(maxEth > 0 ? maxEth.toFixed(6) : "0");
            }}
            className="text-xs text-brand hover:text-brand-light -mt-2 self-end"
          >
            最大 {balance} ETH
          </button>
        )}

        {/* Gas options */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wide">Gas 费率</label>
            {loadingGas && <span className="text-xs text-muted animate-pulse">加载中…</span>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["slow","medium","fast"] as GasTier[]).map((tier) => {
              const opt = gasOptions?.[tier];
              const labels = { slow: "慢速", medium: "标准", fast: "快速" };
              return (
                <button key={tier} onClick={() => setGasTier(tier)}
                  className={`flex flex-col items-center rounded-xl p-2 border transition-colors ${gasTier === tier ? "border-brand bg-brand/10" : "border-border bg-bg-card"}`}>
                  <p className="text-xs font-medium">{labels[tier]}</p>
                  {loadingGas ? (
                    <div className="h-3 w-12 bg-bg-hover rounded animate-pulse mt-1" />
                  ) : opt ? (
                    <>
                      <p className="text-xs text-muted mt-0.5">{parseFloat(opt.gwei).toFixed(2)} Gwei</p>
                      <p className="text-xs text-muted">{opt.estimatedTime}</p>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview panel */}
        {(preview || loadingPreview) && (
          <div className="bg-bg-card rounded-xl p-3 text-xs text-muted space-y-1">
            {loadingPreview ? (
              <p className="animate-pulse">分析交易中…</p>
            ) : preview ? (
              <>
                {preview.isContract && <p className="text-warning">⚠️ 目标是合约地址</p>}
                {preview.decoded && (
                  <p>调用方法：<span className="text-white">{preview.decoded.name}</span></p>
                )}
                <p>Gas 估算：{preview.gasEstimate}</p>
              </>
            ) : null}
          </div>
        )}

        <div className="bg-bg-card rounded-xl p-3 text-xs text-muted space-y-1">
          <p>• 请仔细核对收款地址，转账后无法撤回</p>
          <p>• Gas 费用从 ETH 余额中扣除</p>
        </div>
      </div>

      <div className="px-6 pb-6">
        <Button fullWidth size="lg" disabled={!canProceed} onClick={() => setShowPwdModal(true)}>下一步</Button>
      </div>

      <PasswordModal open={showPwdModal} title="确认发送"
        description={`发送 ${amount} ${selectedToken === "ETH" ? "ETH" : tokenBalances.find(t => t.contractAddress === selectedToken)?.symbol ?? ""} 到 ${to.slice(0, 8)}…${to.slice(-6)}`}
        loading={sending} onSubmit={handleSend} onCancel={() => setShowPwdModal(false)} />
    </div>
  );
};
