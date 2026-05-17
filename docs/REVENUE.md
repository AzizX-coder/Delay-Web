# Delay — revenue math, written plainly

This is the honest "can this be a side hustle" worksheet. No motivational
posters, just numbers.

---

## 1 · Pricing (as configured)

| Plan | Monthly | Yearly | Stripe price ref |
| --- | ---: | ---: | --- |
| Free | $0 | $0 | — |
| Pro | **$12** | $120 (save 17%) | `stripe_price_monthly` / `stripe_price_yearly` in `plans` |
| Max | **$29** | $290 | same |

Assumption for the rest of this doc: **average revenue per paying user ≈ $14/mo**
(most pay Pro monthly, a few pay Pro yearly, a small slice pays Max).

---

## 2 · Cost per user, per month

This is the number nobody on YouTube tells you. It changes the math entirely.

### Fixed costs (you pay these whether you have 0 users or 100)

| Item | Monthly | Notes |
| --- | ---: | --- |
| Supabase Free | **$0** | Up to 500 MB DB, 1 GB file storage, 50k MAU. Plenty for the first ~500 users. |
| Vercel Hobby | **$0** | Landing site, 100 GB bandwidth. Way more than you'll use. |
| GitHub Pages | **$0** | App + landing fallback. |
| Cloudflare DNS (when you buy a domain) | **$0** | DNS is free. The domain is ~$10/yr. |
| Domain (.com) | **~$1/mo** | $10–12/year amortized |
| **Fixed total** | **~$1/mo** | This is the part you can't escape. |

### Variable costs (scale with users)

| Item | Per Pro user / mo | Notes |
| --- | ---: | --- |
| Supabase storage + bandwidth | ~$0.05 | Notes are tiny. Real cost is the Cloud Vault (5 GB/user × Pro). At scale you need Supabase Pro ($25/mo flat) covering ~100 users. |
| OpenRouter AI (500 credits/mo Pro) | **~$1.20** | At Claude Haiku / GPT-4o-mini rates, 500 short messages ≈ $0.80–$1.50. |
| Stripe / Lemon Squeezy fee (~5% + 50¢) | **~$1.10** | On a $14/mo charge. |
| **Variable total** | **~$2.35/Pro user** | |

### So your gross margin per Pro user

```
Revenue:   $14.00 / mo
- Variable: $2.35 / mo
─────────────────────
Gross:     $11.65 / mo  (≈ 83% margin)
```

That's a healthy SaaS margin. Better than most.

---

## 3 · Scenarios — what each milestone gets you

| Paying users | Monthly revenue | Monthly costs | **Net to you** | What that pays for in UZ |
| ---: | ---: | ---: | ---: | --- |
| 1 | $14 | $4 | **~$10** | A coffee + the satisfaction |
| 10 | $140 | $25 | **~$115** | A nice dinner, every month |
| 50 | $700 | $130 | **~$570** | Real pocket money, beats a summer job |
| 100 | $1,400 | $260 | **~$1,140** | Comfortable side income |
| 200 | $2,800 | $545 | **~$2,255** | This *is* your job |
| 500 | $7,000 | $1,400 | **~$5,600** | You should probably hire someone |

> **Reality check:** getting to 10 paying users is the hard part. 10 → 50
> is almost as hard as 0 → 10. 50 → 200 is usually easier because by then
> you understand who buys.

---

## 4 · "How long to reach X?"

Pure-organic SaaS without paid ads, written from indie-hacker case studies:

| Milestone | Realistic timeline | What it takes |
| --- | --- | --- |
| First paying user | **2–8 weeks after launch** | One landing post that lands somewhere, plus DM-ing 20 strangers |
| 10 paying users | **2–6 months** | Real launch (HN, Reddit, Twitter), maybe a Product Hunt try, *consistent* posting |
| 50 paying users | **6–18 months** | A reason to come back — a content engine, a feature people screenshot |
| 100+ | **1–3 years** | Compounding from above; usually one feature or one piece of content carries half the growth |

If you treat this like "ship → tweet once → wait for money", you'll get
zero users. The product is 30% of the work; **distribution is 70%**.

---

## 5 · Where the money does NOT come from

Don't waste planning energy on:

- **App Store / Play Store sales** — $99/yr (Apple) and $25 once (Google) for ~3% of total revenue.
  PWA install is fine for v1.
- **Crypto donations** — ~0% of your target users.
- **Sponsorships / GitHub Sponsors** — maybe $50/mo total, not the engine.
- **Enterprise plans** — they take 6+ months to close and you don't have
  a sales team. Ignore until you have 100 self-serve customers.

---

## 6 · The single number to watch

**Trial → paid conversion rate.** Industry baseline for indie SaaS is
**2–5%** of free trials convert. Premium-priced niche tools can hit 8–12%.

What that means for you:
- 100 people visit your landing
- ~30 click "Open app" (30% click-through is good)
- ~10 actually use it for more than 5 minutes
- **0.5–1** of those becomes a paying customer

To get **10 paying users**, you need **~1,000 landing visits with the right
audience**. That sounds like a lot, but a single HN front-page post does
20,000 in a day. A single viral tweet does 100,000. **One good piece of
content is worth more than a year of generic posting.**

---

## 7 · What you do this week (concrete)

1. Run `supabase/schema.sql` (5 min)
2. Set up Google OAuth (`docs/OAUTH-SETUP.md`) (15 min)
3. Deploy `delay-landing` to Vercel (10 min) → get a public URL
4. Write **one** specific post: "I'm 17, from Uzbekistan, I built a Notion
   alternative because [reason]. It's free, here's the link" — post to
   r/SideProject, r/SaaS, Indie Hackers, and Hacker News (Show HN)
5. **Talk to the first 5 people who reply.** They are gold. Their feedback
   is worth more than your next 10 features.
6. Open a Discord. Even a quiet one. People who want to support you need a
   place to congregate.

If after 30 days of that you have <2 paying users, the issue is the
landing page or the pitch — not the product. Come back and iterate the
landing copy, not the app.

---

*This doc was written 2026-05-16, after Delay v3.2.0. Update when your
real numbers diverge from these estimates.*
