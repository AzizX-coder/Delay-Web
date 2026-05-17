import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useUpdaterStore } from "@/stores/updaterStore";
import { Download, CheckCircle, X } from "lucide-react";

export function UpdateToast() {
  const { status, quitAndInstall } = useUpdaterStore();
  const [visible, setVisible] = useState(false);

  const isUpdateAvailable = status === "available" || status === "downloading";
  const isDownloaded = status === "downloaded";

  useEffect(() => {
    if (isUpdateAvailable || isDownloaded) {
      setVisible(true);
    }
  }, [isUpdateAvailable, isDownloaded]);

  return (
    <AnimatePresence>
      {visible && (isUpdateAvailable || isDownloaded) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 z-[100] w-80 bg-bg-glass-heavy backdrop-blur-xl border border-border-light shadow-2xl rounded-2xl p-4 overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-bg-secondary">
            {isUpdateAvailable && !isDownloaded && (
              <motion.div
                className="h-full bg-accent"
                animate={{ width: ["0%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            {isDownloaded && <div className="h-full w-full bg-success" />}
          </div>

          <div className="flex gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
              ${isDownloaded ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}
            >
              {isDownloaded ? <CheckCircle size={20} /> : <Download size={20} />}
            </div>
            
            <div className="flex-1">
              <h4 className="text-[14px] font-semibold text-text-primary">
                {isDownloaded ? "Update Ready" : "Downloading Update..."}
              </h4>
              <p className="text-[13px] text-text-secondary mt-0.5 leading-tight">
                {isDownloaded 
                  ? "A new version of Delay has been downloaded. Install to apply."
                  : "A new version is currently downloading in the background."}
              </p>

              {isDownloaded && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={quitAndInstall}
                    className="flex-1 bg-text-primary text-text-inverse text-[12px] font-medium py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Install & Restart
                  </button>
                  <button
                    onClick={() => setVisible(false)}
                    className="flex-1 bg-bg-secondary text-text-secondary text-[12px] font-medium py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    Later
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setVisible(false)}
              className="absolute top-3 right-3 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
