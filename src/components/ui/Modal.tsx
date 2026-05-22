import React, { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  const titleId = `modal-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,30,43,0.72)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-sm bg-midnight border-t border-canopy/40 rounded-t-2xl px-5 pt-5 pb-8 outline-none animate-slide-up shadow-raised"
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-ash/60" />
        </div>

        <h2 id={titleId} className="text-base font-semibold text-fog mb-5">
          {title}
        </h2>

        {children}
      </div>
    </div>
  );
};
