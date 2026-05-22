import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className = "",
  id,
  ...props
}) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-muted uppercase tracking-wide"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full bg-bg-card border rounded-xl px-4 py-2.5 text-sm text-white placeholder-muted outline-none transition-colors focus:border-brand ${
          error ? "border-danger" : "border-border"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
};
