import React, { useState } from "react";
import { zoo, IpcError } from "../lib/ipc";
import { useWalletStore } from "../store/walletStore";
import { useUiStore } from "../store/uiStore";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { PasswordModal } from "../components/ui/PasswordModal";

function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export const Send: React.FC = () => {
  const { currentAccount } = useWalletStore();
  const { navigate, showNotification, setLastSentHash } = useUiStore();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [sending, setSending] = useState(false);

  const toError =
    to && !isValidEthAddress(to) ? "无效的以太坊地址" : undefined;
  const amountError =
    amount && (isNaN(Number(amount)) || Number(amount) <= 0)
      ? "请输入有效金额"
      : undefined;

  const canProceed =
    isValidEthAddress(to) && amount && !amountError && currentAccount?.id;

  const handleSend = async (password: string) => {
    if (!currentAccount?.id) return;
    setSending(true);
    try {
      const result = await zoo.eth.sendTransaction({
        account_id: currentAccount.id,
        password,
        to,
        amount,
        max_fee_gwei: "0",   // backend uses auto-estimated value in MVP
        priority_fee_gwei: "0",
      });
      setLastSentHash(result.hash);
      setShowPwdModal(false);
      navigate("send-success");
    } catch (e) {
      const msg = e instanceof IpcError ? e.message : "发送失败，请重试";
      showNotification("error", msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("dashboard")}
          className="text-muted hover:text-white text-xl"
        >
          ←
        </button>
        <h1 className="text-base font-semibold">发送 ETH</h1>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-5 overflow-y-auto pb-6">
        <Input
          label="收款地址"
          placeholder="0x..."
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={toError}
        />
        <Input
          label="发送金额 (ETH)"
          placeholder="0.001"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={amountError}
        />
        <div className="bg-bg-card rounded-xl p-4 text-xs text-muted space-y-1">
          <p>• Gas 费将根据当前网络状况自动计算</p>
          <p>• 请确认地址正确，转账后无法撤回</p>
        </div>
      </div>

      <div className="px-6 pb-6">
        <Button
          fullWidth
          size="lg"
          disabled={!canProceed}
          onClick={() => setShowPwdModal(true)}
        >
          下一步
        </Button>
      </div>

      <PasswordModal
        open={showPwdModal}
        title="确认发送"
        description={`发送 ${amount} ETH 到 ${to.slice(0, 8)}…${to.slice(-6)}`}
        loading={sending}
        onSubmit={handleSend}
        onCancel={() => setShowPwdModal(false)}
      />
    </div>
  );
};
