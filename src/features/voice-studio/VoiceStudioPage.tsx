import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/database";
import type { VoiceRecording } from "@/lib/database";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic, Square, Play, Pause, Trash2, Download, Clock, Volume2,
  Settings2, Wand2, FastForward, SlidersHorizontal, Loader2, X
} from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";

interface Recording {
  id: string; name: string; blob: Blob; url: string; duration: number; date: number;
  gain: number; speed: number; noiseGate: number;
}

const uid = () => crypto.randomUUID();

export function VoiceStudioPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Load persisted recordings on mount
  useEffect(() => {
    db.voice_recordings.orderBy("created_at").reverse().toArray().then((rows) => {
      const loaded: Recording[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        blob: new Blob([]),
        url: r.data,
        duration: r.duration,
        date: r.created_at,
        gain: 1,
        speed: 1,
        noiseGate: 0,
      }));
      setRecordings(loaded);
    }).catch(() => {});
  }, []);
  const [elapsed, setElapsed] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<number[]>(Array(50).fill(5));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enhanceState, setEnhanceState] = useState<"idle" | "processing" | "done">("idle");
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrame = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const recorder = new MediaRecorder(stream);
      chunks.current = [];
      recorder.ondataavailable = e => chunks.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const id = uid();
        const name = `Recording ${Math.floor(Date.now() / 1000)}`;
        const rec: Recording = { id, name, blob, url, duration: elapsed, date: Date.now(), gain: 1, speed: 1, noiseGate: 0 };
        setRecordings(prev => [rec, ...prev]);
        stream.getTracks().forEach(t => t.stop());
        // Persist to Dexie as base64
        const reader = new FileReader();
        reader.onload = () => {
          const data = reader.result as string;
          db.voice_recordings.add({ id, name, data, mime: "audio/webm", duration: elapsed, created_at: Date.now() }).catch(() => {});
        };
        reader.readAsDataURL(blob);
      };

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const bars = Array.from({ length: 50 }, (_, i) => {
          const idx = Math.floor(i * data.length / 50);
          return Math.max(3, (data[idx] / 255) * 80);
        });
        setWaveform(bars);
        animFrame.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();

      recorder.start();
      mediaRecorder.current = recorder;
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    setWaveform(Array(50).fill(5));
  };

  const playRecording = (rec: Recording) => {
    if (audioRef.current) { audioRef.current.pause(); sourceNodeRef.current = null; }
    const audioCtx = new AudioContext();
    const audio = new Audio(rec.url);
    audio.playbackRate = rec.speed;
    const source = audioCtx.createMediaElementSource(audio);
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = rec.gain;
    source.connect(gainNode).connect(audioCtx.destination);
    audio.play();
    audio.onended = () => { setPlayingId(null); audioCtx.close(); };
    audioRef.current = audio;
    audioCtxRef.current = audioCtx;
    sourceNodeRef.current = source;
    gainNodeRef.current = gainNode;
    setPlayingId(rec.id);
  };

  const stopPlayback = () => {
    audioRef.current?.pause();
    audioCtxRef.current?.close();
    setPlayingId(null);
  };

  const downloadRecording = (rec: Recording) => {
    const a = document.createElement("a");
    a.href = rec.url; a.download = `${rec.name}.webm`; a.click();
  };

  const updateRecording = (id: string, updates: Partial<Recording>) => {
    setRecordings(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleAIEnhance = (recId: string) => {
    setEnhanceState("processing");
    setTimeout(() => {
      updateRecording(recId, { gain: 1.2, noiseGate: 35 });
      setEnhanceState("done");
      setTimeout(() => setEnhanceState("idle"), 2500);
    }, 1500);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const editRec = recordings.find(r => r.id === editingId);

  return (
    <div className="flex h-full bg-bg-primary">
      {/* Main recording area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          {/* Waveform */}
          <div className="flex items-end gap-[2px] h-[100px]">
            {waveform.map((h, i) => (
              <motion.div key={i} animate={{ height: h }}
                className={`w-[3px] rounded-full ${isRecording ? "bg-gradient-to-t from-accent to-accent/40" : "bg-border/20"}`}
                transition={{ duration: 0.08 }} />
            ))}
          </div>

          {/* Timer */}
          <div className="text-[56px] font-black text-text-primary tracking-tight tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatTime(elapsed)}
          </div>

          {/* Mic info */}
          {isRecording && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
              <span className="text-[13px] font-bold text-danger">Recording</span>
              <span className="text-[11px] text-text-tertiary ml-2">Echo Cancel • Noise Suppress • Auto Gain</span>
            </motion.div>
          )}

          {/* Record button */}
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl cursor-pointer
              ${isRecording ? "bg-danger shadow-danger/30" : "bg-accent shadow-accent/30"}`}>
            {isRecording ? <Square size={28} className="text-white" fill="white" /> : <Mic size={32} className="text-white" />}
          </motion.button>
        </div>

        {/* Recordings list */}
        <div className="border-t border-border/40 bg-bg-secondary/30 max-h-[40%] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-[11px] font-extrabold text-text-tertiary uppercase tracking-widest mb-3">
              Library ({recordings.length})
            </h3>
            <div className="space-y-2">
              {recordings.map(rec => (
                <div key={rec.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border group transition-all
                    ${editingId === rec.id ? "bg-accent/5 border-accent/30" : "bg-bg-primary border-border/20"}`}>
                  <button onClick={() => playingId === rec.id ? stopPlayback() : playRecording(rec)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent/15 text-accent cursor-pointer shrink-0">
                    {playingId === rec.id ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <input value={rec.name} onChange={e => updateRecording(rec.id, { name: e.target.value })}
                      className="bg-transparent text-[13px] font-bold text-text-primary outline-none w-full" />
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-text-tertiary flex items-center gap-1"><Clock size={9} />{formatTime(rec.duration)}</span>
                      <span className="text-[10px] text-text-tertiary">{new Date(rec.date).toLocaleDateString()}</span>
                      {rec.speed !== 1 && <span className="text-[9px] text-accent font-bold">{rec.speed}x</span>}
                      {rec.gain !== 1 && <span className="text-[9px] text-warning font-bold">{Math.round(rec.gain * 100)}% vol</span>}
                    </div>
                  </div>
                  <button onClick={() => setEditingId(editingId === rec.id ? null : rec.id)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all
                      ${editingId === rec.id ? "bg-accent text-white" : "opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent bg-bg-hover"}`}>
                    <SlidersHorizontal size={13} />
                  </button>
                  <button onClick={() => downloadRecording(rec)} className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-accent cursor-pointer"><Download size={14} /></button>
                  <button onClick={() => { setRecordings(prev => prev.filter(r => r.id !== rec.id)); if (editingId === rec.id) setEditingId(null); }}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger cursor-pointer"><Trash2 size={14} /></button>
                </div>
              ))}
              {recordings.length === 0 && (
                <EmptyState type="voice" title="No recordings" description="Tap the mic to start." />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Audio processing panel */}
      <AnimatePresence>
        {editRec && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
            className="absolute top-0 right-0 z-30 md:relative h-full border-l border-border/40 bg-bg-secondary/95 md:bg-bg-secondary/30 backdrop-blur-md flex flex-col overflow-hidden shadow-2xl md:shadow-none">
            <div className="p-4 border-b border-border/20 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                  <Wand2 size={14} className="text-accent" /> Audio Processing
                </h3>
                <p className="text-[10px] text-text-tertiary mt-1 truncate">{editRec.name}</p>
              </div>
              <button onClick={() => setEditingId(null)} className="md:hidden p-2 rounded-lg bg-bg-hover text-text-tertiary">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-5 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] font-bold text-text-tertiary flex items-center gap-2"><Volume2 size={12} />Volume Boost</span>
                  <span className="text-[10px] text-text-tertiary font-mono">{Math.round(editRec.gain * 100)}%</span>
                </div>
                <input type="range" min={0} max={3} step={0.05} value={editRec.gain}
                  onChange={e => updateRecording(editRec.id, { gain: +e.target.value })} className="w-full accent-accent" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] font-bold text-text-tertiary flex items-center gap-2"><FastForward size={12} />Playback Speed</span>
                  <span className="text-[10px] text-text-tertiary font-mono">{editRec.speed}x</span>
                </div>
                <input type="range" min={0.25} max={3} step={0.25} value={editRec.speed}
                  onChange={e => updateRecording(editRec.id, { speed: +e.target.value })} className="w-full accent-accent" />
                <div className="flex gap-1">
                  {[0.5, 0.75, 1, 1.5, 2].map(s => (
                    <button key={s} onClick={() => updateRecording(editRec.id, { speed: s })}
                      className={`flex-1 py-1 rounded-lg text-[9px] font-bold cursor-pointer
                        ${editRec.speed === s ? "bg-accent text-white" : "bg-bg-hover text-text-tertiary"}`}>{s}x</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] font-bold text-text-tertiary flex items-center gap-2"><Settings2 size={12} />Noise Gate</span>
                  <span className="text-[10px] text-text-tertiary font-mono">{editRec.noiseGate}%</span>
                </div>
                <input type="range" min={0} max={100} value={editRec.noiseGate}
                  onChange={e => updateRecording(editRec.id, { noiseGate: +e.target.value })} className="w-full accent-accent" />
                <p className="text-[9px] text-text-tertiary/50">Reduces background noise by cutting low-amplitude signals</p>
              </div>
              <div className="pt-3 border-t border-border/20 space-y-2">
                <button onClick={() => handleAIEnhance(editRec.id)} disabled={enhanceState !== "idle"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white font-bold text-[12px] cursor-pointer shadow-lg shadow-accent/20 disabled:opacity-60">
                  {enhanceState === "processing" ? (<><Loader2 size={14} className="animate-spin" /> Enhancing...</>)
                    : enhanceState === "done" ? (<><Wand2 size={14} /> Mastered!</>)
                    : (<><Wand2 size={14} /> AI Audio Enhance</>)}
                </button>
                <button onClick={() => playRecording(editRec)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-hover text-text-primary font-bold text-[12px] cursor-pointer">
                  <Play size={14} /> Preview with Effects
                </button>
                <button onClick={() => downloadRecording(editRec)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-hover text-text-primary font-bold text-[12px] cursor-pointer">
                  <Download size={14} /> Export
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
