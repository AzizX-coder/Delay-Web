import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/database";
import { motion } from "motion/react";
import { Logo } from "@/components/ui/Logo";
import { ExternalLink, Copy, Check } from "lucide-react";
import type { Note } from "@/types/note";

export function PublicNotePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    loadNote(slug);
  }, [slug]);

  async function loadNote(shareSlug: string) {
    // Try Supabase first (canonical source)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("user_notes")
          .select("*")
          .eq("public_slug", shareSlug)
          .eq("is_public", 1)
          .maybeSingle();
        if (data) {
          setNote(data as Note);
          setLoading(false);
          return;
        }
      } catch {}
    }
    // Fall back to local Dexie (offline or local share)
    try {
      const local = await db.notes
        .where("public_slug")
        .equals(shareSlug)
        .first();
      if (local && local.is_public) {
        setNote(local);
        setLoading(false);
        return;
      }
    } catch {}
    setNotFound(true);
    setLoading(false);
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 rounded-full border-[1.5px] border-border-light border-t-accent"
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary gap-4">
        <Logo size={40} />
        <h1 className="text-[20px] font-bold text-text-primary">Note not found</h1>
        <p className="text-[13px] text-text-tertiary">This note may have been unshared or doesn't exist.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 px-5 py-2.5 rounded-xl bg-accent text-white text-[13px] font-bold cursor-pointer hover:bg-accent/90 transition-all"
        >
          Open Delay
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20 bg-bg-secondary/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <Logo size={24} />
          <span className="text-[13px] font-bold text-text-tertiary">Delay</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-hover text-text-secondary hover:text-text-primary text-[12px] font-medium cursor-pointer transition-all"
          >
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[12px] font-bold cursor-pointer hover:bg-accent/90 transition-all"
          >
            <ExternalLink size={13} />
            Open in Delay
          </button>
        </div>
      </div>

      {/* Note content */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 max-w-3xl mx-auto w-full px-5 py-10"
      >
        {note?.title && (
          <h1 className="text-[28px] md:text-[36px] font-bold text-text-primary mb-6 leading-tight">
            {note.title}
          </h1>
        )}
        {note?.content_text ? (
          <div className="prose-delay text-[15px] text-text-secondary leading-relaxed whitespace-pre-wrap">
            {note.content_text}
          </div>
        ) : note?.content ? (
          <SanitizedHtml html={note.content} className="prose-delay text-[15px] text-text-secondary leading-relaxed" />
        ) : (
          <p className="text-text-tertiary italic">This note has no content.</p>
        )}
      </motion.div>

      {/* Footer */}
      <div className="border-t border-border/20 px-5 py-4 flex items-center justify-center gap-2 text-[11px] text-text-tertiary">
        <Logo size={14} />
        <span>Shared via <strong className="text-text-secondary">Delay</strong> — Your second brain for deep work</span>
      </div>
    </div>
  );
}

/**
 * Renders user-authored HTML safely. PublicNotePage shows notes from
 * other users — without sanitization, anyone who crafts a note via the
 * API (bypassing TipTap's own escaping) could ship <script> or
 * `<img onerror>` that runs in every visitor's session. DOMPurify
 * strips anything that isn't a known-safe tag/attribute and refuses
 * javascript:/data:/vbscript: URLs.
 */
function SanitizedHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ["style", "form", "input", "textarea", "button", "iframe", "object", "embed", "script"],
        FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "style"],
      }),
    [html]
  );
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
