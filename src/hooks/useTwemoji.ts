import { useEffect } from "react";

/**
 * Replaces every native emoji glyph in the DOM with a Twemoji SVG image.
 * Reason: on Windows the native "Segoe UI Emoji" glyphs are flat and
 * inconsistent; Apple users see one set, Windows users see another. Twemoji
 * gives the whole app one polished set everywhere (the one Twitter, Discord,
 * GitHub and most chat apps use). Images are styled by the `img.emoji`
 * rule in index.css.
 *
 * Implementation note: the MutationObserver re-parses on DOM changes (for
 * live content like notes, chat, tasks). To avoid an infinite loop — because
 * twemoji's own DOM mutation would re-trigger the observer — we disconnect
 * the observer during parse and reconnect after. Debounced to 120ms so
 * heavy editors (Tiptap) don't get hammered.
 */
export function useTwemoji() {
  useEffect(() => {
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    // twemoji is imported dynamically so it stays out of the main entry chunk.
    import("@twemoji/api").then(({ default: twemoji }) => {
      if (cancelled) return;

      const parse = () => {
        if (observer) observer.disconnect();
        try {
          twemoji.parse(document.body, { folder: "svg", ext: ".svg" });
        } catch {}
        if (observer && !cancelled) {
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
      };

      parse();

      observer = new MutationObserver(() => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(parse, 120);
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (observer) observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
