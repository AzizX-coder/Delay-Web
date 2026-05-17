# Delay — Web

The web build of [Delay](https://github.com/AzizX-coder/Delay). Lives in its own repo so the web version can ship to Vercel independently of the desktop / Android release pipeline.

> **Architecture note.** The sister repo [`Delay`](https://github.com/AzizX-coder/Delay) holds the same React codebase wrapped in Electron (desktop) and Capacitor (Android). For now both repos carry copies of `src/`. Each side ships at its own cadence; bug fixes should be ported manually until we extract `src/` into a shared package.

## Stack

Vite 8 · React 19 · TypeScript · Tailwind 4 · Supabase (auth + sync) · Tiptap (editor) · tldraw (whiteboard) · framer-motion · dexie (local-first storage).

## Local dev

```bash
npm install --legacy-peer-deps
cp .env.example .env.local      # paste your Supabase URL + anon key
npm run dev                     # http://localhost:5173
```

## Deploy to Vercel

```bash
npm i -g vercel
vercel                          # one-time link
vercel --prod                   # ships it
```

Or import the repo from the Vercel dashboard — `vercel.json` tells it everything it needs (Vite preset, install command with `--legacy-peer-deps`, SPA rewrite to `/index.html`, asset cache headers, sane security headers).

**Required env vars** (set in Vercel → Project → Settings → Environment Variables):

| Name | Where it comes from |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | same screen — *anon public* key |
| `VITE_TLDRAW_LICENSE_KEY` *(optional)* | tldraw license, only if you want Whiteboard |
| `VITE_OPENROUTER_API_KEY` *(optional)* | OpenRouter key for default AI |

Anon key is safe to ship in the bundle — RLS policies in `supabase/schema.sql` control what it can do. Never put a service-role key in any `VITE_*` var.

## Layout

```
delay-web/
├─ src/             ← entire app (mirror of Delay/src/)
├─ public/          ← favicon, manifest icons
├─ supabase/        ← schema.sql + edge function stubs
├─ docs/            ← OAuth setup, revenue math, etc.
├─ index.html
├─ vite.config.ts   ← Vite + PWA + Tailwind
├─ vercel.json      ← deploy config
└─ tsconfig.json
```

## License

Apache-2.0.
