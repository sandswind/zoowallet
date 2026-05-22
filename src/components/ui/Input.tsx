import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  suffix,
  className = "",
  id,
  ...props
}) => {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={[
            "w-full bg-coal rounded-lg px-3.5 py-2.5",
            "text-sm text-fog placeholder-slate/60 font-sans",
            "border transition-all duration-[200ms]",
            "focus:outline-none",
            error
              ? "border-danger/60 focus:border-danger focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
              : "border-canopy/45 focus:border-neon focus:shadow-[0_0_0_3px_rgba(0,237,100,0.15)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            suffix ? "pr-12" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {suffix && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
            {suffix}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-danger flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate">{hint}</p>
      )}
    </div>
  );
};
