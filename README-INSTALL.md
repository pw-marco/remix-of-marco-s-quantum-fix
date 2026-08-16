# PW-MARCO — Guest Mode + Auth Toggle + Global PenPencil Token

## Install
1. Apne pwmarco repo ke root me is folder ke saare files **same path** par copy/replace kar do
   (`middleware.ts`, `lib/`, `models/`, `utils/`, `pages/api/...`, `app/...`, `scripts/`, `package.json`).
2. `npm install` (package.json me `setup` / `reset-password` / `cleanup-guests` scripts add hue hain, `tsx` already hai).
3. Vercel Environment Variables me ye zaroori hain: `MONGODB_URI`, `JWT_SECRET`, `BASE_URL`, `PW_API`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
4. Admin login API pehli successful `ADMIN_USERNAME` / `ADMIN_PASSWORD` login par DB config ko automatically initialize/sync kar deta hai. Local setup ke liye `npm run setup` bhi available hai.
5. `npm run dev` ya deploy.

Admin login hamesha `ADMIN_USERNAME` / `ADMIN_PASSWORD` Vercel env values se karein. Credentials source code ya GitHub me commit na karein.
Password badalna ho: `ADMIN_PASSWORD="NewPass" npm run reset-password`.

## Kya kaam karta hai

**Auth OFF (guest mode)** — Admin → Settings → *Authentication* toggle:
- Koi bhi page kholte hi cookie na ho to middleware `/api/auth/guest` se turant ek naya
  guest user (`isGuest: true`, unique `guestId`) DB me bana kar JWT cookies set kar deta hai.
- `/auth` page kabhi nahi dikhta — redirect hone ki jagah seedha guest session ban jata hai.
- Cookie expire ho jaye ya guest logout kare (`/api/logout`) → usi request me naya guest session.
- Guest ko full access milta hai (batches, schedule, PDF, video).

**Auth ON** — sab kuch pehle jaisa (OTP/login, `/auth` page, normal redirects).

**Admin panel hamesha protected hai** — auth OFF hone par bhi `/admin/*` ke liye admin login zaroori.

**Global PenPencil token** — Admin → Settings → *Global PenPencil Token*:
- Access token (aur optional refresh token) DB (`ServerConfig`) me save hota hai, response me masked aata hai.
- Guest / auth-OFF requests me ye global token use hota hai; logged-in user ka apna token ho to wahi priority leta hai.
- `Clear` button token hata deta hai.

## Maintenance
- `npm run cleanup-guests` → 7 din se purane guest users delete (ya `GUEST_MAX_AGE_DAYS=3`).

## Note
`npm run build` local par tabhi complete hota hai jab MongoDB reachable ho — ye original repo ka
behaviour hai (kuch pages build par `serverInfo` fetch karte hain), meri changes se nahi.
