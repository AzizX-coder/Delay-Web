import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children?: ReactNode;
}

const variants = {
  primary:
    "bg-accent text-text-inverse hover:bg-accent-hover shadow-sm",
  secondary:
    "bg-bg-secondary text-text-primary hover:bg-bg-active border border-border",
  ghost:
    "bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary",
  danger:
    "bg-danger/10 text-danger hover:bg-danger/20",
};

const sizes = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-[14px] gap-2",
  lg: "h-11 px-6 text-[15px] gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`inline-flex items-center justify-center font-medium rounded-[--radius-sm]
        transition-colors duration-150 cursor-pointer select-none
        disabled:opacity-40 disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as object)}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
}
