import { motion } from "motion/react";

interface SkeletonProps {
  variant?: "text" | "card" | "list" | "circle";
  className?: string;
  count?: number;
}

export function Skeleton({ variant = "text", className = "", count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count });

  if (variant === "circle") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="w-10 h-10 rounded-full bg-bg-hover animate-pulse" />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="p-4 rounded-2xl border border-border/20 bg-bg-secondary/30 animate-pulse">
            <div className="h-4 w-2/3 rounded-lg bg-bg-hover mb-3" />
            <div className="h-3 w-full rounded-lg bg-bg-hover mb-2" />
            <div className="h-3 w-4/5 rounded-lg bg-bg-hover" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={`space-y-2 ${className}`}>
        {items.map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-bg-hover shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-3/4 rounded-lg bg-bg-hover mb-1.5" />
              <div className="h-2.5 w-1/2 rounded-lg bg-bg-hover" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // text variant
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((_, i) => (
        <div key={i} className="h-3.5 rounded-lg bg-bg-hover animate-pulse"
          style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}
