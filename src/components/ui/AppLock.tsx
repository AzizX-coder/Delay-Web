import { useState, useEffect } from "react";
import { Lock, X, Delete } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "./Logo";

interface AppLockProps {
  onUnlock: () => void;
}

export function AppLock({ onUnlock }: AppLockProps) {
  const pin = useSettingsStore((s) => s.security_pin);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (input.length === 4) {
      if (input === pin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setInput("");
          setError(false);
        }, 500);
      }
    }
  }, [input, pin, onUnlock]);

  const handleKeyPress = (num: string) => {
    if (input.length < 4 && !error) {
      setInput((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setInput((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-primary text-text-primary backdrop-blur-xl">
      <div className="mb-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-accent shadow-xl shadow-accent/20 mx-auto mb-4">
          <Logo size={32} />
        </div>
        <h2 className="text-[20px] font-bold text-center">App Locked</h2>
        <p className="text-[12px] text-text-tertiary mt-1 text-center">Enter your PIN to access Delay</p>
      </div>

      <div className="flex items-center gap-4 mb-10">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative w-4 h-4 flex items-center justify-center">
            {input.length > i ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-4 h-4 rounded-full bg-accent" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-border" />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-danger text-[12px] font-bold absolute top-[40%]">
            Incorrect PIN
          </motion.p>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-6 max-w-[280px] w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleKeyPress(num.toString())}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-secondary hover:bg-bg-hover active:bg-border transition-colors text-[24px] font-medium mx-auto cursor-pointer"
          >
            {num}
          </button>
        ))}
        <div className="flex items-center justify-center w-16 h-16 mx-auto" />
        <button
          onClick={() => handleKeyPress("0")}
          className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-secondary hover:bg-bg-hover active:bg-border transition-colors text-[24px] font-medium mx-auto cursor-pointer"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="flex items-center justify-center w-16 h-16 rounded-full text-text-tertiary hover:text-text-primary active:bg-border transition-colors mx-auto cursor-pointer"
        >
          <Delete size={28} />
        </button>
      </div>
    </div>
  );
}
