import { Logo } from "@/components/ui/Logo";

export function TitleBar() {
  const isElectron = !!window.electronAPI?.isElectron;

  // On the web / PWA there are no native window controls and nothing to
  // drag, so this bar would just be 44px of dead space above the app.
  // Only the desktop (Electron) build needs the draggable chrome.
  if (!isElectron) return null;

  return (
    <div
      className="flex items-center h-11 px-4 glass-heavy border-b border-border-light select-none shrink-0"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      {/* Brand */}
      <div className="flex items-center gap-2">
        <Logo size={22} />
        <span className="text-[13px] font-semibold text-text-primary tracking-[-0.01em]">
          Delay
        </span>
      </div>

      <div className="flex-1" />

      {/* Window controls — clean outlined style */}
      <div
        className="flex items-center -mr-2"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
          {/* Minimize: thin horizontal line */}
          <button
            onClick={() => window.electronAPI?.minimize()}
            className="w-[46px] h-[32px] flex items-center justify-center
              text-text-secondary hover:bg-bg-hover transition-colors rounded-md cursor-pointer"
            aria-label="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
          {/* Maximize: rounded square */}
          <button
            onClick={() => window.electronAPI?.maximize()}
            className="w-[46px] h-[32px] flex items-center justify-center
              text-text-secondary hover:bg-bg-hover transition-colors rounded-md cursor-pointer"
            aria-label="Maximize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1.5" y="1.5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          {/* Close: X with rounded ends */}
          <button
            onClick={() => window.electronAPI?.close()}
            className="w-[46px] h-[32px] flex items-center justify-center
              text-text-secondary hover:bg-[#E81123] hover:text-white transition-colors rounded-md cursor-pointer"
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
        </div>
    </div>
  );
}
