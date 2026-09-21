# Coinlo

A personal budget and expense management application, deployed at
[coinlo.netlify.app](https://coinlo.netlify.app/). See `PHASE_LOG.md` for the
full 42-phase build plan, current status, and design decisions — the app was
built and documented under the working name "Budget Tracker" and renamed to
Coinlo once its Netlify domain was registered, so earlier phase entries refer
to it by the old name.

## Tech stack

- React 19 + TypeScript (strict) + Vite
- Firebase Authentication + Firestore
- MUI (Material UI) for components and theming
- React Router for navigation
- React Hook Form + Zod for forms and validation
- Recharts for charts (Phase 11+)
- Vitest + Testing Library for tests

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Firebase project config
npm run dev
```

The app runs at http://localhost:5173 by default.

## Scripts

| Script             | Purpose                                  |
| ------------------ | ----------------------------------------- |
| `npm run dev`       | Start the Vite dev server                |
| `npm run build`     | Type-check and build for production      |
| `npm run preview`   | Preview the production build locally     |
| `npm run lint`      | Run oxlint                                |
| `npm run test`      | Run the Vitest suite once                |
| `npm run test:watch`| Run Vitest in watch mode                 |

## Environment variables

Firebase web config is read from `VITE_FIREBASE_*` variables (see
`.env.example`). These are safe to expose client-side — access control comes
from Firestore/Auth security rules, not from keeping the config secret.
`.env` is git-ignored; never commit real values there to source control if
this repo is pushed anywhere shared.

## Deploying Firestore security rules and indexes

`firestore.rules` grows collection-by-collection as each phase adds one (see
PHASE_LOG.md). `firebase.json` and `.firebaserc` are already set up to point
at the `budget-tracker-c4508` project, so after any change to
`firestore.rules`, deploy it with:

```bash
npx firebase-tools deploy --only firestore:rules
```

(`npx firebase-tools login` first, if this is the first time deploying from
this machine — it opens a browser to sign in with the Google account that
owns the Firebase project.) Alternatively, paste the file's contents into
Firebase Console → Firestore Database → Rules → publish, no CLI required.

Some list queries filter by `userId` *and* order by another field (e.g.
accounts ordered by `createdAt`) — Firestore requires a composite index for
that combination and won't create one automatically. Those are tracked in
`firestore.indexes.json` and deploy the same way:

```bash
npx firebase-tools deploy --only firestore:indexes
```

If a page ever shows "The query requires an index" with a console link, that
link creates the missing one immediately (indexes can take a minute or two
to finish building) — add the same index to `firestore.indexes.json`
afterwards so a future full deploy doesn't lose track of it.

## Deploying Storage security rules (Phase 19+)

Receipts (Phase 19) are the first feature that store a file rather than
just Firestore data. `storage.rules` needs its own deploy, separate from
Firestore's:

```bash
npx firebase-tools deploy --only storage
```

Make sure Firebase Storage itself has been enabled for this project in the
Firebase Console first (Build → Storage → Get started) if it hasn't been
already — the CLI deploy only pushes the rules, it doesn't provision the
Storage bucket.

## Deploying to Netlify

The app is hosted at [coinlo.netlify.app](https://coinlo.netlify.app/),
built from this repo's `main` branch. `netlify.toml` configures the build
(`npm run build`, publishing `dist/`) and a catch-all redirect to
`index.html` — required because this is a client-side-routed (React
Router) single-page app, so every path needs to fall through to the app
shell rather than 404ing on Netlify's static file server.

Firebase web config isn't committed (`.env` is git-ignored), so it has to
be set as Netlify environment variables separately — Site configuration →
Environment variables — using the same `VITE_FIREBASE_*` names as
`.env.example`. These are safe to expose (see "Environment variables"
above); Netlify's UI just needs its own copy since it can't read `.env`.

### Branding and SEO

The app is branded as "Coinlo" (see `src/components/common/CoinloMark.tsx`
for the logo mark, and `scripts/generate-brand-assets.mjs` for how the
favicon/social-preview PNGs were generated from it) and `index.html` carries
a description, Open Graph/Twitter card tags, and a canonical URL pointing
at the Netlify domain; `public/robots.txt` and `public/sitemap.xml` list
the three pages a logged-out visitor can actually reach (`/login`,
`/register`, and `/`, which redirects to `/login`).

Worth being upfront about: this is a client-rendered, login-gated app —
everything past the login screen requires a real account, so there's
essentially no public content for Google to index or rank on competitive
terms. The tags above make what *is* public (the login/register screens,
and how a shared link previews on social platforms) as clean as they can
be, but they won't make an authenticated personal-finance tool rank the
way a public marketing site or blog would. A dedicated public landing page
describing the product (rather than an immediate redirect to `/login`)
would do more for organic search than any further meta-tag work, if that's
ever wanted.

## Project structure

```
src/
  components/
    common/       Reusable UI primitives (DataTable, StatCard, form fields,
                   loading/empty/error states, PageHeader, ComingSoonPage)
    layout/        AppLayout (sidebar + topbar), AuthLayout
  config/          Static app config (nav items)
  context/         React context providers (color mode, notifications,
                   confirm dialog)
  firebase/        Firebase app/auth/firestore initialization
  pages/           One folder per route/feature area
  routes/          Router definition and route guard
  theme/           MUI theme (light/dark palettes, typography, overrides)
  types/           Shared TypeScript types
  utils/           Formatting helpers (currency, dates) — the single source
                   of truth for how money and dates are displayed
```

## Notes on this MUI version

The installed `@mui/material` (v9) does not merge the classic system-style
shorthand props (`display`, `gap`, `p`, `mt`, …) into `Box`/`Stack`/
`Typography`'s prop types the way older MUI versions did — only `sx` is
type-checked for those. Every component in this codebase uses `sx` for
layout/spacing and keeps only each component's real own-props (e.g.
`Typography`'s `variant`/`color`/`align`, `Stack`'s `direction`/`spacing`) at
the top level. Keep following that convention in new code so `tsc` stays
clean.
