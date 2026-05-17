import { motion } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  blur?: "sm" | "md" | "lg" | "xl";
  padding?: "none" | "sm" | "md" | "lg";
  animated?: boolean;
}

const blurMap = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
};

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export function GlassPanel({
  children,
  blur = "xl",
  padding = "md",
  animated = true,
  className = "",
  ...props
}: GlassPanelProps) {
  const base = `bg-bg-glass ${blurMap[blur]} border border-border-light
    rounded-[--radius-lg] shadow-[0_2px_16px_var(--color-shadow),0_0_1px_var(--color-shadow-md)]
    ${paddingMap[padding]} ${className}`;

  if (!animated) {
    return (
      <div className={base} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={base}
      {...(props as object)}
    >
      {children}
    </motion.div>
  );
}
