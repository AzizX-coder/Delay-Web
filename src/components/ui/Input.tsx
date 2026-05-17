import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[13px] font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        className={`h-9 px-3.5 bg-bg-secondary/50 border border-border rounded-[--radius-sm]
          text-[13px] text-text-primary placeholder:text-text-tertiary
          outline-none transition-all duration-150
          focus:border-border/60 focus:ring-4 focus:ring-text-secondary/5
          ${error ? "border-danger" : ""} ${className}`}
        spellCheck={false}
        autoComplete="off"
        {...props}
      />
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </div>
  );
}
