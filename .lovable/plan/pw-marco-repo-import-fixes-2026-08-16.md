# PW Marco — repo import + fixes

Aapka repo `guest-session-manager` (Next.js 15 + MongoDB/Mongoose) is project me exact same structure me import hoga, uske baad neeche ke 5 fixes lagenge. Phir GitHub connect karke Vercel par host kar sakte hain.

Note: import ke baad Lovable ka live preview is app ko chala nahi paayega (ye template TanStack ke liye configured hai). Code editing + GitHub sync + Vercel deploy normal chalega; testing Vercel preview URL par hogi.

## 1. Repo import (exact same files/folders)

- Repo ke saare 209 files/folders as-is copy: `app/`, `pages/api/`, `components/`, `lib/`, `models/`, `utils/`, `scripts/`, `public/`, `batch/`, `static/`, plus `next.config.mjs`, `middleware.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `package.json`, `bun.lock`, `components.json`, `globals.d.ts`, `ecosystem.config.cjs`, README files.
- Template ke TanStack-only files (`src/`, `vite.config.ts`, `bunfig.toml`, TanStack deps) hata diye jayenge, warna do frameworks clash karenge.
- `.gitignore` repo wala rahega (`.env.local` ignored).

## 2. "No batches found" (admin batches)

Root cause (verify-then-fix): aapka `MONGODB_URI` me database name nahi hai (`.../?appName=Cluster0`), isliye Mongoose default `test` DB se padhta hai — jabki repo ka `scripts/import-batches.cjs` batches ko `pw-marco` DB ki `batches` collection me daalta hai. (Sandbox se Atlas SRV lookup block hai, isliye pehla step live verify hoga.)

- `lib/mongodb.ts` me connection ko explicit banana: `mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "pw-marco" })`, aur URI me DB name ho to wahi respect ho.
- Ek admin-only diagnostics endpoint (`/api/admin/db-status`) jo batataye: connected DB name, `batches` count, `users` count, `serverconfigs` count. Isse turant pata chalega ki data kis DB me hai.
- `app/admin/batches/page.tsx` me empty state ko informative banana (kitne total, kaunsi DB, error message) taki "No batches found" ke peeche ka reason dikhe.
- Agar diagnostics `test` DB me data dikhaye to `MONGODB_DB` ya URI adjust karna hai — Vercel me exact value main bata dunga.

## 3. PW QUANTUM brand/logo flash

- `app/page.tsx`, `app/contact/page.tsx` ke fallback `"PW Quantum"` ko hata kar brand `"PW MARCO"` (aur env `NEXT_PUBLIC_APP_NAME`) use hoga.
- Naam/logo ko tab tak render nahi karenge jab tak `serverInfo` load na ho — placeholder/skeleton dikhega, isliye purana brand ek frame ke liye flash nahi karega.
- Default logo/sidebar values (`lib/defaults.ts`, sidebar/header components) me bhi PW Marco branding set hogi; PW Quantum ka koi bhi text/logo asset reference hataya jayega.

## 4. Telegram links → `t.me/official_marco_22`

- Ye jagah update hongi: `app/study/page.tsx`, `app/check/page.tsx`, `app/contact/page.tsx`, `app/auth/login.tsx` (`telegram.me/...`), `app/components/PromotionPopup.tsx`, `app/admin/settings/page.tsx` placeholder.
- Ek single constant (`lib/defaults.ts` → `TELEGRAM_LINK = "https://t.me/official_marco_22"`) banega aur sab jagah wahi use hoga, taki aage change ek file me ho.
- Admin settings me `tg_channel`/`tg_username`/`tg_bot` ke defaults bhi `official_marco_22` ho jayenge (DB me purani value ho to admin se badal sakte hain — bata dunga kahan).

## 5. Admin panel: naye access/refresh token update

- Backend (`pages/api/admin/adminServer.ts`) already tokens save karta hai; UI/flow complete kiya jayega: Admin → Settings → "PenPencil Tokens" card me Access Token + Refresh Token + Random ID fields, "Save", "Clear", masked current value, last-updated time, aur ek "Test token" button jo `api.penpencil.co` par ek call karke bataye token valid hai ya expired.
- Save ke baad token cache invalidate hoga (`invalidatePenpencilTokenCache`) taki naya token turant use ho.

## 6. Auth enable karne par login + tokens DB me save

- `authEnabled: true` par login PW phone number + OTP (api.penpencil.co) se chalega.
- `pages/api/auth/login.ts` me abhi hard-fail hai jab `ServerConfig` doc missing ho ("Server configuration not Setup!") aur `isDirectLoginOpen` false hone par user na mile to "User not found!" — isliye login khulta hi nahi. Fix: pehli request par default `ServerConfig` (id 1) auto-create ho aur direct login default ON ho, taki naya PW number bhi OTP maang sake.
- Hardcoded `Randomid` hata kar per-request UUID.
- OTP verify hone par DB me save hoga (`models/User.ts`): `ActualToken` (PenPencil access token), `ActualRefresh`, `randomId`, app ka `refreshToken`, expiry/updatedAt — aur enrolled batches ke `enrolledTokens` bhi update honge (ye logic already hai, isko auth-ON path se reliably chalayenge).
- Admin → Users me har user ke token status (valid/expired, last updated) dikhega.

## 7. Security (important)

Aapne chat me MongoDB password, JWT secret aur admin password share kiye hain, aur repo ke `lib/defaults.ts` me ek real PenPencil token + admin password hardcoded hai. Plan me: hardcoded secrets hata kar sirf env se padhna, aur aapko rotate karna chahiye — MongoDB user password, `JWT_SECRET`, admin password.

## Vercel env (final list)

`MONGODB_URI`, `MONGODB_DB` (naya — DB name, e.g. `pw-marco`), `JWT_SECRET`, `PW_API`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `BASE_URL`, optional `NEXT_PUBLIC_APP_NAME=PW MARCO`, `TELEGRAM_BOT_TOKEN` (agar bot verification chahiye).

## Technical notes

- Framework: Next.js 15 (App Router + `pages/api` hybrid), Mongoose models, `middleware.ts` JWT gate via `jose`, guest-session mode `ServerConfig.authEnabled` se.
- Import ke baad build check `next build` se hoga.
- Diagnostics endpoint admin JWT cookie (`admin_token`) se protected rahega.
