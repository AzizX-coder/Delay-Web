# OAuth setup for Delay

How to wire Google and GitHub sign-in to Delay's Supabase project so the
"Continue with Google" and "Continue with GitHub" buttons on the auth
screen actually work.

You do this once per provider. After that, every user who clicks the
button just signs in — no further code changes.

---

## Before you start

| Need | Where to get it |
| --- | --- |
| A Supabase project | Already done. Project ref: `splthfrwtddrkcherwwj` |
| The schema applied | Run `supabase/schema.sql` once in the Supabase SQL editor before testing sign-in — otherwise the auto-create-profile trigger has no `profiles` table to write to |
| Your Supabase callback URL | `https://splthfrwtddrkcherwwj.supabase.co/auth/v1/callback` — you will paste this several times below, keep it handy |

> **Why Supabase, not me?** The browser → Google → Supabase → back-to-app
> dance involves a JWT signed by Google. Supabase already knows how to
> fetch Google's public keys (JWKS), verify the signature, and mint its
> own Supabase JWT for the app. Doing that yourself is ~200 lines of
> security-sensitive code you would have to maintain forever. Don't.

---

## 1. Google sign-in

### 1.1 Create the Google Cloud project (one-time)

1. Open <https://console.cloud.google.com>. Sign in with whichever Google
   account you want to own the OAuth app.
2. Top-left next to the Google Cloud logo → **Select a project** → **New project**.
3. Name it `Delay`. Leave organization on "No organization". Click **Create**.
4. Wait ~10s, then select the new project from the same dropdown.

### 1.2 Set up the OAuth consent screen

This is the page users see *before* they're sent back to Delay — it's
the "Delay wants to access your name and email" prompt.

1. Left nav → **APIs & Services** → **OAuth consent screen**.
2. **User Type → External** → **Create**.
3. **App information:**
   - App name: `Delay`
   - User support email: your email
   - App logo: optional, skip for now
4. **App domain:** leave blank, or paste your landing URL once you have one.
5. **Developer contact information:** your email.
6. Click **Save and continue**.
7. **Scopes** → **Save and continue** (don't add any — Supabase asks for
   the minimum it needs at sign-in time).
8. **Test users** → **+ Add Users** → add your own email and any teammate
   who'll test before you publish. Save and continue.
9. **Summary** → **Back to dashboard**.

> Your app is now in "Testing" mode. Only listed test users can sign in.
> When you're ready for real users, come back here and click
> **Publish app** (Google will ask you to verify ownership).

### 1.3 Create the OAuth client ID (the credential)

1. Left nav → **APIs & Services** → **Credentials**.
2. **+ Create credentials** → **OAuth client ID**.
3. **Application type → Web application**.
4. **Name:** `Delay Web` (this is internal, users never see it).
5. **Authorized JavaScript origins** → **+ Add URI**, add the URLs Delay
   runs at:
   - `http://localhost:5173`
   - `https://azizx-coder.github.io`
   - Your Vercel landing URL once you have one, e.g. `https://delay.vercel.app`
6. **Authorized redirect URIs** → **+ Add URI** → paste exactly:
   ```
   https://splthfrwtddrkcherwwj.supabase.co/auth/v1/callback
   ```
   This is the *only* redirect URI you need — Supabase handles
   the redirect from there into Delay.
7. **Create**. A modal appears with **Client ID** and **Client secret**.
   Copy both into a notes file — you cannot see the secret again later
   (you can regenerate it if you lose it).

### 1.4 Paste them into Supabase

1. Open <https://supabase.com/dashboard/project/splthfrwtddrkcherwwj/auth/providers>.
2. Find **Google** in the providers list, click the row to expand.
3. Toggle **Enable Sign in with Google** to ON.
4. **Client ID (for OAuth)**: paste the Client ID.
5. **Client Secret (for OAuth)**: paste the Client Secret.
6. **Callback URL (for OAuth)**: confirm it shows the same `…/auth/v1/callback` URL you used above.
7. **Save**.

Done. The "Continue with Google" button now works.

---

## 2. GitHub sign-in

### 2.1 Create the OAuth app

1. Open <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
2. **Application name:** `Delay`
3. **Homepage URL:** your landing or app URL — e.g.
   `https://azizx-coder.github.io/Delay/` (you can change this later).
4. **Application description:** optional.
5. **Authorization callback URL** — paste exactly:
   ```
   https://splthfrwtddrkcherwwj.supabase.co/auth/v1/callback
   ```
6. **Register application**.
7. On the next page you see a **Client ID** — copy it.
8. Click **Generate a new client secret** → copy the secret immediately
   (GitHub will hide it on refresh).

### 2.2 Paste them into Supabase

1. Same providers page in Supabase. Find **GitHub** → expand the row.
2. Toggle **Enable Sign in with GitHub** to ON.
3. Paste **Client ID** and **Client Secret**.
4. **Save**.

Done.

---

## 3. (Optional) Email + magic link

Email/password sign-in is already enabled by default — no setup needed.

For **magic link** (no password, just email):

1. Same providers page → **Email** is already on.
2. **Authentication → URL configuration**: set the **Site URL** to your
   app URL — for now, `https://azizx-coder.github.io/Delay/`. This is
   where the link in the email sends them after clicking. Without this,
   the magic link redirects to localhost and breaks for real users.

---

## 4. Verify it works

1. Make sure the secrets are deployed: GitHub repo → Settings → Secrets
   and variables → Actions. You should see `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
2. Trigger a fresh deploy (Actions → Deploy Site → Run workflow) or
   wait for your next push to `main`.
3. Open `https://azizx-coder.github.io/Delay/app/`.
4. You should see the auth screen. Click **Continue with Google**.
5. Google's consent screen appears → approve → you bounce back into
   Delay, signed in. Open the profile menu — you should see your name.
6. Check Supabase: **Authentication → Users**. Your account should be
   listed. **Table Editor → profiles** should have a row for you with
   `plan = 'free'`.

If step 6 shows the auth user but **no profiles row**, the
`handle_new_user` trigger didn't run — most likely because you didn't
run `supabase/schema.sql` yet. Run it and try a new sign-up.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `redirect_uri_mismatch` from Google | Google's authorized redirect doesn't match | Copy the URI from the error message and add it under **Credentials → your OAuth client → Authorized redirect URIs** |
| GitHub: "The redirect_uri MUST match" | Same as above, on the OAuth app page | Update **Authorization callback URL** to match exactly |
| `400 Database error saving new user` | `profiles` table doesn't exist, or the trigger references columns that don't exist | Re-run `supabase/schema.sql` — it's idempotent, safe to run again |
| Bounce-back lands on a blank page | Site URL not set in Supabase | Supabase → Authentication → URL Configuration → set Site URL to your deployed app URL |
| Works locally, not in production | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` not set as GitHub secrets, OR a deploy hasn't run since they were added | Set them, then **Actions → Deploy Site → Run workflow** |
| "App is blocked" Google warning | App is in Testing mode and you're not a listed Test User | Add the email under **OAuth consent screen → Test users**, or **Publish app** for real users |

---

## 6. What you never need to do

- You don't write any JWT verification code. Supabase fetches Google's
  and GitHub's public keys, verifies the upstream JWT signature, and
  issues you a Supabase JWT. The browser stores that one. The
  `useAuth.ts` hook already reads it.
- You don't need to handle refresh tokens. Supabase rotates them
  silently inside `supabase.auth.getSession()`.
- You don't add a backend just for auth. The whole flow is
  browser → Google → Supabase → browser. No server you run.

---

## 7. When you go live (later)

Two things to flip when you have a real domain:

1. **Google OAuth consent screen → Publishing status → Publish app**.
   Removes the "Testing" banner and lets anyone sign in. (Google may
   ask for verification; for a personal app reading basic profile only,
   verification is usually not required.)
2. **Supabase → Authentication → URL Configuration → Site URL**:
   change to your real domain. Update Google's
   "Authorized JavaScript origins" and "redirect URIs" to match.

That's it.
