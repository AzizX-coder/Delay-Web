import { motion, AnimatePresence } from "motion/react";
import { Mic, X, Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Wispr Flow-style voice overlay. The bars are driven by REAL audio
 * levels (Web Audio AnalyserNode), not a hard-coded animation — that's
 * the difference between "fake mic chrome" and "feels like the mic is
 * actually listening to you". Press Esc to cancel.
 */

interface Props {
  active: boolean;
  transcript?: string;
  /** Stop listening + discard any captured transcript */
  onStop: () => void;
  /** Send the captured transcript downstream (chat send / note insert). */
  onSend?: (text: string) => void;
}

const BARS = 28; // resolution of the waveform

export function VoiceBadge({ active, transcript, onStop, onSend }: Props) {
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const sentRef = useRef(false);

  // Esc to cancel
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onStop(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onStop]);

  // Audio reactivity — open the mic, feed an AnalyserNode, sample its
  // frequency data each frame, and downsample to BARS values.
  useEffect(() => {
    if (!active) return;
    sentRef.current = false;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.75;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const chunk = Math.max(1, Math.floor(buf.length / BARS));

        const tick = () => {
          analyser.getByteFrequencyData(buf);
          const next: number[] = [];
          for (let i = 0; i < BARS; i++) {
            let sum = 0;
            const start = i * chunk;
            const end = Math.min(start + chunk, buf.length);
            for (let j = start; j < end; j++) sum += buf[j];
            // 0..255 → 0..1, with a perceptual curve so quiet speech still shows
            const avg = sum / (end - start) / 255;
            next.push(Math.pow(avg, 0.65));
          }
          setLevels(next);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic permission denied or unavailable — fall back to a calm sine wave
        // so the bar still feels alive while SpeechRecognition keeps working.
        let phase = 0;
        const fallback = () => {
          phase += 0.18;
          setLevels(Array.from({ length: BARS }, (_, i) => 0.2 + 0.18 * Math.abs(Math.sin(phase + i * 0.4))));
          rafRef.current = requestAnimationFrame(fallback);
        };
        fallback();
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setLevels(Array(BARS).fill(0));
    };
  }, [active]);

  const handleSend = () => {
    if (!transcript?.trim() || !onSend || sentRef.current) { onStop(); return; }
    sentRef.current = true;
    onSend(transcript.trim());
    onStop();
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-[60] pointer-events-auto"
        >
          <div className="mx-auto max-w-2xl mb-5 px-4">
            <div
              className="relative rounded-[28px] overflow-hidden border border-white/[0.08]
                bg-[#0F0F14]/95 backdrop-blur-2xl
                shadow-[0_20px_60px_-10px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
            >
              {/* Top hairline that glows with accent — subtle, not red */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[1.5px]"
                style={{ background: "linear-gradient(90deg, transparent 10%, #7B6FF6 50%, transparent 90%)" }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Top row: mic + transcript + actions */}
              <div className="flex items-start gap-4 px-5 pt-5">
                {/* Mic with pulse */}
                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                  <motion.span
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-[#7B6FF6]/30"
                  />
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-[#8B7FFF] to-[#5848E8] text-white flex items-center justify-center shadow-[0_4px_20px_-4px_rgba(123,111,246,0.6)]">
                    <Mic size={17} />
                  </div>
                </div>

                {/* Status + transcript */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-bold text-[#B9B0FF] uppercase tracking-[0.18em]">
                      Listening
                    </span>
                    <span className="text-text-tertiary text-[10px]">·</span>
                    <span className="text-[10px] text-text-tertiary">{Math.round(levels.reduce((a, b) => a + b, 0) / BARS * 100)}%</span>
                  </div>
                  <p className={`mt-1 text-[14.5px] leading-snug font-medium line-clamp-2 ${transcript ? "text-text-primary" : "text-text-tertiary italic"}`}>
                    {transcript || "Speak — I'm transcribing."}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {transcript && onSend && (
                    <motion.button
                      initial={{ scale: 0, rotate: -15 }}
                      animate={{ scale: 1, rotate: 0 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSend}
                      className="w-10 h-10 flex items-center justify-center rounded-2xl
                        bg-gradient-to-b from-[#8B7FFF] to-[#5848E8] text-white
                        shadow-[0_6px_16px_-6px_rgba(123,111,246,0.7)]
                        cursor-pointer hover:brightness-110 transition-all"
                      title="Send (Enter)"
                    >
                      <Send size={15} />
                    </motion.button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onStop}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl
                      bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] hover:text-white
                      transition-all cursor-pointer"
                    aria-label="Cancel"
                    title="Cancel (Esc)"
                  >
                    <X size={15} />
                  </motion.button>
                </div>
              </div>

              {/* Audio-reactive waveform — driven by real mic levels */}
              <div className="px-5 py-4 flex items-center justify-center gap-[3px] h-14">
                {levels.map((v, i) => {
                  const h = Math.max(3, v * 44);
                  // Mirror around center for symmetric look
                  const fromCenter = Math.abs(i - BARS / 2) / (BARS / 2);
                  const alpha = 1 - fromCenter * 0.4;
                  return (
                    <motion.span
                      key={i}
                      animate={{ height: h }}
                      transition={{ duration: 0.08, ease: "linear" }}
                      style={{
                        width: 3,
                        background: `linear-gradient(180deg, rgba(123,111,246,${alpha}) 0%, rgba(78,64,227,${alpha * 0.7}) 100%)`,
                        borderRadius: 999,
                      }}
                    />
                  );
                })}
              </div>

              {/* Footer hint */}
              <div className="flex items-center justify-center gap-5 px-5 pb-3 -mt-1">
                <span className="text-[10px] text-text-tertiary flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[9px] font-mono font-bold text-text-secondary">Esc</kbd>
                  Cancel
                </span>
                {transcript && (
                  <span className="text-[10px] text-text-tertiary flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[9px] font-mono font-bold text-text-secondary">↵</kbd>
                    Send
                  </span>
                )}
                <span className="text-[10px] text-text-tertiary flex items-center gap-1.5">
                  <Sparkles size={9} className="text-[#B9B0FF]" />
                  Auto-stops after 2s silence
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
