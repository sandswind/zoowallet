import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = "",
  ...props
}) => {
  const base = [
    "inline-flex items-center justify-center gap-2",
    "font-sans font-semibold rounded-lg",
    "transition-all duration-[120ms]",
    "focus:outline-none focus-visible:shadow-glow",
    "active:scale-[0.97]",
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
    "select-none",
  ].join(" ");

  const variants = {
    primary:   "bg-neon text-forest hover:bg-brand-hover shadow-sm",
    secondary: "bg-coal text-fog border border-canopy/50 hover:border-canopy hover:bg-coal/80",
    ghost:     "text-neon border border-neon/30 hover:border-neon/70 hover:bg-neon/5",
    danger:    "bg-danger/10 border border-danger/50 text-danger hover:bg-danger/20",
  };

  const sizes = {
    sm:  "h-9  px-3   text-xs",
    md:  "h-11 px-4   text-sm",
    lg:  "h-12 px-5   text-sm",
  };

  return (
    <button
      disabled={disabled || loading}
      className={[base, variants[variant], sizes[size], fullWidth ? "w-full" : "", className].join(" ")}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="opacity-60">处理中…</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
