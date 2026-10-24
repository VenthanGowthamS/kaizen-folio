# Kaizen Folio — Requirements & Status

> **Tagline:** A private growth portfolio — small steps, every day.
> **Date:** October 2026
> **Status:** MVP built and running locally (Express + SQLite). **Not yet deployed.** Hosting not chosen.
> **Domain:** `kaizenfolio.com` — bought on Cloudflare Registrar 11 Oct 2026 ($11.40), auto-renews, paid through 11 Oct 2027. DNS is on Cloudflare (Free plan). No DNS records pointing anywhere yet.
> **Repo:** https://github.com/VenthanGowthamS/kaizen-folio
> **Legend:** ✅ built · 🟡 decided, in progress · 🔴 planned, not started · ❓ open question

Read with [WHY.md](WHY.md) (the thinking) and [../README.md](../README.md) (how to run it).
When starting a session, ask: *"Read `docs/requirements.md` — what's the current status and what's next?"*

---

## 1. Problem

A child's history is scattered (phone gallery, WhatsApp, school email, certificates in a drawer). The score, the feedback and how it felt are never written down. Generating a PDF is easy; **having dated, annotated material to generate from is hard**. Kaizen Folio is the capture layer. See WHY.md.

## 2. Product direction (decision log)

| # | Decision | Status |
|---|---|---|
| D1 | Phase 1 = **private family app** for our own child. Login only, nothing public, `noindex`. | ✅ |
| D2 | Not blockchain. Trust comes from backups, ownership and dated entries, not a ledger. | ✅ |
| D3 | Validate by using it ourselves for 6–8 weeks before building for others. | 🟡 |
| D4 | **Link, don't collect.** For external users we link their Google Drive / AWS and keep only metadata and a hash, never a copy of the file. | 🔴 (Oct 2026 idea) |
| D5 | Authenticity is tiered: *Self-declared* → *Drive-linked* → *Third-party verified*. We never claim "proven original". | 🔴 |
| D6 | Production domain = the Kaizen Folio domain already purchased. Deploy from GitHub. | 🟡 |
| D7 | ❓ Does the Drive-link idea fit a private family app, or does it mean a second product (portfolio for anyone)? D3 should answer this first. | ❓ |

---

## 3. Status — what is built (MVP)

### Accounts and privacy
| Feature | Status |
|---|---|
| Three roles: Parent (edit all), Family (view), Child (own journey only) | ✅ |
| Username or email login, 90-day sliding session, bcrypt passwords | ✅ |
| Media served only to signed-in users; pages `noindex` | ✅ |
| Child login fenced to own profile and files | ✅ |
| Multi-child support | ✅ |
| Per-entry visibility (hide some entries from Family) | 🔴 |
| Multi-family accounts | 🔴 |

### Capture
| Feature | Status |
|---|---|
| Moments with date, notes, photos, voice/speech, video, PDF | ✅ |
| 4 tabs / ~25 areas (Study, Sports, Arts & stage, Awards & school) from one shared `catalog.js` | ✅ |
| Level (school → international) and result (medal, rank, belt) | ✅ |
| Olympiad subject, score and percentage | ✅ |
| Leadership **role** field (captain, monitor, MUN …) | ✅ |
| Community (VIA) area | ✅ |
| "Who made this" label (own work / with help / AI-assisted) | ✅ |
| Qualities shown, next small step, child's own words, family cheers | ✅ |
| Share a photo or voice note from the phone straight into the app | 🔴 |
| Forward a WhatsApp message into the app | 🔴 |

### Views and outputs
| Feature | Status |
|---|---|
| Portfolio timeline | ✅ |
| Parent dashboard: upcoming events, activities, exam ladder (Cambridge etc.) | ✅ |
| Goals tab: Singapore pathway (PSLE → Sec → JC/Poly → Uni) with sources | ✅ |
| University explorer (19 universities, offline map), parked until secondary | ✅ |
| PDF portfolio (filter by tab and dates, Save as PDF) | ✅ |
| Download everything (ZIP: JSON + originals + offline `index.html`) | ✅ |
| Kid login + scripted Buddy (tap-only, no free text) | ✅ |
| Parent-uploaded buddy pictures | ✅ |
| PWA install, light and Midnight themes | ✅ |
| Reminders for upcoming events | 🔴 |
| Yearly highlights / "year in review" (AI-generated from saved moments) | 🔴 |

### Engineering
| Feature | Status |
|---|---|
| Node 22, Express 5, `node:sqlite`, no build step | ✅ |
| API tests (`npm test`) | ✅ |
| Demo seed data, removable in one tap | ✅ |
| `.gitignore` blocks `data/` and `data-*/` so personal data can't be committed | ✅ |
| GitHub repo created | ✅ |
| CI (tests on push) | 🔴 |

---

## 4. Planned — Phase A: Deploy and own the domain 🟡

Kaizen Folio is a **Node server with SQLite and uploaded files**, so GitHub Pages cannot host it (it serves static files only). GitHub is still used for source and auto-deploy. The Pannaipuram setup (GitHub Pages + Render + Cloudflare) does not carry over as is.

| # | Requirement | Status |
|---|---|---|
| A1 | **Host decided (Oct 2026): free tier, same as Pannaipuram.** Render free (web server, auto-deploy from GitHub) + Supabase free (private Storage holds uploads + DB snapshots). Render's free disk is wiped on every deploy, so data cannot stay in SQLite or on local disk. Upgrade to paid (Render disk or Lightsail) only if free limits bite. | ✅ |
| A1a | ~~Port to Postgres~~ **Changed:** keep SQLite (≈90 sync call sites) and snapshot it to Supabase Storage instead; restore on boot; refuse to boot if storage is unreachable. `storage.js` | ✅ |
| A1b | Uploads mirrored to a private Supabase bucket before "saved", fetched back on demand; downloads and export read through the same path | ✅ |
| A1c | Free-tier limits accepted: Render sleeps after ~15 min idle (30–50 s cold start); Supabase pauses after ~1 week idle; ~500 MB DB / 1 GB files; no managed backups | ✅ |
| A1d | Daily DB copy kept automatically in the bucket (`db/daily/`). Still run **Download everything** monthly as an off-Supabase backup | 🟡 |
| A1e | `render.yaml` blueprint + tests for storage (31 tests passing) | ✅ |
| A1f | Create Supabase project + private bucket; create Render service from GitHub; set env vars | 🔴 needs account access (Chrome extension not connected, `gh` not logged in) |
| A2 | Auto-deploy on push to `main` (GitHub Action or host's GitHub integration) | 🔴 |
| A0 | Domain `kaizenfolio.com` registered on Cloudflare, auto-renew on | ✅ |
| A3 | **Domain via a free Cloudflare Worker (Oct 2026).** Render's Hobby plan includes 2 custom domains and Pannaipuram uses both (`api.`, `admin.`); a 3rd costs $0.25/month. So `www.kaizenfolio.com` (+ bare → www redirect) is a Worker (`cloudflare/worker.js`, `wrangler.toml`) that forwards to `kaizen-folio.onrender.com`. No Render custom domain. Upgrade path: add `www` as a Render custom domain ($0.25/month) and drop the Worker. Login rate limits see the Worker's IP, not the visitor's (limits are per account too) | 🟡 |
| A4 | Env on prod: `COOKIE_SECURE=1`, `TRUST_PROXY=1`, `ANKUR_DATA_DIR` on a persistent volume, `TZ` | 🔴 |
| A5 | Nightly backup of DB + `uploads/` (e.g. `aws s3 sync`). This is the only copy of the memories. | 🔴 |
| A6 | Rate-limit sign-in (not yet in the app) | 🔴 |
| A7 | First-run check: create real parent account, then invite family | 🔴 |

**Needed from the owner:** domain registrar, preferred host, monthly budget.

## 5. Planned — Phase B: Easier capture 🔴
The #1 risk (WHY.md) is that adding a moment must take ~10 seconds.
- B1 Web Share Target: share a photo or voice note to the installed PWA.
- B2 Quick-add: one screen, photo + one line + area, everything else optional.
- B3 WhatsApp forward (email-in or a bot; needs a decision on privacy).
- B4 Reminders for upcoming events.

## 6. Planned — Phase C: Linked sources (Drive / AWS) 🔴
Only start after D3/D7 are answered. Principle: **link, don't collect.**

### 6.1 Why a user would connect, and what we keep
- Connect once via OAuth. Use the **Google Drive Picker with the `drive.file` scope**, so the app sees only the files the user picks. (`drive.readonly` is a Google "restricted" scope and needs a paid security audit.)
- We store **metadata only**: file ID, name, type, size, owner, created/modified time, Drive `md5Checksum`, our own SHA-256 at link time.
- User can disconnect any time; disconnecting deletes everything we hold about the link.

### 6.2 Requirements
| # | Requirement | Status |
|---|---|---|
| C1 | `sources` table: provider, account, file ID, hashes, linked_at, last_seen, status (`ok` / `changed` / `missing`) | 🔴 |
| C2 | Google OAuth + Picker; link a Drive file to a moment | 🔴 |
| C3 | Provenance record per link (owner, timestamps, hash, revision) | 🔴 |
| C4 | Change watcher: Drive changes API / push notifications → mark item `changed` or `missing` | 🔴 |
| C5 | Alert the user (in-app + email) when a linked file is deleted, trashed or edited | 🔴 |
| C6 | Public-item option: user marks specific items public and we keep a snapshot copy of those only | ❓ |
| C7 | AWS S3 link via read-only cross-account IAM role + external ID; S3 event notifications | 🔴 (after Drive) |
| C8 | Privacy policy and consent screen written in plain language | 🔴 |

### 6.3 Authenticity levels (what we can honestly claim)
| Level | Meaning | How |
|---|---|---|
| Self-declared | The user says so | Default |
| Drive-linked | This account held this exact file, unchanged, on this date | C3 + C4 |
| Third-party verified | A school, teacher, organiser or employer confirms it | Phase D |

We can prove *"held, unchanged, since <date>"*, not *"this person created it"*.

## 7. Planned — Phase D: Third-party verification 🔴 (future)
- D1 Teacher / organiser confirmation link (they click to confirm an entry; we record who and when).
- D2 Verified badge on entry and PDF.
- D3 Import from sources that already attest: GitHub commits, certificate URLs, credential platforms.
- D4 Audit trail of edits (no ledger needed).

## 8. Non-functional requirements
| Area | Requirement |
|---|---|
| Privacy | No public pages by default. Child data never sent to third parties. Maps and fonts are self-contained. |
| Ownership | Everything exportable at any time (✅ ZIP download). |
| Safety | Buddy stays scripted; any real AI model needs guardrails first (fixed persona, no personal-data collection, parent-visible transcripts, off switch). |
| Resilience | Nightly backup; restore tested at least once before relying on it. |
| Simplicity | No build step; vanilla JS; three runtime dependencies. |

## 9. Risks
1. Capture takes too long → app dies in a month (Phase B addresses this).
2. A disciplined family can get 80% of this from Google Photos + a monthly AI prompt.
3. Needs for other families are unvalidated.
4. Drive-linking adds Google verification, privacy-policy and security-review overhead that a private family app doesn't have.

## 10. Open questions
1. ❓ Private family tool only, or also a product for other users (D7)?
2. ✅ Hosting: free Render + Supabase (A1).
3. ❓ Should public/shareable portfolio items exist, and are they snapshots (C6)?
4. ❓ Who counts as a trusted third party for verification (Phase D)?

## 11. Config reference (names and locations only — never values)

| Setting | Where it lives | Notes |
|---|---|---|
| `SUPABASE_URL` | Render environment | Project URL, not secret |
| `SUPABASE_SERVICE_KEY` | Render environment **only** | The `service_role` / secret key. Never in the repo, docs or chat |
| `SUPABASE_BUCKET` | `render.yaml` | `kaizen-folio`, **private** |
| Supabase database password | Password manager | Not used by the app (it uses Storage only) |
| Supabase publishable key | Not used | The app has no browser-side Supabase calls |
| `COOKIE_SECURE`, `TRUST_PROXY`, `TZ` | `render.yaml` | Already set |
| Domain `www.kaizenfolio.com` (+ bare `kaizenfolio.com` redirecting to it) | Cloudflare Worker `kaizen-folio-proxy` with custom domains (no manual DNS records; delete any old `www`/`@` records first) | Domain registered on Cloudflare |

## 12. Next actions
1. Pick the host and register DNS for the Kaizen Folio domain (Phase A).
2. Deploy, set up the nightly backup, start the 6–8 week family trial.
3. Revisit Phases B–D based on what the trial shows.
