import React, { useState } from "react";
import { useUiStore } from "../store/uiStore";
import { useWalletStore } from "../store/walletStore";
import { useNetworkStore } from "../store/networkStore";
import { zoo } from "../lib/ipc";
import type { NetworkConfig } from "../types";

// ── Shared primitives ─────────────────────────────────────────────────────────

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-midnight border border-canopy/20 rounded-xl overflow-hidden">
    <p className="label px-4 pt-3 pb-2 border-b border-canopy/10">{title}</p>
    {children}
  </div>
);

const Row: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-canopy/10 last:border-0">
    <p className="text-sm text-fog">{label}</p>
    {value && <p className="text-sm text-slate">{value}</p>}
    {children}
  </div>
);

const Toggle: React.FC<{ on: boolean; onToggle: () => void }> = ({ on, onToggle }) => (
  <button
    onClick={onToggle}
    role="switch"
    aria-checked={on}
    className={`relative w-11 h-6 rounded-full transition-colors duration-[200ms] focus-visible:shadow-glow ${on ? "bg-neon" : "bg-ash/50"}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-[200ms] ${on ? "translate-x-5" : ""}`} />
  </button>
);

// ── Chain badge colours ───────────────────────────────────────────────────────

const CHAIN_COLOURS: Record<string, string> = {
  ETH:     "bg-blue-500/10 text-blue-400 border-blue-500/30",
  BASE:    "bg-blue-600/10 text-blue-300 border-blue-600/30",
  ARB:     "bg-sky-500/10 text-sky-400 border-sky-500/30",
  OP:      "bg-red-500/10 text-red-400 border-red-500/30",
  BSC:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  POLYGON: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  AVAX:    "bg-red-600/10 text-red-400 border-red-600/30",
  LINEA:   "bg-gray-400/10 text-gray-300 border-gray-400/30",
  ZKSYNC:  "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  SCROLL:  "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

const chainColour = (id: string) =>
  CHAIN_COLOURS[id] ?? "bg-neon/10 text-neon border-neon/30";

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  id: "", chainId: "", name: "", rpcUrl: "", symbol: "", explorerUrl: "",
};

// ── Main component ────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const { navigate, autoLockMinutes, setAutoLockMinutes } = useUiStore();
  const { isBalanceHidden, setIsBalanceHidden } = useWalletStore();
  const {
    networks,
    activeNetworkId,
    setActiveNetworkId,
    upsertNetwork,
    removeNetwork,
  } = useNetworkStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);

  const lockOptions = [
    { label: "1 分钟", value: 1 },
    { label: "5 分钟", value: 5 },
    { label: "15 分钟", value: 15 },
    { label: "30 分钟", value: 30 },
    { label: "永不", value: 0 },
  ];

  // ── Switch network ────────────────────────────────────────────────────────

  const handleSelectNetwork = async (net: NetworkConfig) => {
    if (net.id === activeNetworkId) return;
    setSwitching(net.id);
    try {
      await zoo.network.setActive(net.id);
      setActiveNetworkId(net.id);
    } catch {
      // Rust not available in dev preview — apply locally only
      setActiveNetworkId(net.id);
    } finally {
      setSwitching(null);
    }
  };

  // ── Add custom network ────────────────────────────────────────────────────

  const handleAddNetwork = async () => {
    setFormError("");
    const id = form.id.trim().toUpperCase();
    const chainId = parseInt(form.chainId, 10);
    const rpcUrl = form.rpcUrl.trim();
    const name = form.name.trim();
    const symbol = form.symbol.trim().toUpperCase();

    if (!id)        return setFormError("网络 ID 不能为空");
    if (!name)      return setFormError("网络名称不能为空");
    if (isNaN(chainId) || chainId <= 0) return setFormError("Chain ID 必须为正整数");
    if (!rpcUrl.startsWith("http")) return setFormError("RPC URL 格式无效");
    if (!symbol)    return setFormError("原生代币符号不能为空");

    const cfg: NetworkConfig = {
      id,
      chainId,
      name,
      rpcUrls: [rpcUrl],
      symbol,
      explorerUrl: form.explorerUrl.trim() || undefined,
      isCustom: true,
    };

    try {
      await zoo.network.register(cfg);
    } catch {
      // Fallback: register only on frontend if Tauri unavailable
    }
    upsertNetwork(cfg);
    setForm(EMPTY_FORM);
    setShowAddForm(false);
  };

  const handleRemoveNetwork = async (net: NetworkConfig) => {
    try { await zoo.network.remove(net.id); } catch { /* ignore */ }
    removeNetwork(net.id);
  };

  const updateForm = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-forest">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("dashboard")}
          className="w-8 h-8 rounded-lg hover:bg-coal/60 flex items-center justify-center text-slate hover:text-fog transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 className="text-base font-semibold text-fog">设置</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 flex flex-col gap-3">

        {/* ── Networks ─────────────────────────────────────────────────────── */}
        <SectionCard title="网络">
          {/* Network list */}
          <div className="divide-y divide-canopy/10">
            {networks.map((net) => {
              const isActive = net.id === activeNetworkId;
              const isLoading = switching === net.id;
              return (
                <div
                  key={net.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    isActive ? "bg-neon/5" : "hover:bg-coal/30"
                  }`}
                  onClick={() => handleSelectNetwork(net)}
                >
                  {/* Active indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                    isActive ? "bg-neon" : "bg-ash/30"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-fog truncate">{net.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${chainColour(net.id)}`}>
                        {net.symbol}
                      </span>
                      {net.isCustom && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-canopy/30 text-slate">
                          自定义
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ash mt-0.5">Chain ID: {net.chainId}</p>
                  </div>

                  {isLoading ? (
                    <svg className="w-4 h-4 text-neon animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20"/>
                    </svg>
                  ) : isActive ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-neon flex-shrink-0">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : net.isCustom ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveNetwork(net); }}
                      className="text-ash hover:text-red-400 transition-colors p-1"
                      title="删除自定义网络"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Add custom network toggle */}
          <div className="px-4 py-3">
            <button
              onClick={() => { setShowAddForm((v) => !v); setFormError(""); }}
              className="flex items-center gap-1.5 text-xs text-neon hover:text-neon/80 transition-colors font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {showAddForm ? "取消" : "添加自定义网络"}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="px-4 pb-4 flex flex-col gap-2 border-t border-canopy/10 pt-3">
              {[
                { key: "id" as const,          label: "网络 ID",       placeholder: "e.g. MYCHAIN" },
                { key: "name" as const,        label: "网络名称",       placeholder: "e.g. My L2 Chain" },
                { key: "chainId" as const,     label: "Chain ID",      placeholder: "e.g. 12345" },
                { key: "rpcUrl" as const,      label: "RPC URL",       placeholder: "https://rpc.example.com" },
                { key: "symbol" as const,      label: "原生代币符号",   placeholder: "e.g. ETH" },
                { key: "explorerUrl" as const, label: "浏览器 URL（可选）", placeholder: "https://explorer.example.com" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-[11px] text-ash mb-1 block">{label}</label>
                  <input
                    value={form[key]}
                    onChange={updateForm(key)}
                    placeholder={placeholder}
                    className="w-full bg-coal/50 border border-canopy/20 rounded-lg px-3 py-2 text-xs text-fog placeholder:text-ash/50 focus:outline-none focus:border-neon/40"
                  />
                </div>
              ))}

              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}

              <button
                onClick={handleAddNetwork}
                className="mt-1 w-full py-2 rounded-lg bg-neon/10 border border-neon/30 text-neon text-xs font-medium hover:bg-neon/20 transition-colors"
              >
                确认添加
              </button>
            </div>
          )}
        </SectionCard>

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <SectionCard title="安全">
          <Row label="余额隐藏">
            <Toggle on={isBalanceHidden} onToggle={() => setIsBalanceHidden(!isBalanceHidden)} />
          </Row>
          <div className="px-4 py-3 border-b border-canopy/10 last:border-0">
            <p className="text-sm text-fog mb-2.5">自动锁屏</p>
            <div className="flex flex-wrap gap-2">
              {lockOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAutoLockMinutes(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-[120ms] ${
                    autoLockMinutes === opt.value
                      ? "bg-neon/10 border-neon/50 text-neon"
                      : "border-ash/40 text-slate hover:border-canopy/50 hover:text-fog"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <SectionCard title="关于">
          <Row label="版本" value="0.1.0" />
          <Row label="框架" value="Tauri v2 + React 18" />
          <Row label="加密算法" value="AES-256-GCM" />
          <Row label="密钥派生" value="PBKDF2-SHA512 × 310,000" />
        </SectionCard>

      </div>
    </div>
  );
};
