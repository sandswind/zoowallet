import React, { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="复制"
      className={`inline-flex items-center gap-1 text-xs text-muted hover:text-white transition-colors ${className}`}
    >
      {copied ? (
        <span className="text-success">✓ 已复制</span>
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" />
            <path
              strokeWidth="2"
              d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
            />
          </svg>
          {label ?? "复制"}
        </>
      )}
    </button>
  );
};
