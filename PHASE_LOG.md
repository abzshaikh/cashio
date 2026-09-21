# Budget Tracker — Build Log

Multi-phase build (42 phases) of an industry-grade Personal Budget & Expense
Management Application. This file is the durable, in-repo record of the plan,
the proposed data model, and what has actually been built and verified in
each phase. A lightweight pointer to this file also lives in the attached
Cowork project so future sessions know where to look.

**Process rule (per the user's explicit instructions):** implement ONE phase
at a time, run type-check/build/lint/tests after each, fix all issues, then
stop and wait for "Continue to Phase N" before proceeding. Never batch
multiple phases in one pass.

## Tech stack

React 19 + TypeScript (strict) + Vite, Firebase Authentication + Firestore,
MUI v9, React Router v7, React Hook Form + Zod, Recharts, Vitest + Testing
Library. Chosen because the project started from an empty folder and this is
exactly the stack the user asked for when starting from scratch.

## Firestore data model (proposed, refined phase by phase)

All collections are scoped per user via a `userId` field plus Firestore
security rules that check `request.auth.uid` — the client never gets to
assert whose data it's writing (Phase 31). **Phase 34 (COMPLETE):** every
monetary field, in every collection below, is now stored as an integer
number of minor units (paise for INR) rather than a decimal major-unit
float — and that convention holds domain-wide, not just at the Firestore
boundary: `Transaction.amount`, `Account.currentBalance`, `Budget.
overallAmount`, and every other stored amount field is minor units the
moment it's read out of a service function, all the way through the
calculation layer. The only place decimals reappear is at the human-facing
edges — form fields, filter inputs, CSV/PDF exports — which stay
major-unit decimals and convert at a single choke point (`utils/money.ts`'s
`toMinorUnits`/`toMajorUnits`) right at that boundary. See Phase 34's own
section below for the full design.

- **users** — profile: name, email, currency (default INR), country,
  timezone, financial preferences. Keyed by Firebase Auth UID.
- **accounts** — cash/bank/savings/credit-card/wallet/investment/other.
  name, type, institution, openingBalance, currentBalance, currency, status,
  notes, createdAt. Credit cards add creditLimit, statementDate, dueDate.
- **transactions** — the unified ledger. type (income/expense/transfer/
  refund/adjustment), amount (number, never a formatted string), accountId,
  categoryId, subcategoryId, date, description, merchant, paymentMethod,
  tags (array of tagId), notes, receiptId, createdAt, updatedAt. Transfers
  reference both a fromAccountId and toAccountId and are excluded from
  income/expense aggregates everywhere (Rule 4).
- **categories** / **subcategories** — default seeded set (Housing, Food,
  Transportation, Shopping, Health, Entertainment, Education, Financial,
  Other, each with subcategories) plus user-created custom ones. A category
  has a parentId of null; a subcategory references its parent category.
- **budgets** — period (monthly/weekly/custom), startDate, endDate, overall
  or per-category, warning/over thresholds.
- **budgetItems** — one per category within a budget: categoryId, amount.
- **recurringTransactions** — amount, frequency (daily/weekly/monthly/
  quarterly/yearly), startDate, endDate, accountId, categoryId, description,
  nextOccurrence (computed).
- **subscriptions** — a specialized view over recurring expenses: service
  name, amount, billingCycle, nextBillingDate, categoryId, accountId,
  status.
- **savingsGoals** — name, targetAmount, currentAmount, targetDate,
  category, notes.
- **goalContributions** — amount, date, goalId, optional linked
  transactionId.
- **debts** — lender, originalAmount, outstandingAmount, interestRate,
  minimumPayment, paymentDate, startDate, endDate.
- **assets** / **liabilities** — for net worth (Phase 27): type, label,
  value, asOf. Designed so new asset/liability types can be added without a
  schema migration.
- **tags** — user-defined labels (Vacation, Business, Family, …), many-to-
  many with transactions via the `tags` array on each transaction.
- **receipts** — storage reference, merchant, date, amount, linked
  transactionId; architecture leaves room for OCR fields (Phase 19) without
  requiring them now.
- **notifications** (Phase 35, COMPLETE) — sourceKey, severity, title,
  message, actionLabel, actionPath, read, createdAt. Persisted from Phase
  24's `Insight[]` rule engine, not a separate rule set of its own — see
  Phase 35's own section below.
- **auditLogs** — userId, action, entity, entityId, previousValue,
  newValue, timestamp (Phase 30).
- **settings** (Phase 36, COMPLETE) — one document per user at
  `settings/{uid}` (not a list like every other collection above):
  defaultBudgetPeriod, defaultBudgetWarningThreshold,
  defaultBudgetOverThreshold, defaultAccountId, defaultCategoryId,
  notifyOnSeverity (per-`InsightSeverity` on/off), updatedAt. `theme` is
  deliberately *not* stored here — see Phase 36's own section below for
  why.

Business rules that the calculation engine (Phase 33) must centralize and
every feature must respect: income increases account balance; expense
decreases it; transfers move money between two accounts and are never
counted as income or expense; deleting or editing a transaction must
correctly reverse the old balance effect before applying the new one;
budget-vs-actual must be computed from real transactions for that
category/period, never a cached/duplicated number.

## Phase plan and status

| # | Phase | Status |
|---|-------|--------|
| 1 | Project foundation (layout, navigation, routes, reusable components, theming) | **Complete** |
| 2 | User authentication (register/login/logout/reset/profile) | **Complete** |
| 3 | Financial accounts (multi-account CRUD) | **Complete** |
| 4 | Income management | **Complete** |
| 5 | Expense management | **Complete** |
| 6 | Expense categories (default set + custom) | **Complete** |
| 7 | Unified transaction system | **Complete** |
| 8 | Account transfers | **Complete** |
| 9 | Budget management | **Complete** |
| 10 | Budget vs actual | **Complete** |
| 11 | Dashboard | **Complete** |
| 12 | Reports & analytics | **Complete** |
| 13 | Date filtering | **Complete** |
| 14 | Recurring transactions | **Complete** |
| 15 | Subscription tracker | **Complete** |
| 16 | Savings goals | **Complete** |
| 17 | Debt tracking | **Complete** |
| 18 | Credit card management | **Complete** |
| 19 | Receipt management | **Complete** |
| 20 | Transaction search | **Complete** |
| 21 | Tags | **Complete** |
| 22 | Monthly financial summary | **Complete** |
| 23 | Yearly summary | **Complete** |
| 24 | Spending insights (rule-based) | **Complete** |
| 25 | Budget templates | **Complete** |
| 26 | Smart budget suggestions | **Complete** |
| 27 | Net worth | **Complete** |
| 28 | Import data (CSV) | **Complete** |
| 29 | Export data (CSV/PDF) | **Complete** |
| 30 | Audit & data history | **Complete** |
| 31 | Security (Firestore rules) | **Complete** |
| 32 | Database design | Ongoing — see schema above, refined each phase |
| 33 | Financial calculation engine | **Complete** |
| 34 | Money precision | **Complete** |
| 35 | Notifications | **Complete** |
| 36 | Settings | **Complete** |
| 37 | Mobile experience | Ongoing — responsive shell done in Phase 1 |
| 38 | Quick add transaction | **Complete** |
| 39 | Dashboard customization | **Complete** |
| 40 | Performance | Ongoing — route-level code splitting done in Phase 1 |
| 41 | Testing | Ongoing — Vitest set up, 1113 tests passing |
| 42 | Final quality review | **Complete** |

## Phase 1 — Project Foundation (COMPLETE)

**Starting state:** the connected folder was completely empty. A doc in the
attached Cowork project had described a prior "Phase 1 complete" build of an
unrelated Inventory Management System in this same folder/Firebase project —
that record was stale (the folder held nothing) and has been corrected; see
the project's `phase-log.md`.

**Delivered:**

- Vite + React 19 + TypeScript (strict) scaffold, with oxlint as configured
  by the template.
- App shell: responsive sidebar/topbar layout (`AppLayout`) with a permanent
  drawer on desktop and a temporary (slide-over) drawer on mobile, plus a
  separate centered `AuthLayout` for the login/register/forgot-password
  screens.
- Routing for all Phase 1 routes: Dashboard (`/`), Transactions, Accounts,
  Budgets, Goals, Reports, Settings, Login, Register, Forgot Password, and a
  404 catch-all. Route-level code splitting via `React.lazy` + `Suspense`.
  A `ProtectedRoute` skeleton exists but currently passes children through —
  real auth-state gating arrives in Phase 2.
- Light/dark theme via a custom MUI theme (`theme/theme.ts`) with a status
  color palette (safe/warning/nearLimit/over) reserved for budget indicators
  in Phase 10, toggled and persisted to `localStorage` by `ColorModeContext`.
- Reusable component library: `DataTable` (sortable, paginated, loading/
  empty/error states built in), `StatCard`, `PageHeader`, `CurrencyText`,
  `LoadingState`, `EmptyState`, `ErrorState`, `ComingSoonPage` (used by every
  not-yet-built feature page so routes are real and navigable without
  building ahead of scope), RHF+MUI form field wrappers (`FormTextField`,
  `FormSelect`, `FormDatePicker`), a global toast notification system
  (`NotificationContext` + `useNotification`), an imperative confirm-dialog
  system (`ConfirmDialogContext` + `useConfirm`), and a class-based
  `ErrorBoundary`.
- Centralized formatting utilities: `formatCurrency` (INR by default, with
  sign display and other-currency support), `formatNumber`, `formatPercent`,
  and `formatDate`/`formatDateTime`/`formatRelative` (Firestore-Timestamp
  aware). These are the only place currency/date formatting should happen —
  never format inline in a component.
- Firebase app initialization (`firebase/config.ts`) reading config from
  `VITE_FIREBASE_*` environment variables, with `.env`/`.env.example`.
  Analytics is intentionally **not** initialized (see comment in that file —
  it makes network calls on boot that throw console errors for any user on
  a restricted network or with a tracker blocker, and nothing in this app
  uses it yet).
- Vitest + Testing Library set up; 23 tests passing covering the formatting
  utilities, `DataTable`, `ColorModeContext`, `NotificationContext`, and
  `ComingSoonPage`.

**Verified:**

- `tsc -b --noEmit` — clean.
- `npm run build` — succeeds; route-based + vendor chunking (MUI, Firebase,
  Recharts split into separate chunks) keeps the initial bundle warning-free.
- `npm run lint` (oxlint) — 0 errors (a few benign `only-export-components`
  fast-refresh warnings from colocating providers with their hooks, and from
  the lazy-loaded route table — standard and non-blocking).
- `npm run test` — 23/23 passing.
- Dev server boots; a full Playwright pass over every Phase 1 route at both
  desktop (1280×800) and mobile (375×667) viewports showed **zero browser
  console errors**, correct light/dark theming, and correct responsive
  behavior (drawer collapses to a hamburger + slide-over on mobile, and
  navigating via it closes the drawer and routes correctly).

**Known MUI v9 quirk (see README "Notes on this MUI version"):** this
version's `Box`/`Stack`/`Typography` types no longer accept the classic
system-style shorthand props (`display`, `gap`, `p`, `mt`, etc.) directly —
only `sx` is typed for those. Every component in this codebase already
follows the `sx`-only convention; keep doing so in later phases.

## Phase 2 — User Authentication (COMPLETE)

**Delivered:**

- Firebase email/password registration (first name, last name, email,
  password, confirm password) with Zod validation: required fields, email
  format, password strength (min 8 chars, upper+lower+digit, with a live
  `PasswordStrengthMeter`), and password-confirmation matching.
- Login with email/password, a "Remember me" checkbox that toggles Firebase
  Auth persistence (`browserLocalPersistence` vs `browserSessionPersistence`
  via `setPersistence`, applied before sign-in), and a link to forgot
  password. A user landing on a protected route while signed out is bounced
  to `/login` with the originally requested path preserved, and sent back
  there after a successful sign-in.
- Forgot password / reset email via `sendPasswordResetEmail`. The response
  is identical whether or not the email is registered (Firebase's
  `auth/user-not-found` is treated as success) so the form can't be used to
  enumerate accounts — genuine errors (network, rate limiting) still surface
  normally.
- Logout via a new account menu on the topbar avatar (shows the user's
  initials or photo, name, and email).
- User profile management, added to the Settings page (the natural home
  for it, since a dedicated Phase 36 Settings build doesn't exist yet):
  first/last name, profile image (as a pasted URL with a live avatar
  preview — see note below on why not a file upload), currency (INR
  default, curated list of common currencies), country (curated list), and
  timezone (from the browser's own IANA database via
  `Intl.supportedValuesOf('timeZone')`, with a small static fallback).
  Email is shown read-only; changing it needs re-authentication and is
  deferred.
- `AuthContext` centralizes all of this: Firebase auth state
  (`onAuthStateChanged`), the Firestore profile document, and
  `login`/`register`/`logout`/`resetPassword`/`updateProfile`. A new
  `userProfileService.ts` holds the Firestore reads/writes for
  `users/{uid}` — the first of what PHASE_LOG.md's "services" pattern will
  look like for every other collection.
- `ProtectedRoute` is now real (redirects signed-out users to `/login`,
  shows a full-screen loading state during the initial auth check so
  already-signed-in users don't flash the login page). A new
  `PublicOnlyRoute` does the inverse — signed-in users are redirected away
  from `/login`, `/register`, `/forgot-password`.
- `firestore.rules` (new file) — the first real security rules, scoped to
  the `users/{uid}` collection this phase touches: a user may only read or
  write their own profile document, `uid`/`email` can't be changed by a
  client-side update, and everything else is default-denied until its own
  phase adds explicit rules. **This needs to be deployed manually** — paste
  it into Firebase Console → Firestore Database → Rules, or run
  `firebase deploy --only firestore:rules` with the Firebase CLI. Until
  it's deployed, Firestore is presumably still in whatever mode the project
  started in (test mode = wide open, or locked mode = nothing works) —
  worth checking now that real user documents are being written.
- A centralized `firebaseErrors.ts` maps Firebase Auth error codes (wrong
  password, email in use, weak password, too many requests, network
  failure, …) to one user-facing message each, used by every auth form.

**Deliberately deferred / scoped down:**

- Profile image is a pasted URL, not a Storage file upload — avoids
  standing up Firebase Storage security rules in an auth-focused phase.
  Revisit alongside Phase 19 (receipts), which needs Storage anyway.
- "Financial preferences" (default budget period, warning threshold, etc.)
  stay in Phase 36 — Phase 2's profile only covers identity/locale fields.

**Verified:**

- `tsc -b --noEmit`, `npm run build` (vendor chunking split further —
  `firebase/auth` and `firebase/firestore` now warrant their own chunks —
  still zero size warnings), `oxlint` (0 errors, same benign fast-refresh
  warnings as Phase 1), `npm run test` — 52/52 passing (29 new: Zod schema
  validation, the Firebase error mapper, the password strength meter,
  `ProtectedRoute`/`PublicOnlyRoute` redirect behavior with a mocked auth
  state, and the Settings profile form).
- A Playwright pass confirmed: an unauthenticated visit to any protected
  route redirects to `/login`; all three auth forms correctly show their
  client-side validation errors (required fields, invalid email, weak
  password, mismatched confirmation) without any network call; and a
  real sign-in attempt correctly surfaces a friendly error end-to-end (this
  sandbox has no network access to Firebase's endpoints, which incidentally
  verified the network-error path in `firebaseErrors.ts` for free). No
  unexpected console errors anywhere.
- Firebase Auth/Firestore calls themselves are **not** exercised end-to-end
  from this sandbox — its egress policy blocks Firebase's endpoints
  entirely, same as it blocked Analytics in Phase 1. The user should do one
  real registration + login themselves once this reaches their browser to
  confirm the live Firebase project accepts it (and to deploy
  `firestore.rules`, without which Firestore reads/writes may fail
  regardless of the code being correct).

## Phase 3 — Financial Accounts (COMPLETE)

**Delivered:**

- `Account` data model (`types/account.ts`): `cash | bank | savings |
  credit_card | wallet | investment | other` types, `active | inactive |
  closed` statuses, `openingBalance` (immutable after creation) and
  `currentBalance` (starts equal to it). From Phase 4 onward,
  `currentBalance` is only ever changed by the centralized
  transaction/transfer logic — never edited directly through the Accounts
  UI, so it always stays reconcilable against the transaction history
  (Rules 1–3, 5, 6).
- `services/firestoreCollection.ts` — a generic
  `createUserScopedCollection<T>(collectionName, mapDoc)` factory
  (create/update/remove/getById/getAllForUser/subscribeForUser, all scoped
  to `userId`, with `createdAt`/`updatedAt` managed automatically). Built
  once here specifically so every future collection (transactions, budgets,
  goals, debts, subscriptions, recurring transactions, …) reuses it instead
  of re-implementing the same query/CRUD boilerplate — see the comment in
  that file.
- `services/accountService.ts` — accounts-specific CRUD + realtime
  `subscribeToAccounts`, built on the factory above.
- Accounts page (`pages/accounts/AccountsPage.tsx`): realtime account list
  as cards (name, type icon, institution, masked account number, current
  balance, status chip), a total-balance `StatCard` per currency present
  (balances in different currencies are never summed together — no
  conversion rate exists until Phase 27), an "Add Account" form dialog
  (create and edit), and delete with a confirmation dialog. Loading/empty/
  error states all use the existing shared components.
- `AccountFormDialog` — React Hook Form + Zod (`accountFormSchema`) create/
  edit dialog. `openingBalance` is editable only when creating an account;
  once created it's shown disabled with an explanatory helper text, since
  it's the historical starting point and mustn't drift from what actually
  happened.
- `utils/accountFormatting.ts` — `maskAccountNumber` (masks a long numeric
  identifier to its last 4 digits; leaves short or non-numeric values, like
  a wallet's display name, untouched) and `sumBalancesByCurrency` (sums
  **active-only** account balances grouped by currency).
- `firestore.rules` extended with an `accounts/{accountId}` block: a user
  may only read, update, or delete their own accounts (`request.auth.uid`
  checked against the stored `userId`, never a client-sent value), a create
  must set `userId` to the caller's own uid and `currentBalance` equal to
  `openingBalance`, and `openingBalance` is immutable on update — enforced
  by comparing `request.resource.data.openingBalance` (the full document
  state Firestore would end up in) against the currently stored value, so
  a partial `updateDoc` that never touches that field still passes.
  **This needs to be deployed** the same way Phase 2's `users/{uid}` rules
  were (Firebase Console → Firestore Database → Rules, or
  `firebase deploy --only firestore:rules`).

**Notable implementation detail:** Zod v4's `z.coerce.number()` (used for
the opening-balance field, so the HTML number input's string value coerces
to a number) has an `unknown` input type but a `number` output type. That
mismatch doesn't quite fit `@hookform/resolvers/zod`'s inferred resolver
type against a single `AccountFormValues` type used everywhere else in this
form (and in `FormTextField`/`FormSelect`, which only support a single
`TFieldValues` generic, not RHF's separate input/output generics). Rather
than thread that complexity through every shared form component, the
resolver is cast to `Resolver<AccountFormValues>` with a comment explaining
why — the coercion still happens correctly at runtime. Worth knowing about
before any future phase adds another coerced numeric field.

**Also fixed while building this:** an oxlint `set-state-in-effect` warning
in `AccountFormDialog` (an earlier draft used a `useEffect` to `reset()` the
form whenever the dialog reopened for a different account). Fixed by only
mounting the form fields while the dialog is `open` (`{open && <.../>}`)
instead of keeping them mounted and resetting them — `useForm`'s
`defaultValues` then picks up the right values on every fresh mount, with
no effect needed at all. `StatCard`'s `value` prop was also widened from
`string` to `ReactNode` so a `<CurrencyText/>` can be passed directly
(keeps formatting centralized instead of duplicating it as a plain string).

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean (a new `AccountsPage`
  chunk split out automatically by the existing route-based code splitting).
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from Phases 1–2.
- `npm run test` — 82/82 passing (30 new: `accountFormSchema` validation
  including numeric coercion, `maskAccountNumber`/`sumBalancesByCurrency`,
  `AccountCard`'s rendered fields and menu actions, `AccountFormDialog`'s
  create/edit modes, validation, submit and error-surfacing behavior, and
  `AccountsPage`'s empty/loaded/error states plus create and delete flows
  against a mocked `accountService`).
- A Playwright pass confirmed no regressions to the routes built in
  Phases 1–2 (an unauthenticated visit to `/accounts` still correctly
  redirects to `/login`, mobile viewport still renders correctly, zero
  console errors anywhere).
- As with Phase 2, this sandbox has no network access to Firebase, so the
  actual authenticated Accounts CRUD flow against the live Firestore
  project isn't exercised end-to-end here — that's covered by the
  component/integration tests above instead. Once this reaches the user's
  browser (and `firestore.rules` is redeployed with the new `accounts`
  block), they should confirm: creating an account, editing one, deleting
  one, and that balances shown match what was entered.

**Post-delivery fixes (same day, after the user deployed the rules above):**

- The user's first deploy attempt hit `Error: Not in a Firebase app
  directory` — Phase 2 had added `firestore.rules` but nothing had ever set
  up the Firebase CLI project itself. Added `firebase.json` (points at
  `firestore.rules` and `firestore.indexes.json`) and `.firebaserc`
  (default project `budget-tracker-c4508`); documented `npx firebase-tools
  deploy --only firestore:rules` (and `... login` for first-time auth) in a
  new README section. Deploy succeeded after this.
- Right after that, the Accounts page itself hit `The query requires an
  index` — `subscribeToAccounts` filters by `userId` and orders by
  `createdAt`, a shape Firestore only serves from a composite index it
  doesn't create automatically. Added that index to `firestore.indexes.json`
  and a doc comment on `firestoreCollection.ts`'s `ListOptions` flagging
  that **every future collection built on this factory that also orders its
  list needs its own composite index added up front**, not discovered via a
  runtime error. README now also documents `npx firebase-tools deploy
  --only firestore:indexes`.

**Next phase when instructed ("Continue to Phase 4"):** Phase 4 — Income
Management.

## Phase 4 — Income Management (COMPLETE)

**Delivered:**

- Income tracking, built into the **Transactions** page (`/transactions`)
  rather than a separate route — the product spec's own navigation section
  describes that page as "Income, expenses and transfers", so this phase
  starts populating it for real instead of building a throwaway page that
  Phase 7 would have to replace. Data model: a single `transactions`
  Firestore collection (as PHASE_LOG.md's schema already proposed) with a
  `type` field currently restricted to `'income'` — `TRANSACTION_TYPES` in
  `types/transaction.ts` grows by one value per phase as each type's real
  UI/logic actually lands (`expense` in Phase 5, `refund`/`adjustment` in
  Phase 7, `transfer` in Phase 8), so a type appearing in that union always
  means something real supports it, never a preview of future scope.
- Income entry fields exactly per spec: amount, date, account, category (one
  of the 9 listed types — Salary, Freelance Income, Business Income,
  Interest, Rental Income, Bonus, Gift, Refund, Other Income — a fixed enum
  for now, distinct from Phase 6's flexible category system which is scoped
  to *expense* categories), source (free text — who/where it came from),
  description, notes, and a "recurring" flag (`isRecurring`) that just
  records intent; Phase 14 builds the actual recurring-generation engine
  against it later, so nothing needs to be re-asked then.
- `services/transactionService.ts` — create/update/delete all run as a
  single atomic Firestore `runTransaction` that writes the transaction
  *and* adjusts its account's `currentBalance` together, so a failure
  partway through can never desync the two (Rules 1, 5, 6). Editing an
  income entry correctly reverses the old amount's effect and applies the
  new one, including moving the effect across accounts if reassigned to a
  different one. Not built on the generic `firestoreCollection.ts` factory
  from Phase 3 — that factory's single-document CRUD can't express a write
  that must also atomically touch a second document.
- `utils/transactionBalance.ts` — `getBalanceEffect(type, amount)` is the
  one place that decides whether a transaction type increases or decreases
  a balance (Rule 9: "every financial calculation should use centralized
  business logic"). Only `income` → `+amount` exists yet; this is the seed
  Phase 33's calculation engine will grow from, not something to redo then.
- Transactions table (reusing Phase 1's `DataTable`): date, type (chip),
  category, account name, source, amount (green, `+`-prefixed via
  `signDisplay="exceptZero"`, formatted in the transaction's own account's
  currency — not the user's profile default), and edit/delete actions. An
  "Add an account first" guard replaces the table entirely when the user
  has zero accounts, since every transaction needs one to belong to.
- `firestore.rules` extended with a `transactions/{transactionId}` block:
  owner-only read/update/delete verified against `request.auth.uid`; create
  requires `type in ['income']` (widens as each phase adds a type),
  positive numeric `amount`, and a string `accountId`; a transaction's
  `type` can't change after creation, since Rule 6's reverse-then-reapply
  logic assumes it never does. The paired account-balance write inside the
  same client transaction is already authorized by Phase 3's accounts
  rules (owner check only — `currentBalance` isn't locked down beyond
  that yet, same caveat as before).
- `firestore.indexes.json` gained the `transactions` composite index
  (`userId` asc + `date` desc) proactively — learned from Phase 3's
  "query requires an index" surprise, so this phase didn't repeat it.
- `vite.config.ts`'s `manualChunks` gained a dedicated
  `vendor-mui-date-pickers` chunk: `@mui/x-date-pickers` (first actually
  exercised this phase via `FormDatePicker`) had been falling into the
  generic `vendor-mui` bucket and pushed it past the 500 kB chunk-size
  warning threshold.
- New shared form component: `components/common/form/FormSwitch.tsx` (a
  boolean toggle wired to RHF, following the same pattern as
  `FormTextField`/`FormSelect`/`FormDatePicker`/`FormAutocomplete`) — used
  for the recurring flag, and reusable by any future boolean form field.
- New test helper: `test/renderWithProviders.tsx` wraps a component under
  test in the same `LocalizationProvider` App.tsx provides for real, needed
  by any test rendering a `FormDatePicker` (this phase's dialog and page
  tests, and every future form with a date field).

**Known limitation, not fixed this phase:** deleting an account (Phase 3)
does not check whether transactions still reference it — `deleteTransaction`
is defensive about this (it checks the account still exists before touching
its balance and always still deletes the transaction record itself), but a
transaction can end up pointing at an account that no longer exists, shown
as "—" in the Account column. Revisit when account deletion or the
calculation engine (Phase 33) is next touched.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean, no chunk-size warnings
  after the `vendor-mui-date-pickers` split.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from Phases 1–3.
- `npm run test` — 107/107 passing (25 new: `getBalanceEffect`,
  `incomeFormSchema` validation including numeric coercion and the date
  requirement, `IncomeFormDialog`'s create/edit modes and validation, and
  `TransactionsPage`'s no-accounts guard, empty/loaded/error states, and
  create/delete flows against mocked `accountService`/`transactionService`).
- A Playwright pass confirmed no regressions to Phases 1–3 (an
  unauthenticated visit to `/transactions` still redirects to `/login`,
  zero console errors, mobile viewport unaffected).
- As with Phases 2–3, the atomic create/update/delete logic against the
  live Firestore project isn't exercised end-to-end from this sandbox (no
  network access to Firebase here) — covered by the tests above instead.
  Once this reaches the user's browser, they should confirm: adding an
  income entry increases the chosen account's balance by the right amount,
  editing one (including reassigning its account) leaves both accounts'
  balances correct, and deleting one reverses the effect. The new
  `transactions` composite index needs to build (or be deployed) the same
  way Phase 3's `accounts` one did before the page will load without a
  "query requires an index" error.

**Post-delivery fix (same day, after the user deployed the rules/index
above):** the live app still returned "Missing or insufficient permissions"
when adding an income entry, because the *Phase 4* additions to
`firestore.rules`/`firestore.indexes.json` (the `transactions` block and its
composite index) hadn't been deployed yet — Phase 3's earlier deploy only
covered `accounts`. No code change; the fix was running
`npx firebase-tools deploy --only firestore:rules,firestore:indexes` again
after Phase 4 landed. User confirmed fixed. Lesson applied going forward:
call this out explicitly at the end of every phase that touches
`firestore.rules` or `firestore.indexes.json`, not just the first time.

**Next phase when instructed ("Continue to Phase 5"):** Phase 5 — Expense
Management.

## Phase 5 — Expense Management (COMPLETE)

**Delivered:**

- Expense tracking added to the same **Transactions** page and the same
  `transactions` collection Phase 4 started — `TRANSACTION_TYPES` now
  includes `'expense'`. `types/transaction.ts` was rewritten from a flat
  interface into a discriminated union, `Transaction = IncomeTransaction |
  ExpenseTransaction` (discriminated on `type`), so every consumer gets
  compile-time narrowing instead of optional fields that may or may not
  apply (`row.type === 'expense'` narrows to `merchant`/`subcategory`/
  `paymentMethod`/`tags`; `'income'` narrows to `source`/`isRecurring`).
- Expense entry fields exactly per spec: amount, date, account, category,
  subcategory, merchant, payment method, description, notes, tags — the
  spec's own example (₹250 / Food → Restaurant / paid from HDFC Bank /
  merchant: Restaurant XYZ) is exactly what the Transactions table now
  renders for an expense row.
- `config/expenseCategories.ts` — the 9 default categories and their
  subcategories, copied verbatim from the spec (Housing, Food,
  Transportation, Shopping, Health, Entertainment, Education, Financial,
  Other), namespaced per-category since a value like `maintenance` recurs
  under both Housing and Transportation with a different meaning each
  time. Fixed enums for now, same reasoning as Phase 4's income
  categories: Phase 6 ("Expense Categories") is the phase explicitly
  scoped to build the flexible, user-editable version — doing that now
  would be doing Phase 6's job early. `config/paymentMethods.ts` similarly
  holds a fixed enum (Cash, Debit Card, Credit Card, UPI, Net Banking,
  Wallet, Cheque, Other).
- Category → Subcategory is a cascading pair: picking a category resets
  whatever subcategory was selected under the previous one, since it's no
  longer valid. Implemented via a new `onValueChange` callback on
  `FormSelect` fired in the same change event as the category field's own
  `onChange` (`setValue('subcategory', '')`), not a `useEffect` watching
  the category value — the latter is exactly the "set state in an effect"
  pattern this codebase has avoided since Phase 3's `AccountFormDialog`
  fix, and would just re-render a second time to undo a value that was
  briefly wrong. `expenseSchemas.ts`'s Zod schema mirrors this at the data
  layer with a cross-field `.refine`: a blank subcategory is always valid
  (required for `Other`, which has no subcategories at all), but a
  non-blank one must actually belong to the chosen category.
- New shared form component: `components/common/form/FormTagsInput.tsx` (a
  free-text, multi-value chip input backed by MUI's `Autocomplete`,
  `string[]` with no fixed option list) — the seed of Phase 21's proper tag
  system, not a preview of it.
- `services/transactionService.ts` was refactored, not duplicated: the
  income-only `createTransaction`/`updateTransactionCore` logic from Phase
  4 was generalized into two private helpers shared by both
  `createIncomeTransaction`/`createExpenseTransaction` and
  `updateIncomeTransaction`/`updateExpenseTransaction`, each supplying only
  the fields specific to its type. Keeps Rule 9 ("centralized business
  logic") intact instead of two near-identical copies of the same atomic
  `runTransaction` block.
- `utils/transactionBalance.ts`'s `getBalanceEffect` gained
  `case 'expense': return -amount || 0` (Rule 2) — the `|| 0` avoids
  returning the numerically-harmless but surprising `-0` for a zero-amount
  expense.
- The Transactions page's "Add Income" button became an "Add Transaction"
  split button with a menu (Add Income / Add Expense), and renders both
  `IncomeFormDialog` and `ExpenseFormDialog` side by side, routing edits to
  whichever one matches the row's `type`. The table's Category column now
  shows `Food → Restaurants` for expenses (the spec's own example format)
  and the amount is shown signed (`+`/`−` via `signDisplay="exceptZero"`)
  and colored by sign, rather than always green.
- `firestore.rules`'s `transactions/{transactionId}` create rule widened
  from `type in ['income']` to `type in ['income', 'expense']` — done
  *before* delivery this time (Phase 4's equivalent gap needed a
  post-delivery permissions fix; the lesson from that noted above is
  applied starting with this phase). No new composite index needed —
  expense rows use the exact same `userId` + `date` query shape income
  rows already do.

**Known limitation, not fixed this phase:** same as Phase 4 — deleting an
account still doesn't check for transactions (of either type) still
referencing it.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean, no new chunk-size
  warnings.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from Phases 1–4.
- `npm run test` — 131/131 passing (24 new: `expenseFormSchema` validation
  including the category/subcategory cross-field `.refine`,
  `ExpenseFormDialog`'s create/edit modes, validation, and the
  category-resets-subcategory cascade, and `TransactionsPage` additions
  for the Add-menu, expense create/edit, and rendering an expense row's
  `Food → Restaurants` category format; plus one added
  `getBalanceEffect` case for Rule 2). One pre-existing test
  (`getBalanceEffect` zero-amount) needed a matching `|| 0` fix in the
  function itself once `expense` on a zero amount surfaced a `-0` vs `0`
  strict-equality mismatch — a real (if inconsequential) bug caught by
  the new test, not a test-only workaround.
- A Playwright pass confirmed no regressions (an unauthenticated visit to
  `/transactions` still redirects to `/login`, zero console errors, mobile
  viewport unaffected).
- As with Phases 3–4, the atomic create/update/delete logic against the
  live Firestore project isn't exercised end-to-end from this sandbox —
  covered by the tests above instead. Once this reaches the user's
  browser, after redeploying rules (`npx firebase-tools deploy --only
  firestore:rules`), they should confirm: adding an expense decreases the
  chosen account's balance by the right amount, editing one (including
  changing its category/subcategory or reassigning its account) leaves
  balances correct, and the Transactions table shows `Category →
  Subcategory` for expense rows the way the spec's own example does.

**Next phase when instructed ("Continue to Phase 6"):** Phase 6 — Expense
Categories.

## Phase 6 — Expense Categories (COMPLETE)

**Delivered:**

- A real, per-user, Firestore-backed expense category system, replacing
  the fixed 9-value enum Phase 5 shipped with — exactly the migration
  Phase 5's own code comments flagged as this phase's job. New
  `expenseCategories` collection (`ExpenseCategoryRecord`: id, userId,
  slug, name, isDefault, subcategories, createdAt, updatedAt).
  Subcategories live as a whole array field on the category document
  (`{slug, name}[]`) rather than their own collection — Firestore has no
  per-element permission or partial-array update primitive anyway, and a
  category realistically holds at most a handful, so the client's add/
  rename/remove helpers just read-modify-write the whole array.
- Backward compatible with every transaction recorded in Phases 4–5 with
  no migration step: the 9 defaults are seeded with slugs computed by the
  same rule the old fixed enum's values already were
  (`slugify('Food') === 'food'`, `slugify('Public Transport') ===
  'public_transport'`, see `utils/slugify.ts`), so a pre-existing
  transaction's `category`/`subcategory` string still resolves to the
  right record with no backfill. `types/transaction.ts`'s `category` field
  on an expense changed from a fixed union (`ExpenseCategory`) to a plain
  `string` slug — the set of valid values is now user data, not something
  a type can enumerate at compile time.
- Users can create custom categories and subcategories (the spec's
  explicit ask for this phase), and — going further, matching this app's
  existing CRUD depth everywhere else (accounts, transactions) — rename or
  delete *any* category (default or custom) and its subcategories, from a
  new "Expense Categories" section on the Settings page (`/settings`;
  there's no dedicated nav item for this — the spec's own recommended
  navigation list doesn't have one, and Settings is exactly "user and
  application settings"). Each category is a collapsible row: name, a
  "Default" badge for the 9 seeded ones (informational only — defaults
  aren't locked, per the spec only requiring *custom* categories be
  possible, not that defaults be protected), a rename/delete menu, and its
  subcategories as chips (click to rename, click the chip's own × to
  delete) plus an "Add subcategory" chip.
- `hooks/useExpenseCategories.ts` — one shared realtime subscription +
  one-time default-seeding hook, used by both the new Settings section and
  `TransactionsPage`'s expense dialog/table, so there's a single place
  that loads categories and ensures the defaults exist rather than two
  copies of that logic that could drift. Seeding
  (`ensureDefaultExpenseCategories`) is idempotent — it only creates
  whichever of the 9 are missing — so it's safe to attempt from whichever
  of those two pages the user opens first, and safe to retry if a partial
  failure ever left some seeded and others not.
- `ExpenseFormDialog`'s Category/Subcategory selects are now populated
  from this live list (`utils/expenseCategoryLookup.ts`'s
  `toCategoryOptions`/`getSubcategoryOptionsFor`) instead of the static
  config Phase 5 used; the cascading reset-on-category-change behavior
  from Phase 5 is unchanged. `TransactionsPage`'s Category column now
  resolves a transaction's stored slug against the live list too
  (`getCategoryLabel`/`getSubcategoryLabel`), falling back to the raw slug
  if the category was since renamed away or deleted — same "known
  limitation" shape already accepted for a deleted account referenced by
  an old transaction (Phase 4/5's notes).
- `expenseSchemas.ts` simplified: `category` is now `z.string().min(1,
  ...)` instead of `z.enum(EXPENSE_CATEGORIES)`, and the cross-field
  `.refine` checking subcategory-belongs-to-category was removed — neither
  can be statically known anymore (categories are live per-user data), so
  validity is enforced procedurally by the dialog's cascading select only,
  the same division of responsibility already used for `accountId` (never
  cross-checked against real accounts in the zod schema either).
- `firestore.rules` gained an `expenseCategories/{categoryId}` block:
  owner-only CRUD; `slug` is immutable after creation (transactions
  reference it, same reasoning as a transaction's own immutable `type`);
  `name`/`subcategories` can change freely once ownership and shape are
  verified. No new composite index needed — the realtime subscription
  only filters by `userId` (sorting is done client-side in
  `categoryService.ts`'s `sortCategories`), which Firestore indexes
  automatically, unlike the `userId` + `orderBy` combination `accounts`
  and `transactions` needed dedicated index entries for.

**Known limitation, not fixed this phase:** deleting a category (default
or custom) doesn't check whether transactions still reference it — same
shape as the existing "deleting an account doesn't check for referencing
transactions" limitation from Phase 4. A transaction recorded under a
since-deleted category falls back to showing its raw slug as plain text
(the confirm dialog says as much before deleting). Revisit alongside that
one, whenever account/category deletion or the calculation engine (Phase
33) is next touched.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean, no chunk-size warnings.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from Phases 1–5.
- `npm run test` — 175/175 passing (43 new: `slugify`/`uniqueSlug`,
  `categoryFormSchema`/`subcategoryFormSchema`, `expenseCategoryLookup`'s
  label/option helpers, `useExpenseCategories`' subscribe/seed/error
  behavior, `CategoryFormDialog`/`SubcategoryFormDialog`'s create/edit/
  validation, and `CategoriesSection`'s loading/empty/error states plus
  full category and subcategory CRUD; `expenseSchemas.test.ts` and
  `ExpenseFormDialog.test.tsx` updated for the new live-category
  behavior instead of the retired fixed enum).
- A Playwright pass across both `/transactions` and the new `/settings`
  Categories section confirmed no regressions (unauthenticated visits
  still redirect to `/login`, zero console errors, on both desktop and
  mobile viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox. Once this reaches the user's browser, after
  redeploying rules (`npx firebase-tools deploy --only firestore:rules`),
  they should confirm: opening Settings seeds the 9 default categories
  exactly once (reopening it shouldn't create duplicates), a brand new
  expense entry can still be recorded and shows the right category, and —
  most importantly — every expense recorded during Phase 5 testing still
  shows its correct category/subcategory label with no manual fix-up
  needed.

**Next phase when instructed ("Continue to Phase 7"):** Phase 7 — Unified
Transaction System.

## Phase 7 — Unified Transaction System (COMPLETE)

**Delivered:**

- Two new transaction types join the unified `transactions` ledger:
  `refund` and `adjustment` (income Phase 4, expense Phase 5 — see
  `types/transaction.ts`'s doc comment, which documents which phase
  actually built each type's UI/logic; `transfer` is still Phase 8). Both
  get full create/edit/delete support from the Transactions page, the same
  as income and expense.
- **Refund** (Rule 8: "refunds must be handled consistently") always
  increases the account's balance, the same direction as income, but is
  kept as its own transaction type rather than folded into income so it's
  never conflated with real earnings in reports or totals later. It reuses
  the exact same (Phase 6) expense category/subcategory system — a refund
  is categorized by what the money was originally spent on — so
  `RefundFormDialog.tsx` is effectively `ExpenseFormDialog.tsx` minus the
  payment method field, and `refundSchemas.ts` mirrors `expenseSchemas.ts`
  the same way.
- **Adjustment** is a manual balance correction (reconciling a cash count,
  fixing a bank error, an opening-balance tweak). Unlike every other type,
  its effect on the balance isn't implied by its type alone, so it carries
  its own explicit `direction: 'increase' | 'decrease'` field.
  `AdjustmentFormDialog.tsx` has no category/merchant/payment method —
  just amount, date, account, a Direction select, and a required `reason`
  (freeform; required because an adjustment with no explanation defeats
  the point of it being its own transaction type instead of just editing
  the account balance directly).
- `merchant` and `tags` are promoted from `ExpenseTransaction`-only fields
  to the shared `TransactionBase` interface, per the product spec's field
  list for the unified system. `category` deliberately stays per-variant
  rather than also being promoted: `IncomeCategory` (a fixed enum) and
  `ExpenseCategorySlug` (a live per-user string) are genuinely different
  types, and unifying them would mean giving up compile-time category
  safety for one of the two. Income now has a `tags` field in its form too
  (`FormTagsInput`, same component `ExpenseFormDialog` already used).
  There's no meaningful "merchant" for income or adjustment, so the
  service layer writes `''` for it directly rather than exposing it on
  those forms.
- `utils/transactionBalance.ts`'s `getBalanceEffect` — the single
  centralized place Rule 9 requires for balance-effect logic — gained an
  optional third `direction` parameter and two new cases: `refund` always
  returns `+amount`; `adjustment` returns `+amount` or `-amount` (with the
  same `-0`-avoidance as expense) based on `direction`. Every call site in
  `transactionService.ts` (create, update — both old and new effect, since
  editing an adjustment can also change its direction — and delete) now
  threads the transaction's `direction` through.
- `TransactionsPage.tsx`: the Add menu gained "Add Refund" and
  "Add Adjustment"; the Type column shows a distinct color per type
  (income green, expense red, refund blue/info, warning/amber for
  adjustment); the Category column shows an adjustment's `reason` in place
  of a category (adjustments have none); the Amount column's sign logic
  was simplified from an ad-hoc `type === 'expense' ? -amount : amount` to
  calling the same centralized `getBalanceEffect` the service layer uses,
  so the displayed sign and the actual balance effect can never drift
  apart.
- `firestore.rules`: the `transactions` block's `type in [...]` list
  widened to include `'refund'` and `'adjustment'`; both create and update
  now also require `direction in ['increase', 'decrease']` whenever
  `type == 'adjustment'`, mirroring the amount/accountId validation
  already there for every type.

**Known limitation, not fixed this phase:** none new — refund and
adjustment inherit the same "deleted account/category shows a fallback"
and "no cross-referencing check on delete" limitations already accepted
for income/expense in Phases 4–6.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean, no chunk-size warnings.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from Phases 1–6.
- `npm run test` — 221/221 passing (46 new: `getBalanceEffect`'s refund/
  adjustment cases, `refundFormSchema`/`adjustmentFormSchema`,
  `RefundFormDialog`/`AdjustmentFormDialog`'s render/validation/submit
  behavior, and `TransactionsPage`'s new render/create/edit coverage for
  both types; `incomeSchemas.test.ts` and `IncomeFormDialog.test.tsx`
  updated for the new `tags` field).
- A Playwright pass across `/transactions` and `/settings` confirmed no
  regressions (unauthenticated visits still redirect to `/login`, zero
  console errors, on both desktop and mobile viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox. Once this reaches the user's browser, after
  redeploying rules (`npx firebase-tools deploy --only firestore:rules`),
  they should confirm: a refund can be recorded and correctly increases
  its account's balance; an adjustment can be recorded in both directions
  and correctly increases/decreases its account's balance; editing an
  adjustment's direction correctly re-reverses and re-applies the balance
  effect; and every income/expense entry recorded during Phases 4–6
  testing still displays and edits correctly (merchant/tags now being on
  the shared base didn't change how existing documents, which lack these
  fields on income, are read — they fall back to `''`/`[]`).

**Next phase when instructed ("Continue to Phase 8"):** Phase 8 —
Transfers.

## Phase 8 — Account Transfers (COMPLETE)

**Delivered:**

- `transfer` joins the unified `transactions` ledger as a real type (Rule
  3/4: "transfers move money between two accounts and are NEVER counted as
  income or expense"). Full create/edit/delete support from the
  Transactions page, same as every other type.
- A transfer is structurally different from every other transaction type:
  it needs two accounts (`fromAccountId`/`toAccountId`), not one. Rather
  than force it into the existing single-`accountId` shape,
  `types/transaction.ts`'s old `TransactionBase` was split into
  `TransactionCommon` (the fields every type shares — amount, date,
  description, notes, merchant, tags, timestamps) plus `TransactionBase`
  (`TransactionCommon` + the single `accountId` every type except transfer
  uses). `TransferTransaction` extends `TransactionCommon` directly and
  adds its own two account fields instead.
- Because of that shape difference, `getBalanceEffect` (Rule 9's single
  centralized balance function) was NOT extended for transfer — it only
  ever computes one signed delta for one account, which doesn't fit a
  transfer's two-accounts-opposite-directions effect. Instead,
  `transactionService.ts` gained a parallel, dedicated
  `createTransferTransaction`/`updateTransferTransaction` pair (plus a
  `type === 'transfer'` branch in `deleteTransaction`) that debit
  `fromAccountId` and credit `toAccountId` by the same amount directly.
  Editing a transfer's accounts (e.g. reassigning either side) is handled
  by accumulating a net balance delta per distinct account id first — an
  account can appear on both the old and new side — so each account
  document is read and written exactly once inside the Firestore
  transaction. `getBalanceEffect` did gain an explicit (inert, returns 0)
  `'transfer'` case purely so its switch stays exhaustive over
  `TransactionType`.
- `TransferFormDialog.tsx` has no category/merchant/payment method — just
  amount, date, a "From Account" select, a "To Account" select, optional
  description/notes/tags. Each select filters out whatever the other
  currently has chosen, so the user can't even pick the same account
  twice; `transferSchemas.ts`'s `.refine` is a defense-in-depth backstop
  for the same rule at the schema level.
- `TransactionsPage.tsx`: the Add menu gained "Add Transfer", disabled
  whenever fewer than two accounts exist (a transfer needs somewhere to
  come from and go to); the Type column shows a neutral/default-colored
  chip for transfer (it's neither a gain nor a loss); the Account column
  shows `"<From> → <To>"` for a transfer row instead of a single account
  name; the Category column shows `—` (transfers have none); the Amount
  column shows the plain moved amount with no +/- sign or color for a
  transfer, instead of running it through `getBalanceEffect` like every
  other type; the delete-confirmation message names both accounts for a
  transfer instead of one.
- `firestore.rules`: the `transactions` block's `type in [...]` list
  widened to include `'transfer'`; both create and update now branch on
  type — every other type still requires `accountId is string`, while a
  transfer instead requires `fromAccountId`/`toAccountId` both be strings
  and, critically, be different from each other (mirroring the same rule
  enforced client-side by the schema and the dialog's option-filtering).

**Known limitation, not fixed this phase:** no currency conversion — a
transfer applies its entered amount unchanged to both accounts, so a
transfer between two accounts with different `currency` values won't
reflect a real exchange rate. Also inherits the existing "no
cross-referencing check on delete" and "deleted account shows a fallback"
limitations already accepted for every other type since Phase 4.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean, no chunk-size warnings.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from Phases 1–7.
- `npm run test` — 243/243 passing (22 new: `getBalanceEffect`'s inert
  transfer case, `transferFormSchema`, `TransferFormDialog`'s render/
  validation/account-filtering/submit behavior, and `TransactionsPage`'s
  new render/menu/create/edit/delete-message coverage for transfers).
- A Playwright pass across `/transactions` and `/settings` confirmed no
  regressions (unauthenticated visits still redirect to `/login`, zero
  console errors, on both desktop and mobile viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox. Once this reaches the user's browser, after
  redeploying rules (`npx firebase-tools deploy --only firestore:rules`),
  they should confirm: a transfer between two real accounts correctly
  debits one and credits the other by the same amount; editing a
  transfer's amount or either account correctly re-reverses and re-applies
  both sides' balance effects; deleting a transfer correctly reverses both
  accounts; and "Add Transfer" is disabled with only one account and
  enabled once a second exists.

**Process change (user instruction, 2026-08-31):** starting with Phase 9,
the user asked to stop live-testing after each phase and instead receive
one consolidated testing checklist after Phase 42, and then explicitly
asked to skip per-phase confirmation entirely and build straight through
every remaining phase. From here on this log keeps recording each phase's
"Verified" section (including the browser-testable scenarios a real user
should confirm) exactly as before — that's what the final checklist gets
assembled from — but there's no "Next phase when instructed" gate anymore;
phases proceed back-to-back automatically.

## Phase 9 — Budget Management (COMPLETE)

**Delivered:**

- `types/budget.ts`: a `Budget` document with `period` (`monthly` /
  `weekly` / `custom`), a `scope` of either `overall` (one
  `overallAmount`) or `category` (a per-category `items: BudgetItem[]`
  list, `{categoryId, amount}`), a `startDate`/`endDate` range, and
  `warningThreshold`/`overThreshold` stored as plain percentages (e.g. 80,
  100 — not fractions), which Phase 10's budget-vs-actual comparison will
  read directly.
- Like Phase 6's category `subcategories`, `items` is embedded directly on
  the `Budget` document rather than a separate `budgetItems` collection
  (the spec's original shape) — Firestore has no per-element permission
  either way, and a budget realistically holds a handful of category
  limits, so a whole-array field keeps reads/writes simple.
- `utils/budgetCalculations.ts`'s `getBudgetTotal(budget)` is the single
  place that turns a budget into "the number to compare against" —
  `overallAmount` for an overall-scope budget, the sum of `items` for a
  category-scope one — mirroring the Rule 9 centralized-calculation
  pattern already established by `getBalanceEffect`. Phase 10 and the
  dashboard should call this rather than re-deriving the total inline.
- `BudgetFormDialog.tsx`: name, period, a scope select ("One overall
  amount" / "A limit per category"), start/end dates, and either a single
  amount field or a `useFieldArray`-backed list of category+amount rows
  depending on scope, plus the two threshold percentage fields. Validation
  (`schemas/budgetSchemas.ts`) requires the end date on/after the start
  date, an amount greater than zero when scope is overall, at least one
  category row when scope is category, and the warning threshold at or
  below the over-budget threshold. The service layer's `toFirestoreFields`
  zeroes out whichever side (amount vs. items) isn't the active scope, so
  stale data from switching scope mid-edit can never leak into storage.
- `BudgetCard.tsx` shows the date range, period/scope chips, the computed
  total via `getBudgetTotal`, the two thresholds, and — for a
  category-scope budget — a per-category breakdown line using the same
  `getCategoryLabel` lookup Phase 6/7 already use elsewhere.
- `BudgetsPage.tsx` is a full CRUD page (list/create/edit/delete) built on
  the same subscribe-with-reload-key, confirm-before-delete pattern as
  `AccountsPage`.
- `firestore.rules`: new `budgets/{budgetId}` block, owner-only CRUD;
  create/update validate `name`, `scope in ['overall','category']`,
  `overallAmount is number`, `items is list`, and both thresholds are
  numbers. Nothing on a budget is immutable (unlike a transaction's `type`
  or a category's `slug`) since nothing else references a budget by any
  field yet.
- `firestore.indexes.json`: new composite index on `budgets`
  (`userId` ASC, `startDate` DESC) for `subscribeToBudgets`'s query.

**Known limitation, not fixed this phase:** a budget's `items` reference a
category by `slug`, the same way transactions do — if a category is later
renamed or removed (Phase 6 already allows deleting a category), an
existing budget item pointing at that slug isn't cleaned up or
re-validated; `getCategoryLabel` falls back gracefully, but the budget
would silently no longer track anything real. Also, this phase only
stores and displays the budget's target — Phase 10 (Budget vs Actual) is
what compares it against real transaction data.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases.
- `npm run test` — 273/273 passing (30 new: `getBudgetTotal`,
  `budgetFormSchema`, `BudgetFormDialog`'s render/validation/scope-switch/
  field-array behavior, and `BudgetsPage`'s render/create/edit/delete
  coverage).
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/budgets`,
  and `/settings` confirmed no regressions (unauthenticated visits still
  redirect to `/login`, zero console errors, on both desktop and mobile
  viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox. Once this reaches the user's browser, after
  redeploying rules and indexes (`npx firebase-tools deploy --only
  firestore:rules,firestore:indexes`), they should confirm: creating an
  overall-scope budget and a category-scope budget both save and display
  the right total; editing a budget (including switching its scope)
  updates correctly and doesn't leave stale amount/items data behind;
  deleting a budget removes it without affecting any recorded
  transactions; and the warning/over percentages shown match what was
  entered.

## Phase 10 — Budget vs Actual (COMPLETE)

**Delivered:**

- `utils/budgetCalculations.ts` gained the actual-spend half of the
  centralized calculation pattern `getBudgetTotal` started in Phase 9:
  - `getBudgetPeriodTransactions(budget, transactions)` — every transaction
    whose `date` falls within the budget's inclusive `startDate`/`endDate`
    range (plain string comparison; both are ISO-ish date strings that sort
    correctly without parsing).
  - `getCategoryActualSpent(periodTransactions, categoryId)` — net spend in
    one category: `expense` adds, `refund` subtracts back out (Rule 8),
    already-period-filtered transactions only.
  - `getBudgetActualSpent(budget, transactions)` — the actual-spend
    counterpart to `getBudgetTotal`: for an overall-scope budget, every
    expense/refund in the period regardless of category; for a
    category-scope budget, only the categories it actually lists a limit
    for (spend in an un-budgeted category doesn't count against a budget
    that never mentioned it). `income` and `transfer` are never counted
    (Rule 4), and — a deliberate judgment call this phase — neither is
    `adjustment`, since it's a manual balance correction rather than real
    spending and shouldn't move a spending-limit needle.
  - `getBudgetStatus(percentSpent, warningThreshold, overThreshold)` —
    classifies percent-spent into the four states the status color palette
    reserved back in Phase 1 (`safe`/`warning`/`nearLimit`/`over`). A
    budget only stores two configurable thresholds, so `nearLimit` isn't
    separately configurable — it's derived as the midpoint between
    `warningThreshold` and `overThreshold` (e.g. 80/100 → nearLimit starts
    at 90). A zero-amount budget with any spend at all is treated as
    `over` (there's no meaningful percentage against a zero total).
  - `getBudgetProgress(budget, transactions)` — bundles `total`, `actual`,
    `percentSpent`, and `status` into one call for the UI.
- New `hooks/useTransactions.ts` — a realtime subscription to the user's
  full transaction ledger via `transactionService.subscribeToTransactions`,
  same shape as `useExpenseCategories`. `TransactionsPage` keeps its own
  independent subscription (it reacts to its own mutations too), but this
  is the one shared read-only source for every other page that just needs
  the ledger — `BudgetsPage` today, Phase 11's dashboard and Phase 12's
  reports next.
- `BudgetCard.tsx` now shows real progress: a status chip
  (safe/warning/nearLimit/over, colored from `theme.palette.status`), an
  actual/total amount line, a percentage, and a `LinearProgress` bar
  colored the same way. A category-scope budget's per-category breakdown
  now shows each category's actual spend next to its limit, not just the
  limit alone.
- `test/renderWithProviders.tsx` now also wraps with the real
  `ThemeProvider` (`createAppTheme('light')`), not just
  `LocalizationProvider` — needed because `BudgetCard` reads the custom
  `palette.status` tokens, which don't exist on MUI's bare default theme
  that a plain Testing Library `render` would otherwise supply.

**Known limitation, not fixed this phase:** `nearLimit`'s midpoint-based
threshold is a judgment call, not something the spec pinned down or the
user configured — if this doesn't feel right once tested, it's a one-line
change in `getBudgetStatus`. Also, a custom `period` of `'weekly'` or
`'custom'` still relies entirely on whatever `startDate`/`endDate` the user
picked in the form (Phase 9); nothing here auto-advances a monthly
budget's range into the next month.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases.
- `npm run test` — 294/294 passing (21 new: `getBudgetPeriodTransactions`/
  `getCategoryActualSpent`/`getBudgetActualSpent`/`getBudgetStatus`/
  `getBudgetProgress`, `useTransactions`, and `BudgetCard`'s progress/
  status/breakdown/menu coverage).
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/budgets`,
  and `/settings` confirmed no regressions (unauthenticated visits still
  redirect to `/login`, zero console errors, on both desktop and mobile
  viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox (no rules/indexes changes this phase — Phase
  10 only reads existing `transactions` and `budgets` data, it doesn't add
  a new query shape). Once this reaches the user's browser, they should
  confirm: a budget's card shows the correct actual-spend total and
  percentage against real recorded expenses/refunds within its date range;
  recording a new expense in a budgeted category updates that budget's
  card live; a refund correctly reduces the actual-spend shown; the status
  chip and progress bar color change correctly as spend crosses the
  warning/near-limit/over thresholds; and a category-scope budget's
  per-category breakdown shows the right actual amount next to each
  category's limit.

**Proceeding immediately, without stopping for confirmation, to Phase
11 — Dashboard.**

## Phase 11 — Dashboard (COMPLETE)

**Delivered:**

- The `/` route's `ComingSoonPage` stub is replaced with a real dashboard:
  four stat cards (total balance per currency — reusing Phase 3's
  `sumBalancesByCurrency` the same way `AccountsPage` does; income this
  month; expenses this month; net this month), an "Active budgets" panel,
  a "Recent transactions" panel (last 5), and a "Spending by category"
  donut chart for the current month — the app's first use of Recharts.
- New realtime hooks, following the shape already established by
  `useExpenseCategories`: `hooks/useAccounts.ts` and `hooks/useBudgets.ts`
  (alongside Phase 10's `useTransactions.ts`). `AccountsPage` and
  `BudgetsPage` keep their own independent subscriptions since they also
  mutate; these hooks are for pages that only need to *read* — the
  dashboard today, later phases (Reports, etc.) next.
- New `utils/dashboardCalculations.ts`, extending Phase 10's centralized-
  calculation approach to whole-ledger summaries rather than one budget:
  - `getCurrentMonthRange()` — first/last day of the current month as
    inclusive date strings.
  - `getPeriodTotals(transactions, start, end)` — income and net expense
    (expense minus refund, same Rule 8 definition Phase 10 uses) for a
    date range; `transfer` (Rule 4) and `adjustment` (a balance
    correction, not real income/spending — the same judgment call Phase
    10 made) are excluded from both.
  - `getActiveBudgets(budgets, today)` — budgets whose date range covers
    today, so the dashboard shows what's actually running right now
    rather than every budget ever created.
  - `getExpenseByCategory(transactions, start, end)` — net spend per
    category for the chart, sorted highest first, dropping any category
    that nets to zero or less (fully refunded).
- `config/transactionTypeMeta.ts` (new) — the transaction type→label/color
  chip mapping `TransactionsPage` already had is now centralized here
  (its own local copy replaced with an import) since the dashboard's
  recent-transactions list needed the exact same mapping as its second
  consumer.
- `test/renderWithProviders.tsx` — no change needed beyond Phase 10's
  `ThemeProvider` addition; the dashboard's budget-status chips reuse it
  directly.
- `src/test/setup.ts` — added a minimal `ResizeObserver` stub, since jsdom
  doesn't implement it and Recharts' `ResponsiveContainer` requires it to
  measure its container; without this every test rendering the dashboard's
  chart would throw "ResizeObserver is not defined". This is global setup,
  so Phase 12's reports (also charting) benefit from it too.

**Known limitation, not fixed this phase:** the three "this month" stat
cards (income/expenses/net) are computed against the calendar month and
the user's single default currency (`profile.currency`), not
currency-aware per account — a user with accounts in more than one
currency will see those three numbers mix currencies without conversion
(same FX-out-of-scope-until-Phase-27 limitation Phase 8's transfers
already accepted). The "Total balance" stat cards, by contrast, are
already correctly split one-card-per-currency (reusing Phase 3's
`sumBalancesByCurrency`).

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; the build's existing
  `vendor-charts` manualChunks bucket (already reserved in `vite.config.ts`
  since Phase 1) now actually has content now that Recharts is used.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases.
- `npm run test` — 317/317 passing (23 new: `useAccounts`, `useBudgets`,
  `dashboardCalculations`'s four functions, and `DashboardPage`'s loading/
  error/stat-card/active-budget/recent-transaction/category-breakdown
  coverage).
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/budgets`,
  and `/settings` confirmed no regressions (unauthenticated visits still
  redirect to `/login`, zero console errors, on both desktop and mobile
  viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox (no rules/indexes changes this phase — the
  dashboard only reads existing `accounts`/`transactions`/`budgets` data
  through their existing subscriptions, no new query shape). Once this
  reaches the user's browser, they should confirm: the total balance
  card(s) match the Accounts page; income/expenses/net for the current
  month match manually adding up this month's transactions; the active
  budgets panel shows the same progress as the Budgets page for any budget
  covering today; the recent-transactions list matches the top of the
  Transactions page; and the category donut chart's slices and legend
  amounts match this month's actual category spend.

## Phase 12 — Reports & Analytics (COMPLETE)

**Delivered:**

- The `/reports` route's `ComingSoonPage` stub is replaced with a real
  Reports page: a month selector (previous/next arrows, "Next" disabled
  once the current month is reached so the user can't navigate into the
  future), income/expenses/net stat cards for the selected month, a 6-month
  income-vs-expense bar chart, and a top-categories list with a share-of-
  total progress bar per category.
- New `utils/reportCalculations.ts`:
  - `getMonthRange(year, monthIndex)` — generalizes Phase 11's
    `getCurrentMonthRange` to an arbitrary month, needed to walk backward
    through past months.
  - `getMonthlyTrend(transactions, monthsCount, reference)` — income/
    expense/net totals (reusing Phase 11's `getPeriodTotals`) for each of
    the last N calendar months ending at `reference`'s month, oldest
    first, with a display label (e.g. "Feb 2026") for the chart's x-axis.
- This phase deliberately stays scoped to "the last N calendar months" and
  "the selected calendar month" — a reusable, freely-chosen date-range
  picker is Phase 13's job (Date filtering), and dedicated monthly/yearly
  summary pages are Phase 22/23. Reports reuses Phase 11's
  `getExpenseByCategory` for the selected month's top-categories list
  rather than duplicating that logic.
- Second use of Recharts (`BarChart` this time, vs. Phase 11's `PieChart`)
  — no new setup needed since Phase 11 already added the `ResizeObserver`
  test stub and the `vendor-charts` build chunk.

**Known limitation, not fixed this phase:** like Phase 11's dashboard, all
figures use the user's single default currency (`profile.currency`) with
no per-account currency awareness — same accepted FX-out-of-scope
limitation as Phases 8/10/11. The month selector also can't jump to an
arbitrary past month faster than one click at a time; a real date-range
picker arrives in Phase 13.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases.
- `npm run test` — 329/329 passing (12 new: `getMonthRange`/
  `getMonthlyTrend`, and `ReportsPage`'s loading/error/stat-card/top-
  categories/empty-state/month-navigation coverage).
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/budgets`,
  `/reports`, and `/settings` confirmed no regressions (unauthenticated
  visits still redirect to `/login`, zero console errors, on both desktop
  and mobile viewports).
- As with Phase 11, this isn't exercised end-to-end against live Firestore
  from this sandbox (no rules/indexes changes this phase). Once this
  reaches the user's browser, they should confirm: the selected month's
  income/expenses/net match manually totaling that month's transactions;
  stepping through previous months shows the right historical data and
  "Next month" is disabled at the current month; the 6-month bar chart's
  bars match each month's actual income/expense; and the top-categories
  list and its progress bars match that month's real category spend.

**Process change (user instruction, mid-Phase-12):** the user asked to go
back to one-phase-at-a-time with a stop after each phase, out of concern
about hitting a session or token limit during the long autonomous run —
this reverses the "build straight through to Phase 42" instruction from
earlier in this build (see the Phase 8 section above). From here on: after
finishing and verifying a phase, STOP and ask the user to confirm
"Continue to Phase N" before starting the next one, same as the original
process rule at the top of this file. Live testing is still deferred to
the very end (that part of the earlier instruction is unchanged) — the
per-phase "Verified" scenario lists are still written every phase for the
eventual consolidated checklist, just not acted on until Phase 42.

## Phase 13 — Date Filtering (COMPLETE)

**Delivered:**

- New reusable `utils/dateRangePresets.ts`: a `DateRangePreset` union
  (`allTime`/`thisMonth`/`lastMonth`/`last3Months`/`last6Months`/
  `thisYear`/`custom`), `getDateRangeForPreset(preset, reference, custom)`
  resolving any preset to a concrete `{start, end}` (reusing Phase 12's
  `getMonthRange` rather than re-deriving month-boundary math a third
  time), and `isWithinDateRange(dateValue, range)` — a plain string-prefix
  comparison predicate, matching everything when both bounds are `null`
  (which is what `allTime` resolves to).
- New reusable `components/common/DateRangeFilter.tsx`: a preset dropdown,
  plus two `DatePicker`s that appear only when "Custom range" is chosen.
  Deliberately generic over how the caller uses the result — it just
  reports the resolved `{preset, customStart, customEnd}`; the caller runs
  that through `getDateRangeForPreset` + `isWithinDateRange` itself.
- Wired into `TransactionsPage` — the one page that had *no* date
  filtering at all before this phase (Reports and the Dashboard already
  have their own bespoke, more specific month-based navigation from
  Phases 11/12, which this phase deliberately leaves alone rather than
  forcing into the same generic component — a trend chart anchored to
  "the selected month" doesn't map cleanly onto an arbitrary free-form
  range). Defaults to "All time" so the new filter never hides a
  transaction a user could already see before this phase. Filtering
  happens client-side over the already-subscribed full ledger — no new
  Firestore query shape, so no rules/indexes changes this phase. The
  empty-state message now distinguishes "No transactions yet" (a truly
  empty ledger) from "No transactions in this range" (the filter is just
  narrow) with a hint to widen it or switch back to "All time".

**Known limitation, not fixed this phase:** the custom range's two date
pickers don't cross-validate against each other (nothing stops picking an
end date before the start date) — `isWithinDateRange` still works
correctly in that case (it just matches nothing, since no date can be both
`>= start` and `<= end`), but there's no inline error message telling the
user why their range is empty. This mirrors the "no client-side guard,
rely on the predicate handling it gracefully" tradeoff already accepted
elsewhere rather than adding validation to a component with no form state.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases.
- `npm run test` — 350/350 passing (21 new: `getDateRangeForPreset`/
  `isWithinDateRange`, `DateRangeFilter`'s render/preset-change/custom-
  picker coverage, and `TransactionsPage`'s new default/filter/reset
  coverage). One test-authoring note worth recording: `getByLabelText`
  on an MUI `Select` can match both the visible combobox and its hidden
  native `<input>` once the value has changed, causing a "multiple
  elements found" error on a second open/select cycle in the same test —
  `getByRole('combobox', { name: ... })` is the robust way to query an
  MUI Select in a test and avoids this entirely.
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/budgets`,
  `/reports`, and `/settings` confirmed no regressions (unauthenticated
  visits still redirect to `/login`, zero console errors, on both desktop
  and mobile viewports).
- As with prior phases, this isn't exercised end-to-end against live
  Firestore from this sandbox (no rules/indexes changes this phase — pure
  client-side filtering over already-loaded data). Once this reaches the
  user's browser, they should confirm: the Transactions page shows
  everything by default; each preset (This month, Last month, Last 3
  months, Last 6 months, This year) narrows the table to the right rows;
  "Custom range" lets picking a From/To date narrow it to exactly that
  span; and switching back to "All time" restores the full list.

## Phase 14 — Recurring Transactions (COMPLETE)

**Delivered:**

- A new `recurringTransactions` Firestore collection and standalone
  **Recurring** page (`/recurring`), separate from the plain `isRecurring`
  flag Phase 4 put on a single income entry — that flag still exists and
  still just labels one entry (its helper text in `IncomeFormDialog` now
  points here instead of promising a later phase), but real automatic
  generation needed its own record of a *schedule*
  (frequency/start/end/next-due), which a single transaction has no room
  for. `types/recurringTransaction.ts`'s `RecurringTransaction` is a
  discriminated union on `type` (`'income' | 'expense'` — the two types
  that naturally repeat; a recurring transfer/refund/adjustment is out of
  scope for this phase, and Phase 15's subscription tracker is a
  specialized expense-only view over this same collection, not a
  duplicate of it), same pattern as `types/transaction.ts`'s `Transaction`.
- `utils/recurringCalculations.ts` — pure, fully unit-tested date math with
  no Firestore dependency: `addInterval` advances a date by one occurrence
  of a frequency (daily/weekly/monthly/quarterly/yearly — the last three
  via native `Date` month/year arithmetic, which rolls a day that
  overflows a shorter month into the next one rather than clamping to
  month-end, an accepted limitation rather than building a bespoke
  calendar system), and `getDueOccurrences` walks a rule's schedule
  forward from its stored `nextOccurrence` and collects every date due on
  or before "now" (respecting an optional `endDate`), capped at 60 per
  call as a backstop against a rule left unattended for years.
- `services/recurringTransactionService.ts` — CRUD on the rule itself
  (built on the Phase 3 `createUserScopedCollection` factory, since the
  rule document alone needs no atomic paired write), plus
  `generateDueOccurrences(userId, rules)`: the actual engine, which calls
  the very same `createIncomeTransaction`/`createExpenseTransaction` a
  hand-entered transaction uses (so account balances update identically,
  Rules 1/5/6, and a generated entry is indistinguishable from a manual
  one — income entries are also stamped `isRecurring: true`) and then
  advances the rule's `nextOccurrence`/`lastGeneratedDate` so the same
  occurrence is never generated twice. Entirely client-driven — this
  project has no Cloud Functions/server-side scheduler, so a rule only
  catches up whenever the app is next opened; that's an accepted
  limitation of the stack, not an oversight (documented on the function
  itself for whoever revisits it).
- `hooks/useRecurringTransactionGenerator.ts` — runs that check exactly
  once per session, mounted in `AppLayout` (not the Recurring page itself)
  so a recurring salary or rent entry appears in the ledger no matter
  which page the user opens first, guarded by the same one-shot `useRef`
  pattern `useExpenseCategories`'s default-category seeding already uses.
  Shows a snackbar ("N recurring transactions were added automatically")
  only when something was actually generated.
- `components/recurring/RecurringTransactionFormDialog.tsx` — one dialog
  for both rule types (a "Type" select switches the form between
  income-shaped and expense-shaped fields) rather than two near-duplicate
  dialogs, since the shared fields (amount/frequency/dates/account/
  description/notes) dominate the form. A rule's type can't be changed
  after creation (matches `transactions.type`'s existing immutability) —
  the Type field is disabled once editing, with an inline note explaining
  why. A "Repeats indefinitely" switch replaces a raw nullable end-date
  field with an explicit toggle, matching `DateRangeFilter`'s
  show-the-picker-only-when-relevant pattern from Phase 13.
- **Editing a rule never rewinds its schedule.** This was the trickiest
  design decision this phase: naively resetting a rule's `nextOccurrence`
  back to `startDate` on every edit would make the *next* generation check
  regenerate every month already produced since then as duplicate
  transactions. `updateRecurringTransaction` instead leaves
  `nextOccurrence` untouched by an edit — except for a rule that has never
  generated anything yet (`lastGeneratedDate === null`), where nothing has
  happened, so correcting the start date is free to move it along too.
  Deleting a rule does not touch transactions it already generated (same
  precedent as deleting a budget).
- The Recurring page lists every rule (Type/Category/Account/Merchant-or-
  Source/Amount/Frequency/Next due) with pause/resume, edit, and delete
  actions — pausing (`isActive: false`) is a one-click toggle separate
  from editing, and a paused rule shows "Paused" instead of a next-due
  date and is skipped entirely by the generation engine.
- `firestore.rules` gained a `recurringTransactions` block (owner-only,
  `type in ['income', 'expense']`, `type` immutable after creation, same
  shape as the `transactions` rule) and `firestore.indexes.json` gained
  its composite index (`userId` + `nextOccurrence`) — **the user needs to
  deploy both** before using this page live.

**Known limitations, not fixed this phase:**

- No server-side scheduler — occurrences are only caught up when the app
  is opened, not on the actual calendar date if the app stays closed past
  it (see the doc comment on `generateDueOccurrences`).
- A day that overflows a shorter target month (e.g. 31 Jan + 1 month)
  rolls into the following month via native `Date` arithmetic rather than
  clamping to that month's last day — see `addInterval`'s doc comment.
- No cross-validation between the custom start/end date pickers beyond
  "end must be on or after start" — same class of limitation already
  accepted for Phase 13's date-range filter.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; a new
  `RecurringTransactionsPage` chunk appears in the build output.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (one more line in `router.tsx` for the new
  lazy-loaded page, same warning class as every other page there already).
- `npm run test` — 404/404 passing (54 new: `recurringCalculations`'s date
  math including a leap-year and month-end-rollover case, the catch-up cap,
  and the end-date cutoff; `recurringTransactionFormSchema`'s validation;
  `useRecurringTransactions`/`useRecurringTransactionGenerator`'s
  subscription and one-shot-generation behavior; the form dialog's
  type-switching, validation, and submission; and the Recurring page's
  CRUD, pause/resume, and empty/error states). One MUI testing note worth
  recording alongside Phase 13's Select gotcha: an MUI `Switch`'s
  underlying input has `role="switch"`, not `role="checkbox"` — query it
  with `getByRole('switch', { name: ... })`.
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/recurring`,
  `/budgets`, `/reports`, and `/settings` confirmed no regressions (zero
  console errors, desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once deployed, the user should confirm: adding a
  monthly expense rule with a start date in the past immediately generates
  every missed occurrence up to today (each one lowering the chosen
  account's balance, exactly like a manual expense would) and advances
  "Next due" to the right future date; adding an income rule with today's
  date as the start generates exactly one occurrence and increases the
  account's balance; pausing a rule stops it from generating even if its
  due date passes; editing a rule's amount changes future occurrences
  without touching past ones or regenerating anything; and deleting a rule
  leaves its already-generated transactions in the ledger untouched.

**Next phase when instructed ("Continue to Phase 15"):** Phase 15 —
Subscription Tracker.

## Phase 15 — Subscription Tracker (COMPLETE)

**Delivered:**

- **No new Firestore collection.** As pre-decided in Phase 14's own section
  above, a subscription is just a `RecurringExpenseRule` with a new
  `isSubscription: boolean` flag — this page is a specialized, filtered view
  over the exact same `recurringTransactions` collection and the exact same
  `recurringTransactionService.ts` functions the Recurring page already
  uses (create/update/delete/pause all go through the same code, so there is
  nothing subscription-specific to keep in sync). `firestore.rules` and
  `firestore.indexes.json` needed **no changes** — the existing
  `recurringTransactions` rule only validates the specific fields it lists
  (`type`, `amount`, `frequency`, `accountId`); it doesn't reject unlisted
  extra fields, so `isSubscription` was already permitted before this phase
  started writing it.
- `types/recurringTransaction.ts` — `RecurringExpenseRule` gained
  `isSubscription: boolean` (ignored — always stored `false` — for an income
  rule, since a subscription is definitionally an expense).
- `schemas/recurringTransactionSchemas.ts` — the shared form schema and its
  defaults gained `isSubscription`.
- `components/recurring/RecurringTransactionFormDialog.tsx` — a "This is a
  subscription" switch, shown only in the expense branch (right below
  Payment method), lets any recurring expense — not just ones created from
  the new page — be flagged as a subscription. This is the single on-ramp:
  flip the switch on your phone bill's recurring rule and it shows up on the
  Subscriptions page without needing to re-create it there.
- `pages/recurring/RecurringTransactionsPage.tsx` — the Category column now
  shows a small "Subscription" chip next to any flagged rule, so the two
  pages stay visibly consistent with each other.
- `utils/subscriptionCalculations.ts` (new) — `normalizeToMonthly(amount,
  frequency)` converts any billing cycle onto a common monthly-equivalent
  footing (using average calendar-unit lengths — 365.25/12 days per month —
  since this is a cost *estimate* for a summary, not a ledger entry that
  needs exactness like `getBalanceEffect`); `getSubscriptionTotals(rules)`
  sums that across every *active* rule in the array it's given, returning
  `{ monthlyTotal, yearlyTotal, activeCount }`. It deliberately does **not**
  filter by `isSubscription` itself — callers pass the pre-filtered subset,
  so the same function can be reused later for narrower breakdowns (e.g.
  "totals for just streaming services") without re-deriving the filter.
- `pages/subscriptions/SubscriptionsPage.tsx` (new) — filters
  `subscribeToRecurringTransactions`'s live data to `type === 'expense' &&
  isSubscription`, shows three `StatCard`s (Monthly cost, Yearly cost,
  Active subscriptions — using `getSubscriptionTotals`) above a `DataTable`
  (Service/Category/Account/Billing cycle/Amount/Monthly cost/Next
  billing/actions). "Add Subscription" opens the same
  `RecurringTransactionFormDialog` used by the Recurring page, pre-filled
  with `type: 'expense', isSubscription: true` — the Type field is left
  editable rather than locked, so someone who lands here by mistake for an
  income rule isn't stuck, but the sensible defaults mean most people never
  touch it. Edit/pause/resume/delete reuse the exact same service calls and
  confirmation flow as the Recurring page. Like `DashboardPage.tsx`'s own
  aggregate totals, the stat cards assume a single currency
  (`profile.currency`, defaulting to INR) — a genuinely multi-currency
  subscription breakdown is future work, not a Phase 15 requirement.
- Nav + routing: a "Subscriptions" item was added to `navConfig.ts` (between
  Recurring and Accounts) and a lazy-loaded `/subscriptions` route to
  `router.tsx`. `navConfig.ts`'s header comment was updated to drop the
  now-resolved "Subscriptions" half, leaving "Net Worth is added in Phase
  27."

**Known limitations, not fixed this phase:**

- No multi-currency breakdown on the stat cards — if a user has
  subscriptions billed from accounts in different currencies, the Monthly
  cost/Yearly cost totals mix them under one currency label rather than
  grouping or converting (same accepted simplification `DashboardPage.tsx`
  already makes for its own aggregate totals).
- `normalizeToMonthly`'s weekly/daily conversions use an average month
  length (365.25 / 12 days), not the current calendar month's actual length
  — an intentional approximation for a cost estimate, documented in the
  module's own doc comment.
- No "cancel and archive" distinction from a plain delete — deleting a
  subscription here behaves exactly like deleting any other recurring rule
  (already-generated transactions are untouched, but the rule itself is
  gone rather than kept around as a canceled record).

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; a new
  `SubscriptionsPage` chunk appears in the build output.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 426/426 passing (22 new: `subscriptionCalculations`'s
  monthly-normalization math across every frequency and its totals/
  active-count aggregation including the empty-list and all-paused cases;
  the new subscription switch and chip on the existing recurring-transaction
  dialog and page tests; and the new `SubscriptionsPage`'s filtering — a
  plain recurring expense with `isSubscription: false` correctly does *not*
  appear here even though it lives in the same collection — stat totals,
  create/edit/delete/pause-resume, and empty/error/no-account states).
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/recurring`,
  `/subscriptions`, `/budgets`, `/reports`, and `/settings` confirmed no
  regressions (zero console errors, desktop + mobile viewports). Testing
  note for whoever runs this next: a *full* Playwright `devices[...]`
  profile (e.g. `'iPhone 13'` or `'Pixel 5'`) sets `isMobile`/`hasTouch`,
  which pushes Firebase Auth's SDK down a code path that eagerly loads
  `https://apis.google.com/js/api.js` for a storage-partitioning check —
  that domain sits outside this sandbox's egress allowlist and fails with
  `ERR_TUNNEL_CONNECTION_FAILED` on every route uniformly (it's Firebase's
  own init behavior, not anything in this app's code, and would resolve
  fine on a real device with real network access). A plain viewport resize
  (no full device profile) still exercises the responsive layout without
  tripping that unrelated sandbox limitation.
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once deployed, the user should confirm: flipping
  "This is a subscription" on an existing recurring expense (e.g. the
  Netflix rule from testing) makes it appear on the Subscriptions page
  immediately, with the right monthly-equivalent cost; adding a new
  subscription directly from the Subscriptions page's "Add Subscription"
  button creates a rule that also shows up correctly on the Recurring page
  with a "Subscription" chip; the Monthly cost/Yearly cost stat cards update
  correctly when a subscription is paused (excluded) or resumed (included)
  or deleted; a yearly-billed subscription (e.g. an annual plan) shows a
  materially smaller "Monthly cost" figure than its sticker price, and that
  figure roughly matches sticker-price ÷ 12; and pausing/editing/deleting a
  subscription from this page behaves identically to doing the same from
  the Recurring page (same underlying rule, same `id`).

**Next phase when instructed ("Continue to Phase 16"):** Phase 16 — Savings
Goals.

## Phase 16 — Savings Goals (COMPLETE)

**Starting state:** the `/goals` route, nav item, and `GoalsPage` component
already existed from Phase 1's scaffold, but `GoalsPage.tsx` was just a
`ComingSoonPage` placeholder (`phaseLabel="Phase 16"`) — no nav/router
changes were needed this phase, only replacing that one file's content and
adding everything behind it.

**Delivered:**

- **`currentAmount` is computed, never stored** — the single biggest design
  decision this phase, made explicit in `types/savingsGoal.ts`'s doc
  comment. The proposed data model in this file's own "Firestore data
  model" section lists `currentAmount` as a field on `savingsGoals`, but
  storing a running total here would repeat the exact class of bug
  `budgetCalculations.ts` (Phase 10) already sidesteps for budget-vs-actual
  by computing "actual spent" from real transactions every time rather than
  caching it. `utils/goalCalculations.ts`'s `getGoalProgress` does the same
  thing for goals: it sums every `GoalContribution` for a goal on the fly.
  A goal document only ever stores `name`/`category`/`targetAmount`/
  `targetDate`/`notes` — nothing that could drift out of sync with its
  contributions.
- Two new collections, both built on the existing `createUserScopedCollection`
  factory (no atomic/transactional writes needed, unlike accounts'
  paired-balance updates, precisely because nothing here stores a running
  total): `savingsGoals` (`services/goalService.ts`'s
  `createSavingsGoal`/`updateSavingsGoal`/`deleteSavingsGoal`/
  `subscribeToSavingsGoals`) and `goalContributions` (`createGoalContribution`/
  `deleteGoalContribution`/`subscribeToGoalContributions` — **create and
  delete only, no update**: correcting a contribution means deleting and
  re-adding, the same minimal CRUD a budget's per-category `BudgetItem` rows
  already get). `subscribeToGoalContributions` returns *every* contribution
  the user has across all their goals, not scoped to one `goalId` — the
  shared factory only filters by `userId` — and `GoalsPage` groups them
  client-side the same way `useTransactions`'s full ledger gets filtered
  per-budget-period elsewhere in this app.
- `utils/goalCalculations.ts` — `getGoalContributionsTotal`,
  `getDaysRemaining` (whole calendar days to a target date, ignoring
  time-of-day), `getGoalStatus`, and `getGoalProgress` (combines all of the
  above, mirroring `budgetCalculations.ts`'s `getBudgetProgress`). Goal
  status reuses the exact same four-color `safe`/`warning`/`nearLimit`/`over`
  semantic scale `theme.ts` already reserves "across budgets, goals, and
  alerts" (its own doc comment, written back in Phase 1) rather than adding
  a parallel palette — `over` means "past the target date without
  completing," `nearLimit`/`warning` mean the deadline is inside 30/90 days,
  and a completed goal or one with no target date is always `safe`. These
  30/90-day thresholds are a judgment call, chosen to give a similar
  multi-week runway to budget's own warning/over thresholds before
  escalating to the most urgent state.
- `components/goals/GoalCard.tsx` — mirrors `BudgetCard.tsx`'s layout
  (name, actions menu, chips, progress bar, status color) with goal-specific
  additions: a category icon next to the name (`config/savingsGoalCategories.ts`,
  the same icon+label meta pattern `accountTypeMeta` uses), a deadline line
  ("12 days left" / "5 days overdue" / "No target date"), an "Add money"
  button, and a collapsible (`Collapse … unmountOnExit`) contribution
  history with a per-row delete action.
- `components/goals/GoalFormDialog.tsx` — name, category, target amount, and
  an optional target date behind a "Set a target date" switch (the same
  `hasTargetDate`-is-a-UI-only-flag pattern `RecurringTransactionFormDialog`'s
  "Repeats indefinitely" switch uses for its optional end date), plus notes.
- `components/goals/ContributionFormDialog.tsx` — a small dialog (amount,
  date, optional note) opened from a specific goal's card; its title names
  the goal ("Add money to \"Rainy Day Fund\"") so it's unambiguous which
  goal a contribution is being added to.
- `pages/goals/GoalsPage.tsx` — three `StatCard`s (Total saved / Total
  target / Goals completed, following `SubscriptionsPage`'s stat-card row
  precedent) above a grid of `GoalCard`s, empty/error/loading states, and
  the create/edit-goal and add-contribution dialogs. Like `DashboardPage.tsx`
  and `SubscriptionsPage.tsx`'s own aggregate totals, the stat cards assume
  a single currency (`profile.currency`, defaulting to INR).
- `firestore.rules` gained `savingsGoals` (owner-only; `category` checked
  against the fixed enum; no `currentAmount` to validate, per the design
  decision above) and `goalContributions` (owner-only; `update` is not
  allowed at all, matching the service layer's create/delete-only contract)
  blocks, and `firestore.indexes.json` gained their two composite indexes
  (`savingsGoals` by `createdAt` desc, `goalContributions` by `date` desc) —
  **the user needs to deploy both** before using this page live.

**Known limitations, not fixed this phase:**

- A contribution doesn't link to or debit an actual transaction/account —
  it's a standalone progress record. The proposed data model lists an
  *optional* linked `transactionId` for a contribution; not implemented
  this phase (see `types/goalContribution.ts`'s doc comment). Saving toward
  a goal here doesn't move money out of any account balance.
- No multi-currency breakdown on the stat cards, same accepted
  simplification `DashboardPage.tsx` and `SubscriptionsPage.tsx` already
  make for their own aggregate totals.
- A contribution can be created or deleted, not edited — fixing a typo
  means deleting and re-adding it.
- No cross-collection check that a `goalContributions` document's `goalId`
  actually refers to a goal the same user owns (documented directly in
  `firestore.rules`) — same accepted-for-now gap Phase 31 is planned to
  harden across every collection that references another by id.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; a new `GoalsPage` chunk
  appears in the build output.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 493/493 passing (67 new: `goalCalculations`'s day-count
  math, status escalation thresholds, and progress combination including
  the zero-target and over-saved edge cases; `savingsGoalFormSchema`/
  `goalContributionFormSchema` validation; `GoalCard`'s status chips,
  deadline text, and contribution-history disclosure; `GoalFormDialog`/
  `ContributionFormDialog`'s validation and submission; and `GoalsPage`'s
  CRUD for both goals and contributions plus its stat-card totals). One
  testing note for whoever revisits this: MUI's `Collapse` only unmounts
  its content once its exit transition finishes, so a test asserting
  collapsed content is gone right after a click needs `unmountOnExit` on
  the component *and* a `waitFor` in the test, not a synchronous assertion.
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/recurring`,
  `/subscriptions`, `/goals`, `/budgets`, `/reports`, and `/settings`
  confirmed no regressions (zero console errors, desktop + mobile
  viewports, using a plain viewport resize rather than a full device
  profile — see Phase 15's note above about `apis.google.com` and this
  sandbox's egress allowlist).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once deployed, the user should confirm: creating a
  goal with a target date 10 days out shows "10 days left" and a
  near-limit-colored status chip; adding a contribution updates the
  progress bar, percentage, and "Total saved" stat card immediately;
  adding enough contributions to reach the target flips the chip to "Goal
  reached" and counts it in "Goals completed"; deleting a contribution
  correctly reduces the goal's current amount (never going stale, since
  it's computed fresh every time); a goal with no target date never shows a
  deadline warning no matter how old it gets; and deleting a goal removes
  its card and no longer counts its contributions toward the page's totals.

**Next phase when instructed ("Continue to Phase 17"):** Phase 17 — Debt
Tracking.

## Phase 17 — Debt Tracking (COMPLETE)

**Starting state:** unlike every page built so far this session, there was
no Phase-1 scaffold for this one — no `/debts` route, no nav item, no
`DebtsPage` stub. This phase adds all of that from scratch, alongside the
same data/UI layers Phase 16 built for goals.

**Delivered:**

- **`outstandingAmount` is computed, never stored** — the same "never a
  cached/duplicated number" decision Phase 16 made for a goal's
  `currentAmount`, applied a second time and explicitly cross-referenced in
  `types/debt.ts`'s doc comment. A `Debt` document only ever stores
  `lender`/`category`/`originalAmount`/`interestRate`/`minimumPayment`/
  `paymentDueDay`/`startDate`/`endDate`/`notes` — how much is left to pay is
  always summed fresh from `DebtPayment` records by
  `utils/debtCalculations.ts`'s `getDebtProgress`.
- Two new collections on the same `createUserScopedCollection` factory as
  Phase 16: `debts` (`services/debtService.ts`'s `createDebt`/`updateDebt`/
  `deleteDebt`/`subscribeToDebts`) and `debtPayments` (`createDebtPayment`/
  `deleteDebtPayment`/`subscribeToDebtPayments` — **create and delete only,
  no update**, same reasoning as a goal contribution). `subscribeToDebtPayments`
  returns every payment across all the user's debts, not scoped to one
  `debtId`, and `DebtsPage` groups them client-side exactly the way
  `GoalsPage` already does for contributions.
- `utils/debtCalculations.ts` — `getDebtPaymentsTotal`, `getOutstandingAmount`
  (floors at 0 if overpaid), `getNextPaymentDueDate` (rolls a recurring
  day-of-month forward to the next occurrence on or after today, clamping a
  day that overflows a shorter month — e.g. day 31 in February — to that
  month's last day, a deliberately different choice from Phase 14's
  `addInterval`, which lets a recurring transaction's date drift into the
  next month instead: a payment landing in the wrong month would be a much
  more confusing mistake), `getDaysUntilDue`, `getDebtStatus`, and
  `getDebtProgress` (combines all of the above). `DebtStatus` reuses the
  `safe`/`warning`/`nearLimit` slice of the same shared status palette
  `theme.ts` anticipated reusing "across budgets, goals, and alerts" —
  deliberately without an `over` state, since `getNextPaymentDueDate` always
  rolls forward to a date on or after today, so a debt's next due date can
  never be "missed" the way a goal's one-time deadline can.
- `components/debts/DebtCard.tsx` — mirrors `GoalCard.tsx`'s layout: a
  category icon next to the lender name (`config/debtCategories.ts`, the
  same icon+label meta pattern as `savingsGoalCategoryMeta`), an APR/minimum-
  payment subtitle line, category and status chips (a paid-off debt always
  shows a "Paid off" chip instead of a status label), a progress bar showing
  percent paid off, a due-date line ("Payment due in N days" / "Payment due
  today"), a "Record payment" button, and a collapsible
  (`Collapse … unmountOnExit`) payment history with a per-row delete action.
- `components/debts/DebtFormDialog.tsx` — lender, category, original amount,
  interest rate (0–100%, informational only — no interest accrual is
  computed), minimum payment, payment due day (1–31), a start date, and an
  optional target payoff date behind a "Set a target payoff date" switch
  (the same UI-only-toggle pattern as a goal's `hasTargetDate`), plus notes.
  A target payoff date must be on or after the start date.
- `components/debts/PaymentFormDialog.tsx` — a small dialog (amount, date,
  optional note) opened from a specific debt's card, titled `Record a
  payment to "{lender}"`.
- `pages/debts/DebtsPage.tsx` — three `StatCard`s (Total outstanding / Total
  original amount / Debts paid off) above a grid of `DebtCard`s, empty/error/
  loading states, and the create/edit-debt and record-payment dialogs — same
  structure as `GoalsPage.tsx`, single-currency stat cards (`profile.currency`,
  defaulting to INR).
- A new "Debts" nav item (`config/navConfig.ts`, between Goals and Reports,
  using the same `RequestQuoteOutlined` icon as the Personal Loan category —
  there being no dedicated "generic debt" icon in the set already in use)
  and a new lazy-loaded `/debts` route (`routes/router.tsx`) — the first page
  this session that needed new nav/router entries rather than replacing an
  existing scaffolded stub.
- `firestore.rules` gained `debts` (owner-only; `category` checked against
  the fixed enum; `originalAmount` positive; `interestRate`/`minimumPayment`
  non-negative; `paymentDueDay` an integer 1–31; no `outstandingAmount` to
  validate, per the design decision above) and `debtPayments` (owner-only;
  `update` not allowed, matching the service layer's create/delete-only
  contract) blocks, and `firestore.indexes.json` gained their two composite
  indexes (`debts` by `createdAt` desc, `debtPayments` by `date` desc) —
  **the user needs to deploy both**, alongside Phase 14's and Phase 16's
  still-pending rules/indexes, before using this page live.

**Known limitations, not fixed this phase:**

- No interest accrual — `interestRate` is stored and displayed but never
  used to grow the outstanding balance over time; it's purely informational.
- A payment doesn't link to or debit an actual transaction/account, same
  standalone-progress-record limitation Phase 16 accepted for goal
  contributions.
- No multi-currency breakdown on the stat cards, same accepted
  simplification as every other page's aggregate totals this session.
- A payment can be created or deleted, not edited — fixing a typo means
  deleting and re-adding it.
- No cross-collection check that a `debtPayments` document's `debtId`
  actually refers to a debt the same user owns (documented directly in
  `firestore.rules`) — the same accepted-for-now gap already left for
  `goalContributions`, `budgets`' items, and recurring-transaction
  `accountId`s, all earmarked for Phase 31 to harden together.
- This is deliberately scoped to installment-style debts with a fixed
  original amount (loans, mortgages, money borrowed from family) — a credit
  card's revolving balance is a different shape of problem and gets its own
  dedicated treatment in Phase 18.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; a new `DebtsPage` chunk
  appears in the build output.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 568/568 passing (75 new: `debtCalculations`'s due-date
  roll-forward and month-clamping math, status escalation thresholds, and
  progress combination including the zero-original-amount and overpaid edge
  cases; `debtFormSchema`/`debtPaymentFormSchema` validation including the
  target-payoff-date-before-start-date rejection; `DebtCard`'s status chips,
  due-date text, and payment-history disclosure; `DebtFormDialog`/
  `PaymentFormDialog`'s validation and submission; and `DebtsPage`'s CRUD for
  both debts and payments plus its stat-card totals). Test fixtures were
  deliberately named to avoid the name/category-label text collision Phase
  16 hit (e.g. a debt in the `personal_loan` category is named "Acme Bank,"
  never "Personal Loan").
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/recurring`,
  `/subscriptions`, `/goals`, `/debts`, `/budgets`, `/reports`, and
  `/settings` confirmed no regressions (zero console errors, desktop +
  mobile viewports, using a plain viewport resize rather than a full device
  profile — see Phase 15's note about `apis.google.com` and this sandbox's
  egress allowlist).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once deployed, the user should confirm: adding a
  debt with a payment due day of 31 in a month like February shows the
  correct clamped due date instead of spilling into March; recording a
  payment updates the outstanding amount, percent-paid bar, and "Total
  outstanding" stat card immediately; a debt whose next due date is within 3
  days shows the "Payment due soon" (`nearLimit`) chip, between 4–7 days
  shows "Payment approaching" (`warning`), and beyond that shows "On track"
  (`safe`); paying off a debt in full flips it to a "Paid off" chip and
  counts it in "Debts paid off"; deleting a payment correctly increases the
  outstanding amount back (never going stale, since it's computed fresh
  every time); and deleting a debt removes its card and no longer counts its
  payments toward the page's totals.

**Next phase when instructed ("Continue to Phase 18"):** Phase 18 — Credit
Card Management.

## Phase 18 — Credit Card Management (COMPLETE)

**Starting state and scope decision:** the proposed data model's `accounts`
entry already said "Credit cards add creditLimit, statementDate, dueDate" —
nested under `accounts`, not a separate collection. Unlike Phases 16/17,
this phase deliberately does **not** add a new page/route: a credit card is
still just an `Account` with `type: 'credit_card'` and a few extra fields,
so the existing Accounts page, `AccountCard`, and `AccountFormDialog` were
extended in place rather than building a parallel "Credit Cards" section.

**Delivered:**

- **A negative `currentBalance` formally means "money owed"** — this was
  already implied since Phase 3 (`accountSchemas.test.ts`'s "allows a
  negative opening balance (e.g. a credit card already carrying a
  balance)") but never made explicit or used anywhere. This phase names it
  in `types/account.ts`'s doc comment and builds on it directly:
  `getBalanceEffect` (`utils/transactionBalance.ts`) needed **no changes at
  all** — an expense charged to a credit card account already applies
  `-amount` the same as it would to a bank account, which is exactly
  "spending increases what's owed," and paying a card down is just a
  transfer into it like any other account. `utils/creditCardCalculations.ts`'s
  `getCreditCardDebt` is the one place that reads this sign back out as a
  positive "debt" number for display.
- `Account` gains three **optional** fields — `creditLimit`, `statementDay`,
  `paymentDueDay` (`number | null`, `null`/absent for every non-credit-card
  account). Optional, rather than the required-but-nullable convention
  `SavingsGoal`/`Debt` use for their own fields, specifically so the seven
  existing test files across five earlier phases (Dashboard, Recurring,
  Subscriptions, Transactions, `useAccounts`, plus Accounts' own) that
  already construct literal `Account` objects didn't all need editing for a
  field that's inapplicable to the accounts they're testing anyway.
  `statementDay`/`paymentDueDay` are a recurring day-of-month (1–31), named
  to match `types/debt.ts`'s `paymentDueDay` rather than the original
  proposal's "-Date" suffix.
- **`utils/dayOfMonth.ts` (new)** — `getNextOccurrenceOfDay`/`getDaysUntil`,
  extracted from Phase 17's `debtCalculations.ts` specifically so a credit
  card's statement/due dates reuse the exact same roll-forward-and-clamp
  logic a debt's `paymentDueDay` already has, instead of a second copy
  drifting out of sync with the first. `debtCalculations.ts`'s own
  `getNextPaymentDueDate`/`getDaysUntilDue` are now thin wrappers around the
  shared functions — same names, same behavior, so every existing caller
  and test needed no changes.
- `utils/creditCardCalculations.ts` (new) — `getCreditCardDebt`,
  `getAvailableCredit` (not floored at 0 — a negative result means over the
  limit, which is worth surfacing), `getUtilization`, `getCreditCardStatus`,
  and `getCreditCardProgress` (combines all of the above, mirroring
  `getDebtProgress`/`getGoalProgress`). `CreditCardStatus` reuses the full
  four-color `safe`/`warning`/`nearLimit`/`over` palette (unlike a debt's
  three-color slice) because exceeding a credit limit is a real, common
  event, not a structurally-unreachable state — thresholds (50%/80%/100%)
  are a judgment call loosely tracking common advice to keep utilization
  under ~30% for a healthy score, with room above that for "elevated but
  not urgent" before escalating.
- `AccountFormDialog.tsx` shows Credit limit / Statement day / Payment due
  day fields only once "Credit Card" is selected as the account type — the
  type value itself is the toggle, no separate boolean flag needed (unlike
  `hasTargetDate`/`hasEndDate`). The dialog's `submit` handler clears all
  three to `null` before calling `onSubmit` for any other type, the same
  "UI-only conditional field, cleared at submit time" pattern used
  elsewhere. A credit limit is required to be positive only when the type
  is Credit Card (`accountFormSchema`'s new `.refine`).
- `AccountCard.tsx` shows, only for a credit-card account with a credit
  limit set: a status chip ("Utilization healthy" / "elevated" / "Near
  credit limit" / "Over credit limit"), a debt-vs-limit progress bar, and a
  "Payment due in N days" line when a `paymentDueDay` is set. A credit-card
  account with no limit yet (or one created before this phase) falls back
  to looking like any other account, unchanged.
- `AccountsPage.tsx` gains two additional stat cards — Total credit card
  debt / Total available credit — shown only when at least one credit card
  has a limit set. These are in addition to, not a replacement for, the
  existing per-currency "Total balance" cards (which already summed credit
  card balances into the same currency total as other accounts — an
  existing simplification, unchanged, that Phase 27's net worth work will
  presumably revisit).
- `firestore.rules`'s `accounts` block gained shape checks for the three
  new fields (each must be `null` or the right type/range) on both create
  and update, alongside its existing balance-invariant checks — **the user
  needs to deploy this** alongside Phase 14's, 16's, and 17's still-pending
  rules/indexes (no new indexes needed this phase, since credit card fields
  aren't queried/ordered on).

**Known limitations, not fixed this phase:**

- No interest accrual on a carried credit card balance — same accepted
  simplification Phase 17 made for debts' `interestRate`.
- No statement-balance concept (the amount that was owed as of the last
  statement, separate from the current running balance) — only the current
  outstanding debt is tracked, computed live from `currentBalance`.
- The existing per-currency "Total balance" stat cards still net a credit
  card's negative balance against other accounts' positive ones in the same
  currency, rather than excluding cards from that particular total — an
  existing Phase 3 behavior, not changed here, alongside the new
  cards-only totals added this phase.
- No over-limit warning at the point of charging a transaction — a card can
  be pushed over its limit by an ordinary expense entry with no interstitial
  confirmation; the "Over credit limit" status only surfaces passively on
  the Accounts page afterward.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; a new standalone
  `dayOfMonth` chunk appears (shared by `debtCalculations` and
  `creditCardCalculations`), and the `AccountsPage` chunk grew accordingly.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 606/606 passing (38 new: `dayOfMonth`'s roll-forward and
  month-clamping math — mirroring the same scenarios `debtCalculations.test.ts`
  already covered, now against the shared module directly;
  `creditCardCalculations`'s debt/utilization/status math including the
  zero-limit and over-limit edge cases; `accountFormSchema`'s new
  conditional credit-limit requirement and day-of-month bounds;
  `AccountFormDialog`'s conditional field visibility, validation, and the
  clear-to-null-when-not-a-credit-card submit behavior; `AccountCard`'s
  utilization chip/progress bar/due-date text, including the fallback for a
  card with no limit set; and `AccountsPage`'s new stat cards). Two existing
  test files (`AccountFormDialog.test.tsx`'s and `accountSchemas.test.ts`'s
  hard-coded `AccountFormValues`/base fixtures) needed the three new fields
  added to keep compiling — an expected, narrow consequence of adding
  required fields to a form schema, unlike `Account` itself which stayed
  optional specifically to avoid this ripple everywhere else. `AccountCard.test.tsx`
  and `AccountsPage.test.tsx` were switched from plain Testing Library
  `render` to the shared `renderWithProviders` wrapper (already used by
  every card/page test since Phase 13) because rendering the new status
  chip reads `theme.palette.status`, which only exists on the app's custom
  theme, not MUI's bare default one.
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/recurring`,
  `/subscriptions`, `/goals`, `/debts`, `/budgets`, `/reports`, and
  `/settings` confirmed no regressions (zero console errors, desktop +
  mobile viewports, plain viewport resize per Phase 15's note).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once deployed, the user should confirm: adding a
  credit card account shows the new fields only after selecting "Credit
  Card" as the type; charging an expense to the card increases the shown
  debt and utilization percentage; a card's utilization crossing 50%/80%/
  100% flips its status chip through "elevated" → "Near credit limit" →
  "Over credit limit" in real time; a payment (recorded as a transfer into
  the card account) reduces the debt and available credit immediately;
  setting a payment due day shows a correct "Payment due in N days" line
  that rolls to next month once the day passes, clamping correctly for a
  due day past a shorter month's end; and the Accounts page's "Total credit
  card debt"/"Total available credit" stat cards only appear once at least
  one card has a limit set, and sum correctly across multiple cards.

**Next phase when instructed ("Continue to Phase 19"):** Phase 19 — Receipt
Management.

## Phase 19 — Receipt Management (COMPLETE)

**Delivered:**

- `receipts` is its own new top-level Firestore collection, per the proposed
  data model — unlike Phase 18 (which extended `accounts` in place), this
  follows the Phase 16/17 pattern of a new collection getting its own page
  and route (`/receipts`, added to the sidebar between Debts and Reports).
- Firebase Storage is wired into the project for the first time
  (`src/firebase/config.ts`'s new `storage` export) — this was explicitly
  flagged back in Phase 2's log as deferred "alongside Phase 19 (receipts),
  which needs Storage anyway." A brand new `storage.rules` file enforces
  per-user isolation the same way `firestore.rules` does (owner-scoped path,
  here `receipts/{userId}/{fileName}` instead of a stored `userId` field),
  plus a server-side 5 MB size cap and an image/PDF content-type check —
  **the user needs to deploy this** with `npx firebase-tools deploy --only
  storage` (documented in a new README section), separately from the
  Firestore rules/indexes deploys still pending from Phases 14/16/17/18.
  Storage itself must be enabled for the project in the Firebase Console
  first if it hasn't been already.
- A receipt (`types/receipt.ts`) is a photo or PDF of a purchase —
  `merchant`/`amount`/`date`/`notes` entered by the user, plus file metadata
  (`storagePath`/`downloadUrl`/`fileName`/`fileType`/`fileSize`) captured
  once at upload. It can optionally point at an existing transaction via
  `transactionId` (`null` when standalone) — the same directional shape as
  `GoalContribution.goalId`/`DebtPayment.debtId`, but unlike those,
  **editable after creation**: a receipt can be linked or unlinked later
  via `updateReceipt`. The file itself is immutable once uploaded (no
  update path in `receiptService.ts`, and `firestore.rules` rejects any
  update that changes the stored file-metadata fields) — replacing a
  receipt's file means deleting the receipt and adding a new one.
- `services/receiptService.ts`: `uploadReceiptFile(userId, file)` writes to
  Storage at `receipts/{userId}/{timestamp}-{filename}` and returns the
  path plus download URL; `createReceipt`/`updateReceipt` follow the usual
  `createUserScopedCollection` pattern; `deleteReceipt(id, storagePath)`
  best-effort deletes the Storage object first (wrapped so an
  already-missing object doesn't block cleanup), then always deletes the
  Firestore doc; `subscribeToReceipts` orders by `date` descending (new
  composite index in `firestore.indexes.json`).
- `ReceiptsPage`: stat cards for total receipts, total amount, and how many
  are linked to a transaction; a card grid (`ReceiptCard`) showing an image
  thumbnail or a PDF icon fallback, the linked-transaction chip when
  present, and a "view receipt" link that opens the file in a new tab.
  Reuses the existing `useTransactions()` hook read-only to populate the
  "link to transaction" dropdown and resolve a receipt's linked transaction
  for display — exactly the reuse case that hook's own doc comment
  anticipated.
- `ReceiptFormDialog`: on create, a file picker (accepting JPEG/PNG/WebP/PDF,
  max 5 MB, both checked client-side before upload) is required; on edit,
  the existing file name is shown read-only instead, since the file can't
  be replaced. The selected `File` is deliberately kept as plain
  `useState`, not run through React Hook Form/Zod like every other field in
  this app — native file inputs don't fit a controlled-component model, and
  file validation is simpler as plain JS checks than as a Zod schema.
- **Explicitly deferred: OCR.** The proposed data model's own phrasing
  ("architecture leaves room for OCR fields... without requiring them now")
  signals this is optional future work, not a Phase 19 requirement —
  merchant/amount/date are entered manually. Adding real OCR fields later
  needs no migration, since every existing document simply has neither.
- `vite.config.ts`'s `manualChunks` gained a `vendor-firebase-storage`
  bucket, matching the existing per-Firebase-subpackage chunking.

**Known limitations, not fixed this phase:**

- If the Firestore write fails after a successful Storage upload, the
  uploaded file is orphaned (never deleted) — accepted as a known edge case
  rather than building transactional rollback, consistent with how this
  session has handled similar edge cases in earlier phases.
- No OCR (see above) — receipt fields are entered manually.
- No bulk upload — one receipt (one file) at a time.
- No thumbnail generation for PDFs — a generic PDF icon is shown instead of
  a rendered first page.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; a new `ReceiptsPage`
  chunk and a new `vendor-firebase-storage` chunk appear in the build
  output.
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 645/645 passing (39 new: `receiptFormSchema` validation
  including the linked/unlinked transaction cases; `ReceiptFormDialog`'s
  create-vs-edit file picker behavior, file-type/file-size rejection,
  file-required-on-create validation, merchant/amount validation, the
  transaction-link select, and submit success/failure/cancel; `ReceiptCard`'s
  image-thumbnail-vs-PDF-icon fallback, linked-transaction chip, notes
  display, view-file link, and edit/delete menu actions; `ReceiptsPage`'s
  empty/error states, stat cards, linked-transaction resolution, the
  two-step upload-then-create flow, edit-without-touching-the-file, and
  delete-with-confirmation).
- A Playwright pass across `/`, `/accounts`, `/transactions`, `/recurring`,
  `/subscriptions`, `/goals`, `/debts`, `/receipts`, `/budgets`, `/reports`,
  and `/settings` confirmed no regressions (zero console errors, desktop +
  mobile viewports, plain viewport resize per Phase 15's note).
- Not exercised end-to-end against live Firestore/Storage from this sandbox
  (no network access here). Once both `firestore.rules` and the new
  `storage.rules` are deployed, the user should confirm: adding a receipt
  requires choosing a file before it can be submitted; a JPEG/PNG/WebP/PDF
  under 5 MB uploads and the receipt appears in the grid with a working
  thumbnail (or PDF icon); a file of the wrong type or over 5 MB is
  rejected client-side with a clear message before any upload is attempted;
  editing a receipt lets you change merchant/amount/date/notes/linked
  transaction but not replace the file; linking a receipt to an existing
  transaction shows the chip and the transaction's description on the
  card; deleting a receipt removes both the Firestore doc and the
  underlying Storage file (confirm in the Storage console); and the
  "View receipt" link opens the actual uploaded file in a new tab.

**Next phase when instructed ("Continue to Phase 20"):** Phase 20 —
Transaction Search.

## Phase 20 — Transaction Search (COMPLETE)

**Delivered:**

- Unlike every phase since 16, this one adds no new collection, page, or
  route — the phase-plan's one-line title ("Transaction search") is scoped
  to the existing `/transactions` ledger, so it extends `TransactionsPage`
  in place, the same "extend, don't add a page" shape Phase 18 chose (for
  the same reason: the thing being searched already has a home). It sits
  directly below Phase 13's `DateRangeFilter` and narrows whatever that
  filter already narrowed — entirely client-side over the transactions the
  existing `subscribeToTransactions` call has already delivered, no new
  Firestore query.
- `utils/transactionSearch.ts` (new, pure, unit-tested in isolation like
  `dateRangePresets.ts`/`expenseCategoryLookup.ts`): a `TransactionFilters`
  shape (`query`, `types`, `accountIds`, `minAmount`, `maxAmount` — every
  array empty and every number `null` means "no filter", the same
  convention `ExpenseFormDialog`'s optional subcategory select already
  uses) and a `filterTransactions` function that ANDs all five together.
  The free-text `query` is matched against whichever fields a given
  transaction type actually has: merchant for expense/refund, source for
  income, reason for adjustment, plus description/notes/category-or-
  subcategory-label/account-name on every type — a transfer (no merchant,
  source, or reason of its own) is only matched by its description, notes,
  or either of its two account names.
- `components/transactions/TransactionFilters.tsx` (new): a search box plus
  Type/Account multi-selects (plain controlled MUI `Select`s, not the
  RHF-`Controller`-based `FormSelect` — this is live filter state, not a
  submitted form, the same reasoning `DateRangeFilter` already follows) and
  min/max amount fields. Shows a "N matching transactions" chip and a
  "Clear filters" button once anything is active; otherwise a one-line
  hint of what can be searched.
- `TransactionsPage.tsx`: the previous single `filteredTransactions` memo
  (date-range only) is now `dateFilteredTransactions`, feeding a second
  memo, `visibleTransactions`, that layers `filterTransactions` on top.
  The table's empty state now distinguishes three cases instead of two:
  no transactions at all, none in the selected date range (existing, Phase
  13's message), or none matching the search/type/account/amount filters
  (new) — each with its own title and suggested next step.

**Known limitations, not fixed this phase:**

- Search is a plain case-insensitive substring match — no fuzzy matching,
  no multi-word AND/OR logic beyond "the whole query must appear
  contiguously", and no highlighting of the matched text in the table.
- No saved searches or shareable filter links (e.g. via URL query params) —
  filters reset to "show everything" on navigating away and back.
- No search across receipts (Phase 19) or tags (Phase 21, not yet built) —
  scoped to the transaction ledger's own fields only, per the phase title.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; no new chunk (this
  phase's code lives inside the existing `TransactionsPage` chunk, which
  grew from ~23 KB to ~27 KB).
- `oxlint` — 0 errors, only the same pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 680/680 passing (35 new: `transactionSearch`'s matching
  logic per transaction type, its AND-combination of all five filter
  dimensions, and its "empty means no filter" convention;
  `TransactionFilters`'s query/type/account/amount change handlers, result
  count display, and "Clear filters" reset; and six new `TransactionsPage`
  integration tests covering free-text search, the distinct "no matches"
  empty state, type filtering, account filtering (including a transfer
  matching on either leg), amount filtering, and the result count/clear
  round-trip).
- A Playwright pass across all 11 existing routes (no new route this
  phase) confirmed no regressions (zero console errors, desktop + mobile
  viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here) — though since this phase is pure client-side
  filtering over already-loaded data, there's nothing new to deploy
  (`firestore.rules`/`firestore.indexes.json` are unchanged). Once
  deployed, the user should confirm: typing a merchant name narrows the
  table to matching expense/refund rows; searching an income source,
  an adjustment's reason text, or an account name each work the same way;
  selecting one or more transaction types or accounts from their
  dropdowns narrows the table accordingly, and a transfer shows up when
  either its source or destination account is selected; setting a minimum
  and/or maximum amount narrows to that range; the "N matching
  transactions" count updates live as filters change; and "Clear filters"
  restores the full (date-range-limited) list.

**Next phase when instructed ("Continue to Phase 21"):** Phase 21 — Tags.

## Phase 21 — Tags (COMPLETE)

**Delivered:**

- A real, per-user tag registry — `types/tag.ts` (`Tag`, plus a fixed
  `TAG_COLORS` palette of MUI's own theme colors: `default`, `primary`,
  `secondary`, `success`, `error`, `warning`, `info` — the same reasoning
  `TRANSACTION_TYPE_CHIP_META` already follows for staying legible in both
  light and dark mode for free, rather than a user-picked hex value needing
  its own contrast handling). Every transaction dialog's `tags: string[]`
  field has stored freeform text since Phase 8; this phase gives those
  strings a real, manageable backing collection for the first time.
- Follows the exact `slug`/`name` split Phase 6's `ExpenseCategoryRecord`
  established: `slug` is the stable identifier actually stored in a
  transaction's (unchanged-shape) `tags` array, `name`/`color` are freely
  editable and resolved by live lookup (`utils/tagLookup.ts`'s
  `getTagLabel`/`getTagColor`) at every display site. Renaming or
  recoloring a tag is free — no cascade write across existing transactions,
  since every consumer looks the current name/color up live rather than
  trusting a value captured at tagging time. Deleting a tag leaves existing
  transactions holding a slug that no longer resolves — shown as an
  uncolored chip labeled with the raw slug, the same accepted "shows as
  plain text" limitation Phase 6 documented for a deleted expense category.
  Deliberately not building cascade-rename/cascade-delete-removal logic
  (which would mean Firestore batch writes across the whole transaction
  collection) — consistent with the risk this session has steered away
  from in every phase since 6.
- `services/tagService.ts` (new, mirrors `categoryService.ts`): `createTag`,
  `updateTag` (name/color only — `slug` is immutable once created, same as
  `renameExpenseCategory`), `deleteTag`, `subscribeToTags`/`sortTags`
  (client-side, by name — no composite index needed, same as
  `expenseCategories`). `hooks/useTags.ts` (new, mirrors
  `useExpenseCategories.ts` minus its default-seeding step — a user's tag
  list starts empty and grows only from what they create).
- Tags are no longer freeSolo: `components/common/form/FormTagsInput.tsx`
  was rewritten from a freeSolo text-entry `Autocomplete` to a closed
  multi-select over the real tag list (MUI's `renderValue` +
  `getItemProps` render each selection as a colored `Chip`), matching the
  same "manage the picklist in Settings, just pick from it in the
  transaction form" shape `ExpenseFormDialog`'s category select already
  uses — chosen over keeping inline freeSolo creation, for consistency
  with that established precedent and to avoid tag-creation side effects
  inside a transaction save flow. All five transaction dialogs (Income,
  Expense, Refund, Adjustment, Transfer) now take a `tags: Tag[]` prop and
  pass `toTagOptions(tags)` into `FormTagsInput`.
- Settings → Tags: `components/settings/TagFormDialog.tsx` (new, mirrors
  `CategoryFormDialog.tsx`) adds a `name` field plus a row of clickable
  colored `Chip`s (one per `TAG_COLORS` value, `role="radio"`) for picking
  a tag's color — a lighter-weight UI than a `FormSelect` dropdown, since
  the color itself is the whole point and a chip preview shows it
  directly. `components/settings/TagsSection.tsx` (new, flat sibling of
  `CategoriesSection.tsx` — no subcategory-style hierarchy to expand into):
  each tag renders as a single colored chip; clicking it opens
  `TagFormDialog` to rename/recolor (mirroring how `CategoriesSection`'s
  own subcategory chips already use click-to-rename), its delete icon
  removes it after the same confirm-dialog pattern (and the same
  "existing transactions will keep showing '[Name]' as plain text"
  wording) `CategoriesSection` uses for a deleted category. Wired into
  `SettingsPage.tsx` alongside `ProfileSection`/`CategoriesSection`.
- Closed two known limitations Phase 20 explicitly flagged as future work:
  `TransactionsPage.tsx` now has a **Tags** column showing each row's tags
  as colored chips (via live `getTagLabel`/`getTagColor` lookups, "—" when
  a transaction has none), and `utils/transactionSearch.ts`'s free-text
  search now also matches a transaction's tag names (via a new optional
  `tags` field on `TransactionSearchContext`, resolved the same way as the
  category/account-name lookups already there — optional so any caller
  that predates tags keeps compiling, treated as "nothing extra to
  match" when omitted).
- `firestore.rules`: new `tags/{tagId}` block, structurally identical to
  the `expenseCategories` block it sits beside — owner-scoped read;
  `create` requires `userId` match plus non-empty `name`/`slug` and a
  `color` from the fixed palette; `update` requires `slug` unchanged plus
  valid `name`/`color`; owner-scoped `delete`. No `firestore.indexes.json`
  change (tags sort client-side, same as `expenseCategories`).

**Known limitations, not fixed this phase:**

- No cascade rename/delete across existing transactions when a tag is
  renamed or deleted (by design — see above); a deleted tag's slug shows
  as plain, uncolored text on transactions that already had it.
- No tag usage counts or a "merge tags" tool in Settings — deleting a
  heavily-used tag gives no warning about how many transactions reference
  it beyond the generic delete-confirmation message.
- No bulk-tagging (selecting several transactions and tagging them all at
  once) — tags are still set one transaction at a time, from within each
  transaction's own dialog.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; no new route or chunk
  (Settings' new `TagsSection`/`TagFormDialog` live inside the existing
  `SettingsPage` chunk, which grew from ~11 KB to ~14 KB; `TransactionsPage`
  grew from ~27 KB to ~28 KB for the new Tags column and tag-aware search).
- `oxlint` — 0 errors, only the same 19 pre-existing benign fast-refresh
  warnings from earlier phases (no new ones from this phase's files).
- `npm run test` — 713/713 passing (33 new: `tagSchemas`' name/color
  validation; `tagLookup`'s option-mapping and label/color live-lookup
  with fallback for an unknown slug; `TagFormDialog`'s create/edit
  rendering, color selection, validation, and submit/error handling;
  `TagsSection`'s loading/empty/error states, create/rename/recolor/delete
  flows (including a declined-confirmation case); one new tag-selection
  test added to each of the five transaction dialogs' existing test files,
  exercising `FormTagsInput`'s rewritten closed multi-select end to end
  since it has no test file of its own, per this codebase's "no dedicated
  test file for shared Form* components" convention; two new
  `transactionSearch` tests for matching by a tag's live display name and
  falling back gracefully when the tag list is missing or a slug is
  unknown; and two new `TransactionsPage` integration tests for the Tags
  column rendering and tag-based search).
- A Playwright pass across all 11 existing routes (no new route this
  phase) confirmed no regressions (zero console errors, desktop + mobile
  viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here) — the new `tags` rules block joins the still-
  pending rules from Phases 14/16/17/18/19 awaiting deployment. Once
  deployed, the user should confirm: Settings → Tags lets you create a tag
  with a name and a color, see it as a colored chip, click it to rename or
  recolor it, and delete it (with a confirmation that explains existing
  transactions keep showing its name as plain text); every transaction
  form's Tags field now shows a dropdown of your real tags as colored
  chips instead of free typing, and selecting one attaches it; the
  Transactions table shows each row's tags as colored chips, and typing a
  tag's name into the search box narrows the table to transactions that
  have it; renaming a tag in Settings updates its label everywhere it's
  used (table chips, the tag picker, search) without needing to re-save
  any transaction; and deleting a tag makes it disappear from the picker
  while transactions that already had it keep showing its old name as
  plain, uncolored text.

**Next phase when instructed ("Continue to Phase 22"):** Phase 22 —
Monthly financial summary.

## Phase 22 — Monthly Financial Summary (COMPLETE)

**Delivered:**

- A genuinely new, dedicated page at `/monthly-summary` (new sidebar item,
  "Monthly Summary") — not an extension of an existing page. This follows
  through on a decision already recorded in `reportCalculations.ts`'s own
  comments back in Phase 12: "Phase 22/23 build the dedicated monthly/
  yearly summary pages", explicitly distinguishing this from Phase 11's
  dashboard (always "this month", no comparison) and Phase 12's Reports
  page (a 6-month trend plus a top-8-category list, no budget tie-in, no
  month-over-month comparison). Phase 23 (Yearly Summary) will be this
  page's yearly-scoped sibling.
- Extracted the prev/next month picker Phase 12's Reports page introduced
  into `hooks/useMonthNavigation.ts` (offset state, selected month, its
  date range, its display label, and the "never past the current month"
  guard) and `components/common/MonthSelector.tsx` (the picker UI, same
  aria-labels as before). `ReportsPage.tsx` was refactored to use both —
  behavior and DOM unchanged (its existing tests pass unmodified) — purely
  so this phase's new page doesn't re-implement identical logic, and so
  Phase 23 has the same extraction pattern to follow for a year picker.
- New `utils/monthlySummaryCalculations.ts` (pure, unit-tested in
  isolation like every other calculations module): `getMonthOverMonthChange`
  (percent change in income/expense/net vs. the previous calendar month —
  `null`, not a fabricated "+∞%" or a divide-by-zero, when there's nothing
  to compare against, except when both months are exactly zero, which is a
  real "no change"), `getSavingsRate` (net ÷ income, `null` with no
  income), `getTrendDirection` (maps a change to `StatCard`'s `up`/`down`/
  `neutral` by whether it's *favorable*, not by its raw sign — an expense
  increase is unfavorable even though the percent is positive),
  `getBudgetsForMonth` (budgets whose date range overlaps the selected
  month at all, broader than `dashboardCalculations.ts`'s `getActiveBudgets`
  which only checks "today" — needed since this page can look at any past
  month), `getBiggestExpense`, and `getTransactionCountByType`.
- The page itself: `MonthSelector` at the top; four `StatCard`s (Income,
  Expenses, Net savings, Savings rate) each showing a month-over-month
  `trend` string — the first real use of `StatCard`'s `trend`/
  `trendDirection` props, which existed since Phase 11 but nothing had used
  yet; a full (uncapped, unlike Reports' top-8) category breakdown with a
  donut chart (reusing Phase 11's `getExpenseByCategory`) and a per-category
  progress bar; a budget-performance card listing every budget touching the
  selected month via the new `getBudgetsForMonth`, reusing Phase 10's
  `getBudgetProgress` and the exact status-chip/progress-bar treatment
  Phase 11's dashboard already established; a "biggest expense" card (the
  single largest expense transaction, with its merchant, date, and
  category); and a transaction-count-by-type card (chips per type, only
  for types that occurred).
- Extracted the dashboard's pie-chart palette into `config/chartColors.ts`
  (`CATEGORY_CHART_COLORS`) so this page's category donut chart matches
  the dashboard's exactly instead of duplicating the same six hex values a
  second time; `DashboardPage.tsx` now imports from there too.

**Known limitations, not fixed this phase:**

- Like every other phase since 8, all figures use the user's single
  default currency (`profile.currency`) with no per-account currency
  awareness — same accepted FX-out-of-scope limitation as Phases 8/10/
  11/12.
- No PDF/export of the summary, and no way to email or share it — it's a
  read-only, in-app view for now (Phase 29, Export data, is where a
  downloadable version would land if the user wants one later — resolved:
  this page now has its own "Export PDF" button).
- "Biggest expense" only considers plain `expense` transactions, not a net
  figure after any later refund against it — a fully-refunded large
  purchase still shows up here even though its net cost was zero.
- The budget-performance card lists every budget whose range *touches* the
  selected month at all (including one that only overlaps a few days of
  it), not one prorated to just the days inside the month — same
  intentional simplification `getBudgetProgress` already makes for a
  budget spanning a partial period.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; the new page is its own
  ~8.5 KB route-level chunk (`MonthlySummaryPage`), same code-splitting
  approach every page has followed since Phase 1.
- `oxlint` — 0 errors; 20 warnings (one more than before, all the same
  benign fast-refresh class already present for every other lazy-loaded
  route in `router.tsx` — the new `MonthlySummaryPage` import added one
  more instance of an existing warning, not a new kind of issue).
- `npm run test` — 759/759 passing (46 new: `useMonthNavigation`'s current-
  month default, prev/next navigation, the "never past current month"
  guard, and a year-boundary walk-back; `MonthSelector`'s label/click/
  disabled-state rendering; `monthlySummaryCalculations`'s full suite —
  month-over-month percent change including the zero/zero and negative-
  previous-value edge cases, savings rate (including negative), trend-
  direction favorability mapping, both trend-text formatters, budget-month
  overlap in all three shapes (exact match, partial overlap, no overlap),
  biggest-expense selection and its out-of-range/wrong-type/empty cases,
  and transaction-count-by-type; and 13 new `MonthlySummaryPage` integration
  tests covering loading/error states, all four stat cards and their
  month-over-month trend text, the "no prior month data" case, the full
  category breakdown, budget performance (including its own empty state
  and its "View all" navigation), the biggest-expense card, the
  transaction-count breakdown, and month navigation).
- A Playwright pass across all 12 routes (11 existing plus the new
  `/monthly-summary`) confirmed no regressions and no console errors on
  the new route either (desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here) — but this phase reads existing collections only
  (`transactions`, `budgets`, `expenseCategories`) with no new writes, so
  there is nothing new to deploy (`firestore.rules`/
  `firestore.indexes.json` are unchanged). Once deployed, the user should
  confirm: the new "Monthly Summary" sidebar item opens a page distinct
  from both Dashboard and Reports; the month picker walks backward/forward
  and can't go past the current month; the four stat cards show correct
  income/expenses/net savings/savings-rate figures for the selected month,
  each with a "+X% vs last month" (or "No data last month" for the
  earliest month with data) comparison that's colored green when favorable
  and red when not — including that an expense *increase* shows red, not
  green; the category donut chart and list show every category with
  spending that month, not just a top few; every budget whose period
  touches the selected month appears with its correct spent/total and
  status color, and picking a month with no such budget shows the empty
  state; the "View all" link goes to Budgets; the biggest single expense
  for the month shows its correct amount, merchant, and category; and the
  transaction-count chips match the number of each type actually recorded
  that month.

**Next phase when instructed ("Continue to Phase 23"):** Phase 23 —
Yearly summary.

## Phase 23 — Yearly Summary (COMPLETE)

**Delivered:**

- A genuinely new, dedicated page at `/yearly-summary` (new sidebar item,
  "Yearly Summary") — Phase 22's Monthly Summary explicitly called this
  page out as its "yearly-scoped sibling," so it follows the exact same
  shape one calendar tier up: a year picker, four stat cards with a
  year-over-year comparison, a full category breakdown, budget
  performance, the biggest expense, and a transaction-count breakdown —
  plus one thing a single month doesn't need: a month-by-month
  income-vs-expenses bar chart across the whole selected year, reusing
  Phase 12's `getMonthlyTrend` (pointed at December of the selected year
  instead of "the last N months ending today").
- Extracted the year-scoped counterparts to Phase 22's month-picker
  extraction: `hooks/useYearNavigation.ts` (year offset, the selected
  year's date range, its label, and the same "never past the current
  year" guard) and `components/common/YearSelector.tsx` (identical
  control, "Previous year"/"Next year" aria-labels).
- Pulled the percent-change/savings-rate/trend-direction/formatting math
  out of Phase 22's `monthlySummaryCalculations.ts` into a new, genuinely
  period-agnostic `utils/periodComparison.ts` — the same "is this change
  favorable" math applies whether two months or two years are being
  compared, so it now lives once. `monthlySummaryCalculations.ts` and the
  new `utils/yearlySummaryCalculations.ts` each just re-export it under
  their own period-flavored names (`getMonthOverMonthChange`/
  `getYearOverYearChange`), so every existing call site and test from
  Phase 22 kept working completely unchanged. `formatChangePercent`/
  `formatSavingsRateChange` gained an optional `comparisonLabel` parameter
  (defaulting to `'last month'` for backward compatibility) so this page
  can pass `'last year'` instead of duplicating the formatting logic.
- Added `getYearRange(year)` next to Phase 12's `getMonthRange` in
  `reportCalculations.ts` — the year-scoped sibling that function's own
  comment already anticipated.
- Reused Phase 22's `getBudgetsForMonth`/`getBiggestExpense`/
  `getTransactionCountByType` directly for the whole year (they already
  take a plain `start`/`end` range and don't actually assume "month"
  despite their names) rather than duplicating or re-wrapping them — the
  same kind of reuse `getPeriodTotals`/`getExpenseByCategory` already get
  across Dashboard, Reports, and Monthly Summary.
- Budget performance for a year lists every budget whose range overlaps
  that year at all — for most users that means several monthly budgets
  appearing individually (no aggregation into one yearly bar), which is
  called out below as a known limitation, same honesty Phase 22 applied
  to its own month-level version of this same overlap-based matching.

**Known limitations, not fixed this phase:**

- Same single-currency, no-per-account-FX limitation every phase since 8
  has carried.
- No PDF/export of the summary (Phase 29, Export data, is where that
  would land — resolved: this page now has its own "Export PDF" button).
- "Biggest expense" only considers plain `expense` transactions, not a net
  figure after a later refund — same limitation Phase 22 already
  documented, now also true across a whole year's data.
- The budget-performance card lists every budget whose range *touches*
  the year at all, not prorated to the days actually inside it, and does
  not aggregate multiple monthly (or other sub-year) budgets into one
  combined yearly figure — a user with 12 separate monthly budgets will
  see all 12 listed individually rather than a single yearly rollup. A
  true budget *rollup* across a year is out of scope here; it would need
  its own product decision about how to combine differently-scoped
  budgets, which isn't part of this phase's brief.
- No "insights" of any kind (best/worst month, biggest year-over-year
  category swing, and similar) — that's explicitly Phase 24's job
  ("Spending insights, rule-based"), so this phase deliberately stays a
  plain data recap, same restraint Phase 22 showed by not building
  anything Phase 24 was meant to own.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; the new page is its
  own ~9.2 KB route-level chunk (`YearlySummaryPage`).
- `oxlint` — 0 errors; 21 warnings (one more than before, the same
  benign fast-refresh class every new lazy-loaded route in `router.tsx`
  already triggers — not a new kind of issue).
- `npm run test` — 801/801 passing (42 new: `periodComparison`'s full
  suite — percent-change edge cases, savings rate, trend-direction
  favorability, and both formatters' default vs. custom comparison-label
  behavior; `getYearRange`'s new test in `reportCalculations.test.ts`;
  `useYearNavigation`'s current-year default, prev/next navigation, the
  "never past current year" guard, and walking back multiple years;
  `YearSelector`'s label/click/disabled-state rendering; `yearlySummaryCalculations`'s
  year-over-year change math and `getYearlyMonthlyBreakdown`'s 12-point,
  correctly-summed, year-boundary-respecting output; and 14 new
  `YearlySummaryPage` integration tests covering loading/error states, all
  four stat cards and their year-over-year trend text, the "no prior year
  data" case, the monthly breakdown chart, the full category breakdown,
  budget performance (including its own empty state and "View all"
  navigation), the biggest-expense card, the transaction-count breakdown,
  and year navigation).
- A Playwright pass across all 13 routes (12 existing plus the new
  `/yearly-summary`) confirmed no regressions and no console errors on the
  new route either (desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here) — but this phase reads existing collections only
  (`transactions`, `budgets`, `expenseCategories`) with no new writes, so
  there is nothing new to deploy (`firestore.rules`/
  `firestore.indexes.json` are unchanged). Once deployed, the user should
  confirm: the new "Yearly Summary" sidebar item opens a page distinct
  from Dashboard, Reports, and Monthly Summary; the year picker walks
  backward/forward and can't go past the current year; the four stat
  cards show correct income/expenses/net savings/savings-rate figures for
  the selected year, each with a "+X% vs last year" (or "No data last
  year" for the earliest year with data) comparison colored the same
  favorable-vs-unfavorable way Monthly Summary's cards are (an expense
  *increase* still shows red); the month-by-month bar chart shows all 12
  months of the selected year with correct income/expense bars, including
  zeroed bars for any month with no activity; the category donut chart
  and list show every category with spending that year; every budget
  whose period touches the selected year appears with its correct
  spent/total and status color (including multiple separate rows for
  multiple monthly budgets, since there's no rollup), and picking a year
  with no such budget shows the empty state; the "View all" link goes to
  Budgets; the biggest single expense for the year shows its correct
  amount, merchant, and category; and the transaction-count chips match
  the number of each type actually recorded that year.

**Next phase when instructed ("Continue to Phase 24"):** Phase 24 —
Spending insights (rule-based).

## Phase 24 — Spending Insights, Rule-Based (COMPLETE)

**Delivered:**

- A genuinely new, dedicated page at `/insights` (new sidebar item,
  "Insights") — but unlike Phase 22/23's Monthly/Yearly Summary, this one
  is deliberately *not* a browsable-any-period view: insights are
  inherently about right now (this month's standing, a bill due in a few
  days), so there's no month/year picker, just a live read of the user's
  current data.
- New `utils/insightsEngine.ts`: seven independent, deterministic rules,
  each a pure function over data every earlier phase already computes —
  "rule-based" specifically meaning fixed thresholds over real numbers,
  not any statistical or ML-driven prediction (that stays out of scope;
  Phase 26, "Smart budget suggestions," is where anything like that would
  live). The rules: (1) a budget that's `over` or `nearLimit` this month
  (reuses Phase 22's `getBudgetsForMonth` and Phase 10's
  `getBudgetProgress` directly); (2) a category whose spend this month is
  ≥30% above its trailing 3-month average; (3) a savings-rate callout —
  spent more than earned (critical), a low-but-positive rate (warning), or
  a notably high one (positive) — mutually exclusive so only one fires per
  month; (4) total spending up or down ≥20% vs. last month (reuses Phase
  23's `periodComparison.ts`); (5) a single expense at least 3x the
  trailing average for its own category (not a fixed dollar amount, so it
  adapts to the user's own spending scale); (6) a debt payment due soon
  (reuses Phase 17's `getDebtProgress`/`getNextPaymentDueDate` entirely for
  the due-date math); (7) active subscriptions costing ≥15% of this
  month's income (reuses Phase 15's `getSubscriptionTotals`). Every
  insight carries a `severity` (`critical`/`warning`/`info`/`positive`),
  a title/description, and an optional action button linking to the
  relevant page; `generateInsights` runs all seven and returns them most
  severe first.
- Two new read-only hooks, `useDebts`/`useDebtPayments`, mirroring the
  existing `useBudgets`/`useTransactions` pattern exactly (`DebtsPage`
  still manages its own subscription directly since it also mutates;
  Insights just needed to *read* them, the same reason `useBudgets` itself
  existed before any page besides `BudgetsPage` needed budgets).
  `useRecurringTransactions` already existed and was reused as-is for the
  subscription-share rule.
- New `config/insightSeverityMeta.ts` mapping each severity to an MUI
  `Alert` color and a label, so the page renders each insight as a colored
  `Alert`/`AlertTitle` plus a summary row of severity-count chips at the
  top — same "small config file for display metadata" convention as
  `transactionTypeMeta.ts`.

**Known limitations, not fixed this phase:**

- Every threshold (30% category spike, 20% spending swing, 3x for a large
  transaction, 15% subscription share, the savings-rate bands) is a fixed
  constant, not personalized or user-configurable — a deliberate "rule-
  based" scope boundary; letting the user tune or dismiss individual
  insights is a natural follow-up but isn't part of this phase's brief.
- No persistence: insights are recomputed fresh every time the page loads
  and nothing is stored, so there's no "mark as read"/dismiss, no
  notification badge, and no history of past insights. Phase 35
  ("Notifications") is the more natural home for that kind of durable,
  cross-session alerting if the user wants it later.
- The category-spike and large-transaction rules both need at least one
  full trailing month of data in the same category to compare against, so
  a brand-new user (or a brand-new category) won't see either kind of
  insight until they have some history — same "needs enough data" caveat
  Phase 22/23's own month-over-month comparisons already carry ("No data
  last month"/"No data last year").
- The debt-due-soon rule only looks at each debt's recurring
  `paymentDueDay`, same as Phase 17's own `DebtsPage` card — it doesn't
  know about a payment the user already made this cycle beyond what
  `getDebtProgress` already accounts for via total payments recorded.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; the new page is its own
  ~8.6 KB route-level chunk (`InsightsPage`).
- `oxlint` — 0 errors; 22 warnings (one more than before, the same benign
  fast-refresh class every new lazy-loaded route in `router.tsx` already
  triggers).
- `npm run test` — 844/844 passing (43 new: `useDebts`/`useDebtPayments`'s
  subscribe/error/no-user cases; `insightsEngine`'s full suite — each of
  the seven rules' trigger and no-trigger cases, the debt-due severity
  escalation at the 3-day boundary, and `generateInsights`'s merge-and-sort
  behavior across multiple simultaneous conditions; and 6 new
  `InsightsPage` integration tests covering loading/error/empty states, an
  over-budget alert rendering with the right severity chip, insight
  ordering, and the action button's navigation).
- A Playwright pass across all 14 routes (13 existing plus the new
  `/insights`) confirmed no regressions and no console errors on the new
  route either (desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here) — but this phase reads existing collections only
  (`transactions`, `budgets`, `expenseCategories`, `debts`, `debtPayments`,
  `recurringTransactions`) with no new writes, so there is nothing new to
  deploy (`firestore.rules`/`firestore.indexes.json` are unchanged). Once
  deployed, the user should confirm: the new "Insights" sidebar item opens
  a page distinct from every other summary page; creating or editing a
  transaction so a budget goes over its limit produces a red "over budget"
  alert with a working "View budgets" button; a category spending much
  more than its recent average produces a matching alert; spending more
  than earned in a month produces a "You spent more than you earned"
  alert while a very high savings rate instead produces a green
  celebratory one; a debt with a `paymentDueDay` within the next few days
  produces a due-soon alert that turns more urgent inside 3 days; a large,
  atypical expense in a category with spending history produces an
  "unusually large expense" alert; heavy subscription costs relative to
  income produce a subscriptions alert; and with nothing to flag, the page
  shows the "You're all caught up" empty state instead of an empty list.

**Next phase when instructed ("Continue to Phase 25"):** Phase 25 —
Budget templates.

## Phase 25 — Budget Templates (COMPLETE)

**Delivered:**

- A new `budgetTemplates` Firestore collection and `BudgetTemplate` type —
  everything a `Budget` has except its own date range (`startDate`/
  `endDate`), since the whole point of a template is to reuse the same
  shape for whatever period comes *next*, not to repeat fixed dates.
  `services/budgetTemplateService.ts` follows the exact same
  `createUserScopedCollection` pattern as every other collection's service
  file, and reuses `budgetService.ts`'s own `mapBudgetItem` (now exported)
  rather than re-implementing the identical `items` parsing.
- New `utils/budgetTemplateCalculations.ts`: two small pure functions,
  `budgetTemplateToFormValues` (template + supplied dates → a ready
  `BudgetFormValues`) and `budgetToTemplateInput` (an existing budget +
  a name → a `NewBudgetTemplateInput`), each fully unit-tested. This is the
  same leverage point Phase 9's `BudgetFormDialog` already offered: its
  `initialValues` prop accepts an arbitrary pre-filled form state
  regardless of `mode`, so "use a template" needed no new dialog — just a
  `mode: 'create'` open with synthesized `initialValues`, defaulted to the
  current month via `budgetSchemas.ts`'s now-exported
  `startOfCurrentMonth`/`endOfCurrentMonth`.
- A "Templates" `Card` section on `BudgetsPage` (`BudgetTemplatesSection`),
  extending the existing page rather than adding a new route/nav item —
  the same "section on an existing page" pattern Phase 21 used for
  `TagsSection` on Settings, since a template is a save/reuse convenience
  layered onto budgets, not a page-worthy concept of its own. Each saved
  template shows its name and scope with "Use" (opens the budget dialog
  pre-filled) and delete icon actions; there's no "Add" button on the
  section itself, since a template can only be created by saving an
  *existing* budget's shape, never authored from scratch.
- `BudgetCard`'s "⋮" menu gained a third item, "Save as template" (behind
  a new optional `onSaveAsTemplate` prop so existing callers/tests are
  unaffected), opening a new single-field `SaveAsTemplateDialog` that
  collects just a template name — everything else comes from the source
  budget via `budgetToTemplateInput`.
- `firestore.rules`: a new `budgetTemplates` block mirroring `budgets`'
  field validation exactly, minus the date fields and with **no update
  rule** — templates are create/delete only this phase, so there's nothing
  a client should ever call `updateDoc` on for this collection.
  `firestore.indexes.json` got the matching `userId`+`createdAt` composite
  index (same shape as `debts`/`savingsGoals`' own index).

**Known limitations, not fixed this phase:**

- No "Edit template" flow — renaming or reshaping a saved template means
  deleting it and saving a new one from a current budget instead. Adding
  real editing later is straightforward (an `updateBudgetTemplate` plus a
  reused `BudgetFormDialog`-style form) but wasn't part of this phase's
  brief, which was about reuse, not template management.
- A template stores one fixed `scope`/`items` shape — there's no way to
  "start from a template, then tweak the categories before saving" other
  than editing the fields after the dialog opens pre-filled (which does
  work, since it's the same live form either way).
- Saving as a template doesn't warn about or dedupe similarly-named
  templates — a user can save several templates with the same name.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; `BudgetsPage`'s
  route-level chunk grew from ~11.8 KB to 15.51 KB with the new section and
  two new dialogs (no new route this phase, so the total route count is
  unchanged at 14).
- `oxlint` — 0 errors; 22 warnings, unchanged from Phase 24 (the same
  benign fast-refresh class, nothing new).
- `npm run test` — 863/863 passing (19 new: `budgetTemplateCalculations`'s
  both conversion functions in each direction; `useBudgetTemplates`'
  subscribe/error/no-user cases; `BudgetTemplatesSection`'s empty/error/
  populated-row states and its Use/Delete callbacks; `SaveAsTemplateDialog`'s
  default-name, submit, and empty-name-validation cases; two new
  `BudgetCard` cases for the conditional "Save as template" menu item; and
  four new `BudgetsPage` integration tests covering the empty templates
  state, opening the create dialog pre-filled from a template, saving an
  existing budget as a template, and deleting a template after
  confirmation).
- A Playwright pass across all 14 routes (no new route this phase)
  confirmed no regressions and no console errors (desktop + mobile
  viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once `firestore.rules`/`firestore.indexes.json` are
  deployed, the user should confirm: opening Budgets shows a new
  "Templates" card above the budget list; a budget's "⋮" menu now has a
  "Save as template" item that opens a naming dialog and, after saving,
  the template appears in the Templates card; clicking a template's "Use"
  icon opens "Add Budget" pre-filled with that template's amount/category
  limits/thresholds but today's month as the date range, ready to submit
  or adjust; clicking a template's delete icon (after confirming) removes
  it from the list without affecting any budget already created from it;
  and with no templates saved yet, the Templates card shows a "No
  templates yet" empty state instead of an empty list.

**Next phase when instructed ("Continue to Phase 26"):** Phase 26 —
Smart budget suggestions.

## Phase 26 — Smart Budget Suggestions (COMPLETE)

**Delivered:**

- New `utils/budgetSuggestionEngine.ts`: fixed trailing-3-month-average
  suggestions over the user's own transactions — deliberately still
  "rule-based" in exactly the sense Phase 24 scoped this phase to when it
  named "smart budget suggestions" as the natural home for anything beyond
  fixed-threshold insights: simple, deterministic arithmetic, never a
  statistical model or forecast. `getSuggestedOverallBudget` averages the
  trailing 3 calendar months' net expense (Rule 8, reusing
  `dashboardCalculations.ts`'s `getPeriodTotals` directly) and excludes the
  current, still-in-progress month so a suggestion isn't dragged down by a
  partial month; `getSuggestedCategoryBudgets` does the same per category
  (reusing `getExpenseByCategory`), returning one suggestion per category
  that has any trailing history, highest first. Both feed through a new
  `roundSuggestedAmount` helper that rounds a raw average UP (never to the
  nearest, since undershooting the average would all but guarantee going
  over) to a friendly increment scaled to its own magnitude (nearest 50
  under ₹1,000, up to nearest 1,000 at ₹100,000+). A category or the
  overall total with zero trailing spend is simply not suggested, rather
  than showing a suggested ₹0 budget — the same "needs some history"
  caveat Phase 24's rules already carry for a brand-new user or category.
- Two more pure functions, `suggestedOverallBudgetToFormValues` and
  `suggestedCategoryBudgetsToFormValues`, turning a suggestion into a
  ready `BudgetFormValues` for `BudgetFormDialog` in `mode: 'create'` —
  the exact same "the dialog already accepts arbitrary `initialValues`"
  leverage Phase 25's templates used, applied here to a computed
  suggestion instead of a saved template.
- A "Smart Suggestions" `Card` section on `BudgetsPage`
  (`SmartSuggestionsSection`), extending the existing page rather than a
  new route — same placement reasoning as Phase 25's `BudgetTemplatesSection`
  just above it. Shows the suggested overall monthly amount (with a
  "Create" button) and a per-category breakdown (each with its own
  "use this suggestion" icon button, plus a "Create from all" button that
  builds one category-scope budget from every listed suggestion at once).
  This section needs no subscription or new collection — it's a pure
  client-side computation over the transactions `BudgetsPage` already
  loads via `useTransactions` — so there is nothing new in
  `firestore.rules`/`firestore.indexes.json` this phase.
- `BudgetsPage`'s "use a pre-filled create dialog" state (introduced in
  Phase 25 for templates as `templateFormValues`) was renamed to the more
  general `prefilledFormValues` now that both "use template" and "use
  suggestion" feed the same mechanism — one create-dialog-prefill path
  serving two features, rather than two parallel ones.

**Known limitations, not fixed this phase:**

- The trailing window is a fixed 3 months and not user-adjustable — same
  fixed-constant approach Phase 24 already took for its own thresholds. A
  user with highly seasonal spending (e.g. one big annual expense) will
  get a suggestion that doesn't account for it.
- Suggestions don't exclude one-off/atypical transactions from the average
  — a single unusually large purchase in the trailing window pulls the
  suggested amount up along with it, same as any simple average would.
- No suggestion for a category (or the overall total) with less than a
  full trailing month of data — a brand-new user won't see this card
  populated at all until they have some spending history, mirroring
  Phase 24's own category-spike/large-transaction rules.
- Using a suggestion still requires reviewing and submitting the
  pre-filled dialog — there's no true one-click "accept" that skips the
  form entirely, since the dialog's own validation (dates, thresholds)
  still needs to run.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; `BudgetsPage`'s
  route-level chunk grew from 15.51 KB to 18.89 KB with the new section
  (no new route this phase, so the total route count is unchanged at 14).
- `oxlint` — 0 errors; 22 warnings, unchanged from Phase 25.
- `npm run test` — 882/882 passing (19 new: `budgetSuggestionEngine`'s
  full suite — `roundSuggestedAmount`'s magnitude-scaled boundaries,
  `getSuggestedOverallBudget`'s trailing-average/current-month-exclusion/
  refund-netting/income-exclusion behavior, `getSuggestedCategoryBudgets`'
  per-category aggregation and sorting, and both form-value adapters;
  `SmartSuggestionsSection`'s empty/overall-suggestion/per-category/
  create-from-all cases; and two new `BudgetsPage` integration tests for
  the empty suggestions state and opening the create dialog pre-filled
  from an overall suggestion).
- A Playwright pass across all 14 routes (no new route this phase)
  confirmed no regressions and no console errors (desktop + mobile
  viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here) — but this phase reads existing transaction data
  only, with no new collection or rule change to deploy. Once deployed,
  the user should confirm: with at least one full trailing month of
  expense history, Budgets shows a new "Smart Suggestions" card below
  Templates with a suggested overall monthly amount and a per-category
  breakdown; clicking a category's suggestion icon or the overall
  "Create" button opens "Add Budget" pre-filled with that suggested
  amount and today's month as the date range; clicking "Create from all"
  opens a category-scope budget pre-filled with every listed category
  suggestion at once; and for a brand-new account with no expense
  history yet, the card shows a "Not enough history yet" message instead
  of any suggestion.

**Next phase when instructed ("Continue to Phase 27"):** Phase 27 —
Net worth.

## Phase 27 — Net Worth (COMPLETE)

**Delivered:**

- A genuinely new, dedicated page at `/net-worth` (new sidebar item,
  "Net Worth") — unlike Phase 25/26's additions to the existing Budgets
  page, net worth spans accounts, debts, and two new collections, and
  stands on its own the same way Phase 22/23/24's summary/insights pages
  do.
- New `utils/netWorthCalculations.ts` — deliberately almost entirely
  reuse, not new math: `getAccountAssetsTotal` sums active non-credit-card
  accounts' `currentBalance` directly; `getAccountLiabilitiesTotal` sums
  active credit-card accounts' owed balances via Phase 18's
  `getCreditCardDebt` (no re-deriving the negative-balance sign
  convention); `getDebtsLiabilitiesTotal` sums every tracked `Debt`'s
  outstanding balance via Phase 17's `getDebtProgress`. Two small manual
  collections cover what nothing else tracks: `assets` (property, a
  vehicle, an outside investment, or anything else) and `liabilities`
  (back taxes, an informal loan) — both minimal `{type, label, value,
  asOf}` documents (see `types/asset.ts`/`types/liability.ts`) designed so
  a new type can be added later by extending an enum and its meta map,
  never a schema migration. `getNetWorthSummary` combines all five totals
  into `{totalAssets, totalLiabilities, netWorth}`; `getAssetBreakdown`/
  `getLiabilityBreakdown` produce a flat, highest-first list of named
  entries (an account's name, a debt's lender, a manual entry's label) for
  the page's donut charts.
- `services/assetService.ts`/`services/liabilityService.ts`: full CRUD +
  realtime subscribe via `createUserScopedCollection`, following
  `debtService.ts`'s exact structure.
- New dialogs `AssetFormDialog`/`LiabilityFormDialog` (type/label/value/
  as-of-date, following `GoalFormDialog`'s shape) and management cards
  `AssetsSection`/`LiabilitiesSection` (named list + add/edit/delete,
  following `BudgetTemplatesSection`'s shape) — `NetWorthPage` manages
  these two collections' subscriptions directly since it mutates them
  (same reasoning `BudgetsPage` gives for managing budgets itself),
  while accounts/debts/debt payments are read via the existing
  `useAccounts`/`useDebts`/`useDebtPayments` read-only hooks.
- `NetWorthBreakdownCard`: a shared donut-chart-plus-list component reused
  for both the assets and liabilities breakdown, built on the same
  `PieChart`/`Pie`/`Cell` shape `DashboardPage`'s "Spending by category"
  card already established, so both charts in the app look and behave
  consistently.
- Three `StatCard`s at the top of the page — Total Assets, Total
  Liabilities, and Net Worth (colored green when non-negative, red when
  negative).
- `firestore.rules`: new `assets`/`liabilities` blocks mirroring `budgets`'
  own field-validation shape (each `type` checked against its own fixed
  enum, `value` required positive). `firestore.indexes.json` got the
  matching `userId`+`createdAt` composite index for both collections.
- Closed the loop on two comments earlier phases left pointing at this
  one: `accountFormatting.ts`'s `sumBalancesByCurrency` doc comment (which
  named this phase as where multi-currency conversion might land) now
  notes that Phase 27 arrived at the same single-currency limitation
  rather than solving it; `navConfig.ts`'s "Net Worth is added in Phase
  27" note is resolved by the nav item actually existing now.

**Known limitations, not fixed this phase:**

- Single-currency, like every phase since Phase 8: all totals simply sum
  `currentBalance`/`value` fields regardless of an account's own
  `currency`, with no conversion rate applied. This was a deliberate
  decision to keep the same accepted limitation rather than attempt real
  FX conversion with no rate data source available.
- Point-in-time only: the page shows net worth *as of right now*, computed
  fresh on every load. There's no historical snapshot or trend line (a
  "net worth over time" chart), unlike Phase 22/23's month/year trend
  views — nothing here stores a dated snapshot to chart later.
- A manual asset/liability's `asOf` date is purely informational — nothing
  prompts the user to revisit and update stale values, so a value entered
  a year ago and never touched again just keeps counting at that number.
- No "Edit" is offered for the `type` an asset/liability's icon uses
  beyond what's in the fixed `ASSET_TYPES`/`LIABILITY_TYPES` enums — that's
  intentional per `types/asset.ts`'s "add a type later without a schema
  migration" design, but there's no in-app way to add a new type without
  a code change.
- `LIABILITY_TYPES` is deliberately narrow (`loan`/`tax`/`other`) since
  Phase 17's `Debt` already comprehensively covers structured, tracked
  loans — this collection is only meant for informal or one-off amounts a
  user doesn't want to set up as a full `Debt`.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; the new page is its own
  ~15.7 KB route-level chunk (`NetWorthPage`), and the total route count is
  now 15 (14 existing plus `/net-worth`).
- `oxlint` — 0 errors; 23 warnings (one more than Phase 26's 22 — the same
  benign fast-refresh class every new lazy-loaded route in `router.tsx`
  already triggers, nothing new).
- `npm run test` — 917/917 passing (35 new: `netWorthCalculations`'s full
  suite — each total function in isolation, `getNetWorthSummary`'s
  combination, and both breakdown functions' filtering/sorting;
  `AssetFormDialog`/`LiabilityFormDialog`'s create/edit/validation cases;
  `AssetsSection`/`LiabilitiesSection`'s empty/error/populated-row states
  and edit/delete/add callbacks; `NetWorthBreakdownCard`'s empty and
  populated states; and `NetWorthPage` integration tests covering the
  loading state, a combined assets/liabilities/net-worth computation
  across accounts, manual entries, and a debt, the empty state, and full
  add-asset/delete-asset/add-liability flows).
- A Playwright pass across all 15 routes (14 existing plus the new
  `/net-worth`) confirmed no regressions and no console errors on the new
  route either (desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once `firestore.rules`/`firestore.indexes.json`
  are deployed, the user should confirm: the new "Net Worth" sidebar item
  opens a page showing Total Assets/Total Liabilities/Net Worth stat cards
  that match a hand-calculated sum of the user's active account balances,
  outstanding debts, and any manually added assets/liabilities; a credit
  card carrying a balance shows up as a liability, not a negative asset;
  the two donut charts show a proportional breakdown with the largest
  items listed below each chart; "Add Asset"/"Add Liability" open a
  dialog that, on submit, adds a new row to the corresponding list and
  updates all three stat cards and both charts immediately; editing an
  entry updates its row and the totals; deleting one (after confirming)
  removes it and updates the totals; and with nothing tracked at all, both
  "Other Assets"/"Other Liabilities" cards show their own empty state
  while the stat cards and charts show zero/empty rather than erroring.

**Next phase when instructed ("Continue to Phase 28"):** Phase 28 —
Import data (CSV).

## Phase 28 — Import data (CSV) (COMPLETE)

**Delivered:**

- `src/utils/csvParser.ts` (+test) — a small dependency-free RFC-4180-ish
  CSV parser (`parseCsv(text): string[][]`), written by hand rather than
  adding a library: `package.json` had no CSV dependency, and this app's
  established convention is small, thoroughly unit-tested hand-rolled
  utils for a contained need (`formatCurrency.ts`, `slugify.ts`) over
  pulling in a package for one. Handles quoted fields (embedded commas and
  newlines), escaped `""` quotes, `\n`/`\r\n` line endings, and drops a
  single trailing blank row from a file's closing newline.
- `src/utils/csvTransactionImport.ts` (+test) — the column-mapping,
  validation, and row-parsing logic, all pure functions:
  - `ColumnMapping`/`IMPORT_COLUMNS` — the 7 mappable columns (date,
    amount, type, category, payee, description, notes); only date/amount
    are required.
  - `guessColumnMapping` — best-effort auto-mapping from common header
    names (e.g. "Merchant"/"Source"/"Payee" all map to `payee`), so a
    typical bank/export CSV is usually pre-mapped for the user to confirm.
  - `parseFlexibleDate` — ISO (`yyyy-MM-dd`) and US-style `MM/DD/YYYY`
    only; anything else is a per-row error rather than a silently wrong
    date. Rejects an out-of-range day/month `Date` would otherwise roll
    forward.
  - `parseImportAmount` — strips currency symbols/grouping commas, keeps
    the sign.
  - `inferTransactionType` — a mapped Type column wins by keyword match
    (`debit`/`expense`/etc. vs `credit`/`income`/etc.); otherwise falls
    back to the signed amount (negative = expense).
  - `matchExpenseCategory`/`matchIncomeCategory` — match a CSV category
    value against the user's real `ExpenseCategoryRecord`s (by slug or
    name) or the fixed `INCOME_CATEGORIES` enum (by key or label);
    unmatched or blank falls back to a real, always-present category
    (`'other'`/`'other_income'`, confirmed against
    `config/defaultExpenseCategories.ts`'s seeded "Other" category and
    `types/transaction.ts`'s `INCOME_CATEGORIES`) with a non-fatal
    warning, rather than failing the row outright.
  - `parseImportRow` — combines all of the above into one
    `ImportRowResult` per row: `valid` (carrying a ready-to-submit
    `NewIncomeInput`/`NewExpenseInput`, a preview shape, and any
    warnings — an unmatched category, or a merchant/description/notes
    field that had to be truncated to the same max lengths
    `expenseSchemas.ts`/`incomeSchemas.ts` already enforce) or `error`
    (an unparsable date or amount) with a human-readable message.
  - `summarizeImportRows` — total/valid/error/warning counts for the
    preview step's summary banner.
- `src/pages/importData/ImportPage.tsx` (+test) — a 3-step wizard at
  `/import`:
  1. **Select account & data** — pick which account the import writes
     into, then either choose a `.csv` file or paste CSV text directly.
  2. **Map columns** — a Select per mappable column, pre-filled by
     `guessColumnMapping`, letting the user confirm or correct which CSV
     column is which.
  3. **Preview & import** — a summary banner (ready/error/warning counts)
     followed by a `DataTable` (reused as-is, no new table component)
     showing every parsed row's status, inferred type, date, amount,
     category, payee, and any error/warning message; an "Import N
     transactions" button that sequentially calls
     `createIncomeTransaction`/`createExpenseTransaction` — the exact
     same functions `TransactionsPage`'s Add Income/Add Expense dialogs
     use — once per valid row, with a progress bar, then a completion
     summary (imported/failed counts) with "Import another file" and "Go
     to Transactions" actions. Invalid rows are simply skipped, never
     submitted.
- `src/routes/router.tsx` (edited) — added the lazy `/import` route.
  **Deliberately not added to `src/config/navConfig.ts`'s sidebar list** —
  unlike every prior page-level phase (22–27), this is a one-off workflow
  a user runs occasionally, not a page browsed repeatedly, so it's reached
  via the button below instead of a permanent 16th nav item.
- `src/pages/transactions/TransactionsPage.tsx` (edited) — added an
  "Import CSV" button next to "Add Transaction" in the page header
  (disabled, same as "Add Transaction", until at least one account
  exists), navigating to `/import`.
- No `firestore.rules`/`firestore.indexes.json` changes — imported rows
  are written through the existing, already-covered `transactions`
  collection path via the existing `transactionService.ts` functions, not
  a new collection or a bulk-write path.

**Known limitations, not fixed this phase:**

- Income and expense only — a CSV has no reliable signal for refund,
  adjustment, or transfer, so those three transaction types remain
  create-only from `TransactionsPage`'s own dialogs.
- No batched atomic bulk write: each row is its own
  `createIncomeTransaction`/`createExpenseTransaction` call (its own
  Firestore transaction, same as adding one by hand), not one all-or-
  nothing operation — if the import is interrupted partway (e.g. the
  browser tab closes), whatever rows already succeeded stay imported and
  the rest simply weren't attempted yet; there's no resume, only starting
  the file over (which would create duplicates for rows already
  imported).
- Date formats are limited to ISO (`yyyy-MM-dd`) and US-style
  `MM/DD/YYYY` — a file using `DD/MM/YYYY`, `D-Mon-YYYY`, or similar is
  not auto-detected and every row with such a date is reported as an
  error.
- No Type column, no keyword match on it, and the amount's sign is
  ambiguous (e.g. a CSV that always stores positive amounts): the row
  falls back to "positive = income, negative = expense", which is wrong
  for some export formats and has to be corrected by adding/mapping a
  Type column in the source file.
- Every imported expense row gets `paymentMethod: 'other'` and
  `subcategory: ''` — a CSV import has no natural source for either, and
  they can be edited afterward from the transaction's own Edit dialog on
  `TransactionsPage` like any manually entered one.
- No column for tags — imported transactions always get `tags: []`.
- A too-long merchant/description/notes value is silently truncated (with
  a warning shown in the preview) rather than rejected — matches the
  existing per-field max lengths in `expenseSchemas.ts`/`incomeSchemas.ts`
  so the write never fails validation, but means very long source data
  loses its tail.
- A failure that happens mid-import (e.g. the destination account was
  deleted between opening the wizard and clicking Import) is counted in
  the "failed" total on the completion screen but the specific failed
  row(s) aren't individually identified there — only the preview step's
  per-row table (before import) shows row-level detail.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; `ImportPage` is its own
  ~11.9 KB route-level chunk, and the total route count is now 16 (15
  existing plus `/import`, still absent from the sidebar by design).
- `oxlint` — 0 errors; same benign fast-refresh warning class as every
  prior lazy-loaded route addition, nothing new beyond one more line for
  `ImportPage`'s own lazy import.
- `npm run test` — 957/957 passing (40 new: `csvParser`'s full suite
  covering quoted fields, embedded commas/newlines, escaped quotes, CRLF
  endings, and blank/single-column edge cases; `csvTransactionImport`'s
  date/amount parsing, type inference, expense/income category matching
  and fallback, column auto-guessing, and `parseImportRow`/
  `summarizeImportRows` covering valid rows, unparsable dates/amounts,
  unmatched categories, and field truncation; `ImportPage` integration
  tests covering the no-accounts guard, pasting and parsing a CSV with a
  mix of valid/invalid rows, the preview summary counts, calling
  `createExpenseTransaction`/`createIncomeTransaction` with the right
  arguments on import, and navigating to Transactions afterward).
- A Playwright pass across all 16 routes (15 existing plus the new
  `/import`) confirmed no regressions and no console errors on the new
  route either (desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here). Once deployed, the user should confirm, with a
  real CSV export from a bank or another budgeting app: clicking "Import
  CSV" on the Transactions page opens the wizard; choosing an account and
  either uploading a `.csv` file or pasting its contents and clicking
  Continue moves to column mapping with sensible columns pre-guessed;
  adjusting a mapping and continuing shows a preview table where rows
  with a valid date/amount are marked "Ready" (with any category-fallback
  or truncation warning visible) and rows with a bad date/amount are
  marked "Error"; clicking "Import N transactions" shows a progress bar,
  then a completion screen with the correct imported/failed counts; the
  newly imported transactions appear on the Transactions page with the
  correct type, amount, category, and merchant/source, and the target
  account's balance reflects all of them exactly as if each had been
  added by hand one at a time; and importing a file with zero valid rows
  leaves the "Import" button disabled rather than allowing a no-op
  import.

**Next phase when instructed ("Continue to Phase 29"):** Phase 29 —
Export data (CSV/PDF).

## Phase 29 — Export data (CSV/PDF) (COMPLETE)

**Delivered:**

- `src/utils/csvParser.ts` (edited, +test) — added `toCsv(rows): string`,
  the write side of Phase 28's `parseCsv`, kept in the same file since
  they're the two directions of one round trip (the file's own test now
  includes a round-trip case: `parseCsv(toCsv(rows)) === rows`). Quotes a
  field only when it actually needs it (contains a comma, quote, or
  newline), escapes an embedded quote by doubling it per RFC 4180, and
  joins rows with `\r\n` to match Excel's own CSV export convention.
- `src/utils/transactionCsvExport.ts` (+test) — turns a list of
  `Transaction`s into CSV rows (`transactionsToCsv`), resolving every
  label the exact same way `TransactionsPage`'s own table already does
  (`getCategoryLabel`/`getSubcategoryLabel`, `getTagLabel`,
  `incomeCategoryMeta`, `TRANSACTION_TYPE_CHIP_META`) rather than
  re-deriving a second copy of that lookup logic. Unlike Phase 28's
  import, export isn't limited to income/expense — every transaction type
  (including refund, adjustment, transfer) gets its own row, since this is
  a backup/reporting export, not something designed to be re-imported.
- `src/utils/downloadFile.ts` (+test) — `downloadTextFile(filename,
  content, mimeType)`, a small object-URL-backed anchor-click helper.
  Nothing in the app needed to trigger a plain-text browser download
  before now; the PDF exports below don't use this — `jsPDF`'s own
  `.save()` already handles triggering its own download.
- `src/pages/transactions/TransactionsPage.tsx` (edited) — added an
  "Export CSV" button next to "Import CSV"/"Add Transaction" that exports
  exactly what's currently visible (after the date range and search/type/
  account/amount filters already on the page) to
  `transactions-<today>.csv`, disabled when there's nothing to export.
- `src/utils/summaryPdfExport.ts` (+test) — `buildSummaryPdf(input)` /
  `downloadSummaryPdf(input, filename)`, a shared PDF builder for both
  `MonthlySummaryPage` and `YearlySummaryPage` (their summaries are
  structurally identical — income/expenses/net/savings rate, spending by
  category, budget performance, biggest expense, transaction counts —
  only the period label and numbers differ). This is the one real
  dependency this phase adds (`jspdf`) rather than hand-rolling: unlike
  CSV, a PDF is a real binary/layout format not worth reimplementing, the
  same reasoning already applied to `recharts`/`date-fns` elsewhere in
  this app. Output is plain text (labels and numbers), with automatic
  page breaks once content overflows a page — no attempt to reproduce the
  on-screen donut/bar charts as PDF graphics.
- `src/pages/monthlySummary/MonthlySummaryPage.tsx` /
  `src/pages/yearlySummary/YearlySummaryPage.tsx` (edited) — each gained
  an "Export PDF" button in its header (only once data has loaded) that
  maps the page's already-computed totals/category spend/budget progress/
  biggest expense/transaction counts into `buildSummaryPdf`'s input shape
  and downloads it as `monthly-summary-<yyyy-MM>.pdf` /
  `yearly-summary-<year>.pdf`. This directly resolves the "No PDF/export
  of the summary" limitation both pages' own Phase 22/23 sections
  pointed at this phase.
- `package.json`/`package-lock.json` (edited) — added `jspdf` (^4.2.1).
- No `firestore.rules`/`firestore.indexes.json` changes — both exports are
  entirely client-side (reading data already subscribed to, writing a
  file to the browser's download), nothing new is read from or written to
  Firestore.

**Known limitations, not fixed this phase:**

- The CSV export is a backup/reporting format, not designed for
  round-tripping back through Phase 28's importer — it covers every
  transaction type (Phase 28's import only understands income/expense),
  and its Amount column is always the transaction's raw stored amount
  (never signed by type), so re-importing an exported file would need its
  own dedicated mapping, not just "Import CSV" pointed at an "Export CSV"
  file.
- The PDF export is plain text only — no charts, no colors, no logo/
  branding — a faithful list of the same numbers shown on screen, not a
  designed report document.
- `jspdf` pulls in its own optional `html()`-rendering dependencies
  (`html2canvas`, a DOMPurify build) even though this phase never calls
  that API — they land in their own lazy `summaryPdfExport` chunk (loaded
  only when a Monthly/Yearly Summary page is visited, not in the app's
  main bundle) but make that one chunk close to 400 KB. Acceptable for a
  page-specific, on-demand feature; worth revisiting if a lighter PDF
  library is ever needed for something else.
- Same single-currency limitation every phase since 8 has carried — both
  the CSV and PDF exports format every amount using the user's single
  `profile.currency`/each account's stored `currency` with no FX
  awareness, same as the on-screen figures they're exporting.
- The Transactions CSV export has no equivalent "download the previous
  export again" or scheduling — it's a one-off, on-demand snapshot of
  whatever's currently visible, like every other export in this phase.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean; no new routes (both
  exports are buttons on existing pages, not new pages), so the route
  count stays at 16. `jspdf` and its own dependencies load only in the
  lazy `summaryPdfExport` chunk shared by `MonthlySummaryPage`/
  `YearlySummaryPage`, not the main bundle.
- `oxlint` — 0 errors; same benign fast-refresh warning class as every
  prior phase, nothing new.
- `npm run test` — 982/982 passing (25 new: `csvParser`'s `toCsv` suite
  including a `parseCsv`/`toCsv` round-trip case; `transactionCsvExport`'s
  per-type row formatting (income/expense-with-subcategory/adjustment/
  transfer) and full-list CSV production; `downloadFile`'s object-URL/
  anchor-click/revoke sequence; `summaryPdfExport`'s document structure,
  empty-period messaging, null-savings-rate display, and automatic page
  breaks; and new `TransactionsPage`/`MonthlySummaryPage`/
  `YearlySummaryPage` integration tests covering the Export CSV button's
  disabled state and downloaded content, and the Export PDF buttons'
  filename and summary-data arguments).
- A Playwright pass across all 16 existing routes confirmed no
  regressions and no console errors from the new `jspdf` dependency
  loading (desktop + mobile viewports).
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here, and neither export touches Firestore anyway). Once
  deployed, the user should confirm: clicking "Export CSV" on the
  Transactions page downloads a `.csv` file that opens cleanly in a
  spreadsheet app and reflects exactly the currently-filtered transaction
  list (change the date range or search filters first and confirm the
  export follows); clicking "Export PDF" on the Monthly Summary or Yearly
  Summary page downloads a `.pdf` file that opens in a PDF viewer showing
  the same income/expense/net/savings-rate figures, category breakdown,
  budget performance, biggest expense, and transaction counts currently
  on screen for the selected month/year; and switching the selected
  month/year before exporting produces a PDF for that period, not the
  one originally loaded.

**Next phase when instructed ("Continue to Phase 30"):** Phase 30 —
Audit & data history.

## Phase 30 — Audit & data history (COMPLETE)

**Delivered:**

- `src/types/auditLog.ts` — `AuditAction` (`'create' | 'update' |
  'delete'`) and `AuditLogEntry` (userId, action, entity, entityId,
  previousValue, newValue, timestamp), matching the `auditLogs` schema
  named at the top of this doc since Phase 1. `entity`/`AuditEntity` is a
  plain `string`, not yet a closed union — this phase only ever writes
  `'transaction'`, but leaving it open lets a later phase start auditing
  another collection without a breaking schema change here.
- `src/utils/auditSnapshot.ts` (+test) — `serializeTransactionSnapshot`
  turns a raw transaction document into a JSON-safe snapshot for
  `previousValue`/`newValue`: drops `userId` (redundant — already on the
  audit entry itself) and `createdAt`/`updatedAt` (bookkeeping, not a
  business change worth showing in a diff), and converts a Firestore
  `Timestamp` `date` field to a plain ISO string.
- `src/services/auditLogService.ts` — `buildAuditLogWrite(...)` returns a
  doc ref plus its write payload (doesn't write anything itself);
  `subscribeToAuditLogs(userId, onData, onError)` is a realtime
  subscription to a user's full trail, newest first. Deliberately **not**
  built on `createUserScopedCollection` — it exposes no `update`/`remove`
  at all, so an audit trail can't be edited or deleted from the app layer,
  the same immutability the `firestore.rules` block below backs up
  server-side. Has no dedicated test file, matching this codebase's
  established convention (confirmed via `ls src/services/*.test.ts` —
  no service file has ever had one): every service is only exercised
  indirectly through page-level component tests with the module mocked,
  and the actual testable logic here lives in the `utils/` functions
  instead.
- `src/services/transactionService.ts` (edited) — every one of the five
  transaction write paths (`createIncomeTransaction`,
  `createExpenseTransaction`, `createRefundTransaction`,
  `createAdjustmentTransaction`, `createTransferTransaction`, the
  corresponding `updateXTransaction`s, and `deleteTransaction`) now also
  writes an audit log entry, via `tx.set(auditLog.ref, auditLog.data)`
  **inside the exact same `runTransaction`** that already writes the
  transaction document and updates the account balance(s) — so the audit
  entry can never drift out of sync with (or be silently missing
  relative to) the change it describes, the same "everything atomic"
  principle Rules 1/5/6 already established for balance updates. A create
  logs `previousValue: null`; a delete logs `newValue: null`; an update
  logs both sides via `serializeTransactionSnapshot`.
- `src/utils/auditLogFormatting.ts` (+test) — pure display helpers for the
  page below: `AUDIT_ACTION_META` (label + Chip color per action),
  `describeTransactionSnapshot(snapshot, ctx)` (one human-readable summary
  line for any transaction type, e.g. "Expense of ₹450.00 (Groceries)
  from Checking"), and `getSnapshotFieldDiffs(previous, next)` (a
  shallow, sorted, changed-fields-only comparison for an update's detail
  view). Both fall back gracefully — to the raw slug/id, or "an account"/
  "Uncategorized" — when an account or category a past entry referenced
  has since been renamed or deleted, the same accepted pattern already
  used by `getCategoryLabel`/`getTagLabel` elsewhere.
- `src/components/auditLog/AuditLogDetailsDialog.tsx` (+test) — read-only
  dialog opened from a "View details" action on a log row. A `create`/
  `delete` entry shows one summary line (only one side of the entry is
  ever populated); an `update` entry shows a field-by-field before/after
  table via `getSnapshotFieldDiffs`, with its own small `formatDiffValue`
  prettifying each side per field (currency for `amount`, a formatted
  date for `date`, an account/category name resolved from the live list
  for `accountId`/`fromAccountId`/`toAccountId`/`category`).
- `src/pages/auditLog/AuditLogPage.tsx` (+test) — the main list page at
  `/audit-log`, subscribing via `subscribeToAuditLogs` and using
  `useAccounts()`/`useExpenseCategories()` for lookup context, rendering
  a `DataTable` (When / Action chip / Transaction summary / View details)
  with the established loading/empty/error states. Has no create/edit
  dialog and no delete action anywhere on the page — unlike every other
  list page in this app, this one is intentionally read-only end to end.
- `src/routes/router.tsx` / `src/config/navConfig.ts` (edited) — added the
  lazy `/audit-log` route **with** a sidebar nav item ("Audit Log",
  `HistoryOutlinedIcon`), unlike Phase 28's `ImportPage`: an audit trail
  is a page a user comes back to browse ("what changed, and when"), not a
  one-off workflow reached from a button.
- `firestore.rules` (edited) — new `auditLogs/{auditLogId}` block: `allow
  read`/`allow create` are owner-scoped like every other collection
  (`create` additionally checks `action` is one of the three valid
  values and `entity`/`entityId` are non-empty strings), and there is
  **no `allow update` or `allow delete` line at all** — omitting a rule
  means Firestore denies that operation outright, the same create-only
  pattern already used for `goalContributions`/`debtPayments`/
  `budgetTemplates` — so an entry can't be edited or removed after the
  fact even by a client bypassing the app's own UI.
- `firestore.indexes.json` (edited) — added the composite index
  `auditLogs`: `userId ASC, timestamp DESC`, needed for
  `subscribeToAuditLogs`'s `where(userId) + orderBy(timestamp, desc)`
  query.

**Known limitations:**

- Scoped to `transaction` entities only. Transactions are the single
  highest-value thing to audit in a budget app — account balances derive
  from them, and edits/deletes already require the careful reverse/
  reapply balance logic Rule 6 established — but no other collection
  (accounts, budgets, goals, debts, categories, …) is audited yet. The
  schema (`AuditEntity` as a plain string, not a closed union) is
  designed so a future phase can start logging another collection without
  a breaking change here.
- No way to filter or search the audit log (by date range, action, or
  account) — it's every entry, newest first, relying on `DataTable`'s
  built-in client-side pagination. Fine at the volume one user's
  transaction history produces; would need real filtering if this grew
  much larger.
- No restore/undo action from an audit entry — this phase is a read-only
  history for reviewing what happened, not a way to reverse a past
  change. Reversing a transaction is already possible today by editing or
  re-creating it manually; wiring "restore from history" into the audit
  log itself was out of scope here.
- A field diff's before/after values are shown with reasonable per-field
  formatting (currency, date, resolved account/category name) but fall
  back to a raw stringified value for anything else (e.g. `tags`,
  `merchant`, `notes`) — readable, but not as polished as the dedicated
  formatting every other page gives its own fields.

**Verified:**

- `tsc -b --noEmit`, `npm run build` — both clean. Route count is now 17
  (`/audit-log` added, `AuditLogPage` in its own lazy chunk).
- `oxlint` — 0 errors; same benign fast-refresh warning class as every
  prior phase, nothing new.
- `npm run test` — 1017/1017 passing (35 new: `auditSnapshot`'s field-
  stripping and Timestamp/Date/unparsable `date` handling; 20 cases in
  `auditLogFormatting` covering every transaction type's summary line and
  its graceful fallbacks, plus `getSnapshotFieldDiffs`'s comparison/
  sorting/create-only/delete-only behavior; `AuditLogDetailsDialog`'s
  create/update/delete rendering and account/category resolution in a
  diff; and `AuditLogPage`'s row rendering, empty state, error-and-retry,
  and "View details" dialog wiring). The existing `TransactionsPage` and
  `transactionService`-adjacent test suites also confirm no regression
  from the new audit-log writes added inside every transaction mutation.
- A Playwright pass across all 17 routes (including the new `/audit-log`)
  confirmed no regressions and no console errors, desktop + mobile
  viewports.
- Not exercised end-to-end against live Firestore from this sandbox (no
  network access here, and the new `firestore.rules`/
  `firestore.indexes.json` changes only take effect once deployed). Once
  deployed, the user should confirm: creating a transaction produces a
  "Created" entry on the Audit Log page describing it correctly; editing
  that transaction (e.g. changing its amount or category) produces an
  "Updated" entry whose "View details" dialog shows exactly the fields
  that changed, old value on the left and new value on the right, with
  unchanged fields not listed; deleting a transaction produces a
  "Deleted" entry whose details show the transaction as it was right
  before removal; a transfer's create/update/delete entries correctly
  name both the from- and to-accounts; and that no edit/delete action of
  any kind appears anywhere on the Audit Log page itself.

**Next phase when instructed ("Continue to Phase 31"):** Phase 31 —
Security (Firestore rules).

## Phase 31 — Security (Firestore rules review) (COMPLETE)

A dedicated review-and-harden pass over `firestore.rules`/`storage.rules`
— no new UI, no new collection, no new npm dependency. Every phase from
14 onward left a note along the lines of "same accepted gap ... Phase 31
hardens this together" or "Phase 31 revisits this once transactions exist
to reconcile against" — this phase is that promised pass, plus a full
line-by-line audit of every collection's rules against exactly what its
service-layer code writes (every `src/services/*.ts` file was re-read in
full for this, not just its type definitions — a type can describe more
than a rule can see, and several of this phase's fixes came directly from
that gap).

**Delivered — `firestore.rules`:**

- **Field allowlisting.** Every collection's `create`/`update` rule now
  also checks `request.resource.data.keys().hasOnly([...])` against the
  exact field set that collection's service code ever writes (verified
  field-by-field against the actual write calls, not the TypeScript
  type). This doesn't require every listed field to be present — the
  individual type checks below it do that — it only blocks fields
  *outside* the list, closing off arbitrary field injection a
  hand-crafted request could otherwise smuggle into any document. Applied
  to all 16 collections.
- **Cross-collection ownership checks**, via four new shared helper
  functions (`ownsAccount`, `ownsGoal`, `ownsDebt`, `ownsTransaction`),
  each a `get()` lookup confirming a referenced document's `userId`
  matches the signed-in user:
  - `transactions`' `accountId` (non-transfer) / `fromAccountId`+
    `toAccountId` (transfer), and `recurringTransactions`' `accountId` —
    the exact gap the Phase 14/16/17 sections called "left for Phase 31."
    `transactionService.ts` already re-implements this same check in
    application code before every write (see e.g. `createTransaction`'s
    "You do not have access to the selected account" error) — these
    rules make it true defense-in-depth: a hand-crafted request bypassing
    the app's own JS entirely can no longer reference another user's
    account, goal, debt, or transaction by guessing/enumerating its id.
  - `goalContributions`' `goalId` and `debtPayments`' `debtId` — the two
    gaps explicitly named in the Phase 16/17 "Known limitations" sections.
  - `receipts`' optional `transactionId`, when set to a non-null value.
  - On `update`, a reference is only re-verified when that specific field
    is actually *changing* — not on every unrelated edit. This matters in
    practice: `recurringTransactions` has three different partial-update
    call sites (`updateRecurringTransaction`, `setRecurringTransactionActive`,
    and `generateDueOccurrences`'s bookkeeping advance) and none of them
    touch `accountId` — an unconditional check would have newly blocked
    all three the moment a user deleted an account a recurring rule still
    pointed at, which the app itself doesn't currently prevent. The
    "only-if-changed" form avoids that regression while still closing the
    real gap: *reassigning* a reference (or creating a new document with
    one) is always verified.
- **Two pre-existing gaps fixed outright:** `accounts.type`/`.status`
  were never checked against their fixed enums, unlike every other
  enum-shaped field elsewhere in this file (`ACCOUNT_TYPES`/
  `ACCOUNT_STATUSES` — a plain oversight from Phase 3, since corrected).
  `auditLogs.timestamp` must now equal `request.time`, so a hand-crafted
  request can no longer backdate or forge an audit entry — every real
  write already uses `serverTimestamp()` (`auditLogService.ts`'s
  `buildAuditLogWrite`), so this changes nothing for the app itself.
- **Reasonable max-length caps** (`.size() <= N`) on every freeform text
  field (`name`/`label`/`lender`/`merchant`/`source`/`note`/`notes`/
  `description`/`reason`, plus array-length caps on `tags`/`items`/
  `subcategories`) — generous enough (200–5000 chars depending on field)
  that no real input could ever approach them (cross-checked against
  every relevant Zod schema's own `.max()` — every one is well inside
  these caps, see "Verified" below), but enough to stop a single document
  from being inflated into a storage-abuse vector.
- Updated the file's header comment into a proper index of what this
  phase added and, just as importantly, what it deliberately did **not**
  attempt and why (see "Known limitations" below) — matching every other
  phase's practice of documenting an accepted gap rather than silently
  leaving it unexplained.

**Delivered — `storage.rules`:** no functional change (`receipts/{userId}/
{fileName}`'s per-user path isolation, 5 MB size cap, and owner-only read/
create/delete were already solid) — added a documentation note recording
the one real gap reviewed and accepted: `request.resource.contentType` is
a client-declared MIME type Storage rules can't verify against a file's
actual bytes without a Cloud Functions content-inspection step this
project doesn't have.

**Known limitations, not fixed this phase (by design):**

- `accounts.currentBalance` still isn't validated against the transaction
  that's supposedly reconciling it. Doing that in rules would mean
  re-deriving `getBalanceEffect`'s entire sign logic here and
  cross-referencing whichever transaction triggered the update —
  duplicating business logic `transactionService.ts` already centralizes,
  and this project has no Cloud Functions layer to do it authoritatively
  server-side instead. The exposure is self-harm only: every rule in this
  file still independently confines a write to its own owner, so a user
  can only ever corrupt their *own* balance this way, never another
  user's — a data-integrity limitation, not a cross-tenant security hole.
- A budget/budget template's `items` array (`{categoryId, amount}`
  entries) and a transaction's `tags` array aren't checked to reference
  categories/tags that actually exist. The Firestore rules language has
  no per-element `get()` over a variable-length array, so validating that
  would mean a bounded, hand-unrolled check per index that doesn't scale
  to "however many categories a user has." A stale reference here only
  ever produces a graceful client-side fallback (the raw slug shown
  instead of a resolved name — `getCategoryLabel`/`getTagLabel`), never a
  security exposure.
- Storage's `contentType` check (see above) remains client-declared and
  unverifiable server-side without inspecting file bytes.
- No rate limiting of any kind (Firestore rules have no concept of
  request frequency) — out of scope for a rules-only pass, and not a
  concern for a single-user personal budget app.

**Verified:**

- `tsc -b --noEmit`, `npm run build`, `npm run test` (1017/1017), `oxlint`
  (0 errors, same benign fast-refresh warnings) — all clean, as expected:
  this phase touched no `.ts`/`.tsx` file, only `firestore.rules`/
  `storage.rules`, which none of these tools parse.
- A Playwright pass across all 17 routes confirmed no regressions
  (desktop + mobile) — but note this only exercises routing/rendering
  against the local dev build, not live Firestore reads/writes.
- **Rules syntax**: brace/paren/bracket balance verified with a small
  script (941 lines, 0 mismatches), and every `hasOnly([...])` field list
  was extracted and re-diffed against the exact field set derived from
  reading every relevant `src/services/*.ts` write call, twice.
- **Rules logic, traced by hand against every real write path** (the only
  verification method available in this sandbox — see below): every
  `create`/`update` call in `transactionService.ts` (all 5 types, both
  directions), `recurringTransactionService.ts` (all 3 distinct
  partial-update call sites), `accountService.ts`, `receiptService.ts`,
  and every other service file touched by this phase's new checks was
  walked field-by-field against its collection's new rule text to confirm
  it still passes. Every relevant Zod form schema's own length limits
  (e.g. account name ≤ 80, notes ≤ 500, tags ≤ 10 items of ≤ 30 chars)
  were also cross-checked against this phase's new caps to confirm no
  real form submission could ever be rejected by them.
- **Not, and cannot be, exercised against a live or emulated Firestore
  from this sandbox** — `firebase setup:emulators:firestore` was
  attempted and failed: the emulator JAR downloads from
  `storage.googleapis.com`, which this sandbox's network egress does not
  allow (confirmed by direct attempt, not assumed). This is a materially
  bigger gap than the "not tested against live Firestore" note every
  earlier phase already carries, because a rules mistake doesn't just
  mean an untested feature — it can silently reject a write the app
  itself thinks succeeded (or, if a check is too permissive, silently
  fail to block something it should). **Before relying on this deploy,
  the user should**: deploy with `firebase deploy --only
  firestore:rules,storage`, then manually exercise every feature that
  writes to Firestore at least once — creating and editing an account,
  every transaction type (income/expense/refund/adjustment/transfer),
  editing and deleting a transaction, a recurring rule (create, pause/
  resume, edit), a budget, a savings goal and a contribution, a debt and
  a payment, a receipt (with and without a linked transaction), a
  category/subcategory, a tag, a budget template, an asset/liability, and
  checking the Audit Log page populates — watching specifically for a
  browser-console "Missing or insufficient permissions" error, which
  would mean one of this phase's new checks is stricter than intended
  somewhere this trace missed. If anything breaks, the previous rules are
  reproducible by reverting this phase's `firestore.rules` changes (kept
  as `firestore.rules.pre-phase31.bak` alongside the delta zip) and
  redeploying — there is no data migration involved in this phase, only a
  permissions layer, so a rollback is always safe and instant.

**Next phase when instructed ("Continue to Phase 33"):** Phase 32
(Database design) is an ongoing, already-continuously-updated concern
rather than a discrete build step (see the ongoing note in the phase-plan
table above) — the next phase with actual new work is Phase 33
(Financial calculation engine centralization).

## Phase 33 — Financial calculation engine centralization (COMPLETE)

Rule 9 ("every financial calculation should use centralized business
logic") was already mostly true by this point — every calculations module
surveyed this phase turned out to follow the project's own established
"extract when a second consumer needs the same math" convention (the
`periodComparison.ts` extraction from Phase 22/23, `reportCalculations.ts`
reusing `dashboardCalculations.ts`'s `getPeriodTotals`, `netWorthCalculations.ts`
reusing `getCreditCardDebt`/`getDebtProgress`, `insightsEngine.ts` reusing
nearly everything from earlier phases rather than re-deriving it). This
phase's actual scope, after reading all 14 calculation utility files in
full, was two genuinely duplicated primitives that had each been
independently reimplemented across multiple files instead of shared:

1. **The date-range filter.** `date.slice(0, 10) >= start && <= end` (or the
   equivalent inline check) existed as four separate copies: a private
   `inRange` in `dashboardCalculations.ts`, a private `inRange` in
   `monthlySummaryCalculations.ts`, an inlined version in
   `budgetCalculations.ts`'s `getBudgetPeriodTransactions`, and another
   inlined version in `insightsEngine.ts`'s `getLargeTransactionInsight`
   (trailing-average calculation for the "unusually large expense" rule).
2. **"Expense adds, refund subtracts" (Rule 8).** `budgetCalculations.ts`
   (`getCategoryActualSpent`/`getBudgetActualSpent`, via a private
   `isSpendTransaction` type guard) and `dashboardCalculations.ts`
   (`getPeriodTotals`'s expense total, `getExpenseByCategory`'s per-category
   breakdown) each independently hand-rolled the same "expense: +amount,
   refund: -amount" arithmetic rather than sharing one definition.

**Delivered:**

- New `src/utils/transactionAggregation.ts` — the single shared module both
  duplicated patterns now live in:
  - `isDateInRange(date, start, end)` — the one definition of "is this date
    string in this inclusive range," replacing all four copies above.
  - `filterByDateRange(records, start, end)` — filters any date-stamped
    array using `isDateInRange`; used wherever a caller was filtering a
    whole transaction list rather than checking one date inline.
  - `isSpendTransaction(transaction)` — promoted from `budgetCalculations.ts`'s
    private helper (previously not shared) to a properly exported, shared
    type guard (`type is 'expense' | 'refund'`, narrowed with `category`).
  - `getSpendAmount(transaction)` — the one definition of Rule 8's "expense
    adds, refund subtracts, everything else contributes 0," which
    `budgetCalculations.ts` and `dashboardCalculations.ts` both now sum
    over instead of each re-deriving the same sign logic.
- `budgetCalculations.ts` — `getBudgetPeriodTransactions` now delegates to
  `filterByDateRange`; `getCategoryActualSpent` and `getBudgetActualSpent`
  now sum `getSpendAmount` instead of an inline expense/refund ternary; the
  file's own private `isSpendTransaction` was removed in favor of the
  shared one.
- `dashboardCalculations.ts` — its private `inRange` was removed in favor of
  `filterByDateRange`/`isDateInRange`; `getPeriodTotals`'s expense total and
  `getExpenseByCategory`'s per-category delta both now use `getSpendAmount`/
  `isSpendTransaction` instead of their own expense/refund branching.
- `monthlySummaryCalculations.ts` — its private `inRange` was removed;
  `getBiggestExpense` and `getTransactionCountByType` now call the shared
  `isDateInRange` directly (each still does its own type-specific filtering
  alongside the date check, so `filterByDateRange` didn't fit as cleanly
  here as a plain `isDateInRange` call).
- `insightsEngine.ts` — `getLargeTransactionInsight`'s inlined trailing-
  average date check now calls `isDateInRange` instead of its own
  `date.slice(0, 10)` comparison.
- New `src/utils/transactionAggregation.test.ts` — dedicated unit tests for
  all four new shared functions (range boundaries inclusive on both ends,
  full-ISO-timestamp slicing, every transaction type's spend classification
  and signed amount), independent of the existing suites for the four
  consumer files (which continue to exercise the same logic indirectly
  through `getBudgetActualSpent`/`getPeriodTotals`/etc. and were left
  completely unchanged, since this was a pure refactor).

**What this phase deliberately did NOT touch:** `goalCalculations.ts`/
`debtCalculations.ts`/`creditCardCalculations.ts` already share their
common shape (a `*Progress` combiner function, a status-threshold function,
a totals-so-far sum) only by convention/mirrored design, not by importing
a shared base — surveyed and judged intentional rather than duplicated,
since a goal's target-date urgency and a credit card's utilization
threshold are genuinely different business rules that happen to follow the
same *shape*, not the same *calculation*; forcing them into one generic
"progress engine" would trade three small, independently readable files
for one abstract one with branching for each domain's different rules, a
net loss of clarity for no behavior change. `recurringCalculations.ts`,
`subscriptionCalculations.ts`, `budgetTemplateCalculations.ts`, and
`budgetSuggestionEngine.ts` were also fully read and found to already
reuse shared primitives correctly (or to have no cross-file duplication to
extract) — no changes were needed in them.

**Verified:**

- This is a pure, behavior-preserving refactor: every existing test in
  `budgetCalculations.test.ts`, `dashboardCalculations.test.ts`,
  `monthlySummaryCalculations.test.ts`, and `insightsEngine.test.ts` was
  left completely unmodified and still passes unchanged, which is itself
  the strongest evidence no computed output changed.
- `npx tsc -b --noEmit` — clean.
- `npx vitest run` — **1028/1028 passing** (the prior 1017, plus 11 new
  tests in `transactionAggregation.test.ts` covering every function and
  every transaction type).
- `npx oxlint` — 0 errors (same benign pre-existing fast-refresh warnings
  as every prior phase).
- `npm run build` — clean; the `dashboardCalculations`/
  `monthlySummaryCalculations` chunks rebuilt with their new shared
  import as expected.
- A Playwright pass across all 17 app routes plus the 3 auth routes (20
  total) confirmed no console errors or regressions. Note this sandbox
  cannot authenticate against the real Firebase project, so — as every
  earlier phase's smoke pass has also noted — this exercises routing/
  redirect-to-login behavior, not the changed calculation code running
  against real data live in the browser; the real behavioral guarantee for
  this phase comes from the unit tests above, which exercise every touched
  function directly and exhaustively rather than through a UI a sandbox
  can't log into.

**Next phase when instructed ("Continue to Phase 34"):** Phase 34 (Money
precision).

## Phase 34 — Money precision (minor units) (COMPLETE)

**User confirmation before implementation:** the Firebase project
(`budget-tracker-c4508`) is still empty / just test data the user doesn't
care about — so this phase is a pure code-level unit change with **no data
migration script written or run** against the production database. Every
new "amount" ever written from this point on is minor units; any leftover
major-unit test documents in the live project are the user's to discard,
not something this phase needed to migrate.

**The architecture decision.** The obvious-looking approach — convert to
minor units only at the Firestore read/write boundary, keep everything else
(the calculation layer, in-memory state) in decimal major units — was
rejected: the actual floating-point-drift risk this phase exists to fix
lives in JS runtime arithmetic (summing many `transaction.amount` values
with `+`), which only integers eliminate. Converting back to a decimal
float immediately after reading from Firestore would reintroduce the exact
bug being fixed. So the real design is domain-wide: every monetary field on
every domain type (`Transaction.amount`, `Account.currentBalance`/
`openingBalance`/`creditLimit`, `Budget.overallAmount`/`items[].amount`,
`BudgetTemplate`'s same two fields, `SavingsGoal.targetAmount`,
`GoalContribution.amount`, `Debt.originalAmount`/`minimumPayment`,
`DebtPayment.amount`, `Asset.value`, `Liability.value`,
`RecurringTransaction.amount`, `Receipt.amount`) is an integer number of
minor units (paise) the moment it comes out of a service function, all the
way through every calculations module — not just in Firestore.

**The two-edge conversion-boundary pattern** this phase established and
applied everywhere:

1. Every service-layer `NewXInput`/`UpdatableXFields` type (and
   `NewRecurringTransactionInput`) is, by contract, always the decimal
   major-unit value "as the form produces" — even when built by internal
   code rather than a real form (`recurringTransactionService.ts`'s
   `generateDueOccurrences`, `budgetTemplateCalculations.ts`'s
   `budgetToTemplateInput`). Each service file converts to minor units
   exactly once, at its own single choke point, right before the Firestore
   write: `toXFields`/`toFirestoreFields` in most services, or
   `createTransaction`/`updateTransactionCore`/`createTransferTransaction`/
   `updateTransferTransaction` in `transactionService.ts`.
2. Whenever a page builds `initialValues`/`defaultValues` to populate a
   form for editing an already-minor-unit domain object, `toMajorUnits` is
   applied per monetary field, converting back the other way.

**Delivered:**

- New `src/utils/money.ts` — the whole phase's conversion module:
  `toMinorUnits(majorAmount)` (`Math.round(majorAmount * 100)`, guarding
  against float-multiplication artifacts like `19.1 * 100 ===
  1909.9999999999998`) and `toMajorUnits(minorAmount)`
  (`minorAmount / 100`); both return `0` for non-finite input. Covered by
  new `money.test.ts` (rounding edge cases, negatives, zero, non-finite
  input, and a full round-trip test).
- **Service-layer choke points**, one per file: `transactionService.ts`
  (`createTransaction`, `updateTransactionCore`, `createTransferTransaction`,
  `updateTransferTransaction`), `recurringTransactionService.ts`
  (`toFirestoreFields`, plus a critical double-conversion fix in
  `generateDueOccurrences` — see below), `accountService.ts`
  (`createAccount`, and `updateAccount` rewritten to only set the
  `creditLimit` key when the caller actually supplied one, avoiding an
  explicit-`undefined` value that Firestore's `updateDoc` rejects),
  `budgetService.ts` (a new exported `toMinorUnitItems` helper reused by
  `budgetTemplateService.ts`), `goalService.ts`, `debtService.ts`
  (`interestRate` deliberately left alone — it's a percentage, not money),
  `assetService.ts`, `liabilityService.ts`, `receiptService.ts`.
- **The display layer, fixed once for the whole app:** `formatCurrency.ts`
  now takes an integer minor-unit amount and divides by 100 internally.
  Since `CurrencyText.tsx` (used at essentially every currency display
  site across the app — cards, tables, stat cards, dialogs) is a thin
  wrapper that forwards straight to `formatCurrency`, this one change fixed
  every display call site with zero changes needed at any of them.
- **Page-level edit-mode fixes** (the reverse boundary, `toMajorUnits`
  applied to `initialValues`): `TransactionsPage` (all 5 transaction-type
  dialogs), `AccountsPage`, `BudgetsPage`, `GoalsPage`, `DebtsPage`,
  `NetWorthPage` (both asset and liability dialogs), `ReceiptsPage`,
  `RecurringTransactionsPage`, `SubscriptionsPage`.
- **Human-facing decimal edges beyond forms**, surveyed and fixed:
  - `TransactionFilters.tsx`'s Min/Max amount inputs — converts the typed
    decimal to minor units for comparison against `transaction.amount` in
    `transactionSearch.ts`, while displaying the field's own `value` back
    through `toMajorUnits` so the box doesn't show the user's own "500"
    redisplayed as "50000" after typing.
  - `transactionCsvExport.ts` — the exported "Amount" column now runs
    through `toMajorUnits` so a downloaded CSV shows decimal rupees, not
    raw paise integers.
  - `ImportPage.tsx`'s preview table — `csvTransactionImport.ts`'s
    `ImportRowPreview.amount` is major-unit (parsed straight from the CSV,
    matching `NewExpenseInput`/`NewIncomeInput`'s contract), so it needs
    `toMinorUnits` before `formatCurrency` (which now expects minor units)
    displays it — without this the preview showed each amount divided by
    100.
  - `summaryPdfExport.ts` and `csvTransactionImport.ts` itself needed no
    changes: the PDF export's amounts already flow through
    `formatCurrency`, and CSV import's `NewExpenseInput`/`NewIncomeInput`
    outputs were already major-unit by contract.
- **Magnitude-sensitive thresholds rescaled ×100** so real-world rounding/
  comparison behavior is unchanged now that the numbers feeding them are
  100× larger: `budgetSuggestionEngine.ts`'s `roundSuggestedAmount`
  rounding increments (`<₹1,000→₹50` etc., now `<100,000 paise→5,000
  paise`), and `insightsEngine.ts`'s `CATEGORY_SPIKE_MIN_AVERAGE` (`1` →
  `100`, i.e. still ₹1). `firestore.rules`' numeric bounds were checked and
  need no change — every amount-like field there only asserts `is number`
  and a `> 0`/`>= 0` lower bound, no upper-magnitude cap that ×100 scaling
  could violate.
- **Two bugs self-caught and fixed before they could ship:**
  1. `recurringTransactionService.ts`'s `generateDueOccurrences` reads an
     already-stored (already-minor-unit) `rule.amount` and calls
     `createIncomeTransaction`/`createExpenseTransaction`, which now apply
     `toMinorUnits` internally expecting major-unit input — without an
     explicit `toMajorUnits(rule.amount)` when building those calls'
     input objects, every generated occurrence would have been scaled by
     100 twice (a ₹1,000 rule generating a ₹100,000 transaction).
  2. `accountService.ts`'s `updateAccount`, converting a possibly-`undefined`
     `creditLimit` and spreading it into the update payload, could send
     Firestore an explicit `creditLimit: undefined` — which `updateDoc`
     throws on. Fixed by only setting the key when the caller's
     `Partial<UpdatableAccountFields>` actually includes it.
- Every fixture across the test suite that represents a *stored* domain
  amount (`Transaction.amount`, `Budget.overallAmount`, `Account.
  currentBalance`, etc.) was rescaled ×100 to keep representing the same
  real-world rupee amounts under the new minor-unit convention — form-input
  and typed-value fixtures (what a user types, what a mocked
  create/update call receives) were left as decimal major units, since
  those never changed meaning. Calculation-layer test suites
  (`debtCalculations.test.ts`, `dashboardCalculations.test.ts`, etc.) were
  deliberately left untouched: they only exercise relative/ratio math
  (percentages, sums, comparisons between same-unit fixtures), which is
  correct regardless of whether the underlying numbers represent major or
  minor units — confirmed by every one of those suites still passing
  unmodified.

**Known limitations / design notes:**

- No live/emulated write against real Firestore was possible from this
  sandbox (network egress still blocks `storage.googleapis.com`, same
  limitation noted since Phase 31) — verification relies on `tsc`/
  `vitest`/`oxlint`/`build`/Playwright-against-unauthenticated-routes only.
  Browser-testable scenarios for the Phase 42 checklist: creating an
  expense/income/refund/adjustment/transfer with a decimal amount (e.g.
  ₹19.99) round-trips through edit without drifting; a budget or recurring
  rule created from a Smart Suggestion lands on the exact suggested amount;
  editing an account's opening balance or a credit card's limit shows the
  correct pre-filled decimal value; the Min/Max amount transaction filter
  doesn't redisplay a typed value scaled up; an exported transaction CSV
  shows decimal rupee amounts, not raw integers; the CSV import preview
  table shows the correct decimal amount for each row before importing;
  summing many small transactions (e.g. 50+ expenses of odd decimal
  amounts) never drifts by even a paisa versus the sum a calculator gives.
- Since the project's Firestore data was confirmed empty/disposable, no
  migration script exists for converting a real deployment's existing
  major-unit documents to minor units — if this app is ever pointed at a
  Firebase project with real pre-Phase-34 data, that data would need a
  one-time `amount *= 100` migration across every collection listed in the
  data model before this code could read it correctly. Out of scope here
  per the user's own explicit choice.

**Verified:**

- `npx tsc -b --noEmit` — clean (one real type error caught and fixed along
  the way: `AccountsPage.tsx`'s `creditLimit` ternary checked `=== null`
  only, not `== null`, so `toMajorUnits` could receive `undefined` for an
  account with no `creditLimit` field at all — fixed to `== null`).
- `npx vitest run` — **1040/1040 passing** (up from 1028; the net dozen new
  tests come from `money.test.ts`, with the rest of the delta being
  existing suites' fixtures rescaled rather than tests added or removed).
  15 tests failed on the first pass after implementation — all from
  fixtures representing stored amounts that hadn't yet been rescaled to
  minor units (`AccountCard`, `ReceiptCard`, `SmartSuggestionsSection`,
  `BudgetsPage`, `RecurringTransactionsPage`, `SubscriptionsPage`,
  `TransactionsPage`) — every one fixed by rescaling the fixture ×100 (and,
  for `SmartSuggestionsSection`, the expected suggested-amount output
  ×100 too) rather than by changing any production code.
- `npx oxlint` — 0 errors (same 25 pre-existing benign fast-refresh
  warnings as every prior phase).
- `npm run build` — clean.
- A Playwright pass across all 21 routes (17 app routes + 4 auth-adjacent
  routes) confirmed zero console/page errors. As with every prior phase,
  this sandbox can't authenticate against the real Firebase project, so
  this exercises routing/import correctness rather than the changed
  money-handling code running against live data in a browser — the real
  behavioral guarantee for this phase comes from the unit tests above,
  which exercise every touched conversion boundary directly.

**Next phase when instructed ("Continue to Phase 35"):** Phase 35
(Notifications).

## Phase 35 — Notifications (COMPLETE)

**Scope, and why it isn't a new rule engine.** Phase 24's Insights page
already computes every "worth telling the user about" condition this app
knows how to detect (over-budget, a category spending spike, an unusually
large expense, a debt due soon, spending swings, a savings-rate change, a
high subscription share) — but explicitly deferred the durable,
cross-session half of that ("mark as read"/dismiss, a notification badge,
a history of past insights) to this phase, calling it out by name in its
own known-limitations section. So Phase 35 adds no new detection logic at
all: it persists Phase 24's `Insight[]` output as real Firestore documents
the user can read, dismiss, and revisit, and wires up the bell icon in the
top bar that has sat there as a non-functional placeholder since Phase 1.

**Delivered:**

- `types/notification.ts` — `AppNotification` (`sourceKey`, `severity`,
  `title`, `message`, `actionLabel`/`actionPath`, `read`, `createdAt`/
  `updatedAt`) and `NewNotificationInput`. `sourceKey` mirrors the
  originating `Insight.id` exactly (e.g. `budget-over-${budget.id}`);
  `severity` is declared independently as the same four-value union
  `InsightSeverity` already is, rather than importing it, keeping the
  existing "types don't reach into utils" boundary intact while staying
  structurally assignable with no casting.
- New `utils/notificationSync.ts` — `selectNewNotifications(insights,
  existingNotifications)`, a pure function (no Firestore I/O, same
  "calculations in utils, I/O in services" split every other feature keeps)
  that decides which freshly-computed insights should become new
  notifications this session. **The dedup rule:** an insight only becomes a
  new notification if there is no existing notification for that
  `sourceKey` that is still unread. Deduping on "any notification ever
  created for this sourceKey," the more obvious-looking rule, was rejected
  because several rules are naturally month-to-month (a category spend
  spike compares this month to a trailing 3-month average) — that rule
  would let a condition notify exactly once, permanently, the very first
  time it's ever seen, and never again even after a fresh, unrelated
  recurrence next month. Deduping on "any *unread* notification for that
  sourceKey" instead means an alert sitting unacknowledged in the bell
  isn't duplicated on every reload, but once the user marks it read
  (acknowledging it), a new occurrence of the same underlying condition is
  worth surfacing again — this also self-heals a condition that resolves
  and later recurs (a budget dips under its warning threshold, then goes
  back over) with no extra "is this insight still active" bookkeeping
  needed anywhere.
- `services/notificationService.ts` — the standard `createUserScopedCollection`
  wrapper (`createNotification`, `markNotificationRead`,
  `markAllNotificationsRead` — takes the already-loaded list rather than
  re-fetching, the same "caller supplies what it already has" convention
  `generateDueOccurrences` uses — `deleteNotification`,
  `subscribeToNotifications`, ordered newest-first).
- `hooks/useNotifications.ts` — realtime read-only subscription, the same
  shape as `useDebts`/`useBudgets`.
- `hooks/useNotificationSync.ts` — the actual generator, mirroring
  `useRecurringTransactionGenerator`'s exact "runs once per app session,
  guarded by a ref, regardless of which page loads first" shape. Reads the
  same six sources `InsightsPage` itself reads (transactions, budgets,
  categories, debts, debt payments, recurring transactions) plus the
  user's existing notifications, runs `generateInsights` once everything
  has loaded, and creates whatever `selectNewNotifications` returns.
  Writes are best-effort and swallowed on failure — a failed notification
  write shouldn't surface as an error toast on every single page load; the
  worst case is just that an alert doesn't appear until the next session
  re-checks.
- `components/layout/NotificationBell.tsx` — replaces the static,
  non-functional bell icon `Topbar.tsx` has had since Phase 1. Shows an
  unread-count badge (MUI `Badge`), and a `Popover` (opened from the bell)
  listing the 20 most recent notifications, each with a severity-colored
  unread dot (reusing `INSIGHT_SEVERITY_META`'s existing color mapping — no
  new severity-to-color table needed), a relative timestamp
  (`formatRelative`, already existed, unused until now), a per-item delete
  button, and a click-to-open action (marks read, then navigates to
  `actionPath` if the notification has one — same `actionLabel`/
  `actionPath` convention `InsightsPage`'s own action buttons already use).
  A header "Mark all as read" button (disabled when nothing is unread) and
  a footer "View all insights" link back to the always-fresh, unlimited
  `InsightsPage` round out the popover.
- `AppLayout.tsx` now also mounts `useNotificationSync()` alongside the
  existing `useRecurringTransactionGenerator()` call, so notifications sync
  regardless of which page the user lands on first — exactly the same
  reasoning already justified for the recurring-transaction check.
- `firestore.rules` — a new `notifications/{notificationId}` block. `create`
  validates the full field set (`sourceKey`/`title` non-empty and
  length-capped, `severity` against the same four-value enum, `message`
  length-capped, `actionLabel`/`actionPath` each null-or-string, and
  `read` must start `false`). `update` only allows toggling `read` —
  every other field must stay equal to what's already stored, the same
  "immutable except one explicitly-allowed field" pattern
  `expenseCategories`'s `slug`/`isDefault` and `receipts`'s file metadata
  already use elsewhere in this file — reflecting that a notification is a
  snapshot of "this was true as of this time," never a live-updating tile.
  `delete` is owner-only, for the popover's per-item dismiss action.
- New tests: `utils/notificationSync.test.ts` (the dedup rule's every
  branch — no existing notification, an unread one blocking a duplicate, a
  read one no longer blocking, `undefined` action fields normalized to
  `null`, mixed insight lists, empty inputs), `hooks/useNotifications.test.ts`
  (mirrors `useDebts.test.ts` exactly), `hooks/useNotificationSync.test.ts`
  (mirrors `useRecurringTransactionGenerator.test.ts`'s "loads once, guarded
  by a ref, no-op without a user or with any data source still loading"
  shape), and `components/layout/NotificationBell.test.tsx` (badge count,
  empty state, listing, mark-read-and-navigate, read items not re-marked,
  delete without navigating, mark-all-as-read and its disabled state,
  the Insights link, and an error path).

**Known limitations, not fixed this phase:**

- No dedicated `/notifications` page or route — the popover shows only the
  20 most recent notifications with no pagination, and "View all insights"
  is the only way to see the full, always-current picture beyond that. A
  full history page (with filtering, bulk delete, older-than-N-days
  pruning) is a natural follow-up but wasn't part of this phase's brief,
  which was specifically "the durable/badge/history layer over Phase 24,"
  not a new inbox feature in its own right.
- No automatic pruning of old, read notifications — a long-lived account
  will accumulate them indefinitely. Accepted the same way earlier phases
  have documented similar scope boundaries (e.g. Phase 30's audit log has
  no retention policy either) rather than half-solving it with an arbitrary
  cutoff.
- `useNotificationSync` mounts six realtime Firestore subscriptions
  (transactions, budgets, categories, debts, debt payments, recurring
  transactions) at the `AppLayout` level so the sync can run regardless of
  landing page — the exact same six `InsightsPage` itself already
  subscribes to when visited, just now also active app-wide for the whole
  session rather than only while that one page is open. This is a real,
  deliberate increase in the number of always-on listeners; accepted
  because it's what "notifications that don't require a visit to the
  Insights page" actually requires, the same trade-off Phase 14 already
  made for `useRecurringTransactionGenerator`'s own subscription.
- A notification's title/message is a snapshot taken at creation time and
  never refreshed — if a still-unread "Food spending is up 32%" alert's
  real number changes to 40% before the user reads it, the stored
  notification keeps showing 32% until a fresh, unread-eligible one is
  created later. Treated as a feature (a notification is a record of what
  was true when it fired) rather than a bug, per `notificationSync.ts`'s
  own doc comment, but noted here since it's a real, visible behavior.

**Verified:**

- `npx tsc -b --noEmit` — clean.
- `npx vitest run` — **1066/1066 passing** (up from 1040; 26 new tests
  across `notificationSync.test.ts`, `useNotifications.test.ts`,
  `useNotificationSync.test.ts`, and `NotificationBell.test.tsx`, all
  passing on the first run with no fixture rework needed elsewhere — this
  phase added a new collection rather than touching any existing one).
- `npx oxlint` — 0 errors (identical 25 pre-existing benign fast-refresh
  warnings as every prior phase — nothing new).
- `npm run build` — clean.
- A Playwright pass across all 21 routes confirmed zero console/page
  errors, including that the new `NotificationBell`/`useNotificationSync`
  mount cleanly on every route via `AppLayout`. As with every prior phase,
  this sandbox can't authenticate against the real Firebase project, so
  this exercises import/mount correctness rather than an authenticated
  user actually receiving and reading a real notification — the real
  behavioral guarantee for the sync/dedup logic comes from the unit tests
  above. Browser-testable scenarios for the Phase 42 checklist: an
  existing over-budget/near-limit/debt-due condition produces a bell badge
  after signing in; clicking a notification marks it read (badge count
  drops) and navigates to the right page; "Mark all as read" clears the
  badge; deleting a notification removes it without navigating; reloading
  the app does not duplicate an already-unread notification for the same
  condition; marking one read and then reloading while the condition still
  holds produces a fresh one.

**Next phase when instructed ("Continue to Phase 36"):** Phase 36
(Settings).

## Phase 36 — Settings (COMPLETE)

**Scope, and why it's a small, closed set of fields rather than a
catch-all "preferences bag":** `SettingsPage` (Phase 2) already covers
identity/locale (name, email, currency, country, timezone — `ProfileSection`)
and managed lists (`CategoriesSection`/`TagsSection`, Phases 6/21). What was
missing, and what this phase's own "More settings — Coming soon" card on
that page had named since Phase 2 ("Budget defaults, notification
preferences and appearance options"), was app-wide behavioral preferences.
Rather than build a generic preferences store, every field added below
exists because a concrete, already-built feature reads it — the same
"don't add a field nothing consumes yet" discipline every prior phase's
data model has followed:

- `defaultBudgetPeriod`/`defaultBudgetWarningThreshold`/
  `defaultBudgetOverThreshold` pre-fill `BudgetsPage`'s "Add Budget" dialog
  (Phase 9) instead of the same hard-coded `monthly`/`80`/`100` every user
  got before.
- `defaultAccountId` pre-fills the account field when adding a new Income
  or Expense (Phase 7) — the single most repetitive field for someone who
  mostly transacts from one account.
- `defaultCategoryId` pre-fills the category field when adding a new
  Expense only — Income has its own fixed category enum (salary, etc.,
  Phase 4), not a Phase 6 expense-category slug, so a "default expense
  category" isn't meaningful there. Refund/Adjustment/Transfer creation and
  the future Quick Add (Phase 38) are deliberately left unwired to this
  setting for now — see "Known limitations" below.
- `notifyOnSeverity` (one on/off switch per `InsightSeverity` — critical/
  warning/info/positive) gates which of Phase 24's insight severities
  Phase 35's `useNotificationSync` turns into a persisted, badge-counted
  notification. Turning a severity off doesn't change what `InsightsPage`
  itself shows — only whether it also becomes a notification.

**Deliberately not built:** `theme` (light/dark) — even though the
original data-model sketch at the top of this file listed it under
`settings` — stays exactly as it's been since Phase 1: a per-device
`localStorage` preference (`ColorModeContext`), not synced to Firestore.
Syncing it would mean reconciling two sources of truth (the existing local
toggle vs. a synced value) for a preference that arguably *should* differ
per device anyway (a laptop used outdoors vs. a phone used in bed) —
judged not worth the complexity for a preference that already works well,
rather than a gap to fill later.

**Delivered:**

- `types/userSettings.ts` — the `UserSettings` interface and
  `DEFAULT_USER_SETTINGS` (monthly/80/100, no default account or category,
  every severity on). One document per user at `settings/{uid}` — the doc
  ID *is* the UID, unlike every list-shaped collection elsewhere in this
  app that scopes many auto-ID documents by a `userId` field.
- `utils/userSettingsDefaults.ts` — `mergeUserSettingsDefaults(uid, data,
  updatedAt)`, the pure "fill in `DEFAULT_USER_SETTINGS` for anything
  missing or malformed" logic, split out of the service the same way Phase
  35 split `notificationSync.ts`'s dedup rule out of `notificationService.
  ts` — so the one function with actual branching logic is unit-testable
  without mocking Firestore, and the service stays a thin wrapper. Covers
  both a user who has never saved settings (the document doesn't exist)
  and one whose existing document predates a field a later phase added.
- `services/userSettingsService.ts` — `subscribeToUserSettings` (realtime,
  via `onSnapshot` on the single doc, always delivering a fully-populated
  `UserSettings` through the merge function above) and `saveUserSettings`
  (always writes the *complete* field set via `setDoc(..., {merge:
  true})` — never a partial patch, since the document may not exist yet
  for a first-time save, and the Settings form always submits the whole
  entity anyway, the same convention every other form in this app follows).
- `context/SettingsContext.tsx` (`SettingsProvider`/`useSettings`) —
  mounted once inside `AuthProvider` in `App.tsx` (needs the signed-in
  user's UID), so every consumer shares one subscription: the Settings
  page's own form, `useNotificationSync`'s severity filter, `BudgetsPage`'s
  and `TransactionsPage`'s "Add" defaults. Always exposes a fully-populated
  `settings` object — defaults before the first Firestore read resolves
  and for a user who has never saved anything — so no consumer needs to
  null-check it. The "signed out" case is derived directly during render
  rather than written via a `setState` in an effect (an early version did
  that and oxlint's `set-state-in-effect` rule correctly flagged it as an
  avoidable extra render — the fix moved to computing `settings`/`loading`
  from `user` at render time, only using local state for what the
  Firestore subscription itself delivers).
- `schemas/settingsSchemas.ts` — `settingsFormSchema` (Zod), plus
  `toSettingsFormValues`/`fromSettingsFormValues` converting between the
  domain `UserSettings` (nullable `defaultAccountId`/`defaultCategoryId`)
  and the form's shape (`''` meaning "no default," matching `FormSelect`'s
  existing `field.value ?? ''` convention).
- `components/settings/PreferencesSection.tsx` — the new card on
  `SettingsPage`, right after `ProfileSection`: budget defaults (period,
  warning/over threshold selects/fields), transaction defaults (default
  account, default expense category — each with a "No default" option),
  and four notification toggles (`FormSwitch`, one per severity, each
  labeled with the same severity-colored dot `INSIGHT_SEVERITY_META`
  already provides). One form, submitted as a whole, "Save preferences"
  button disabled until a field changes — the same shape `ProfileSection`
  already established on this page. Replaces the "More settings — Coming
  soon" placeholder card Phase 2 left behind.
- `FormSelect.tsx` gained an opt-in `displayEmpty` prop (default off, so
  every existing consumer is unaffected) — MUI's `Select` otherwise renders
  nothing for an empty-string value, which broke rendering "No default" as
  visible text for the two nullable selects above.
- `FormSwitch.tsx`'s `label` prop widened from `string` to `ReactNode` (a
  pure type change, safe since `string` is already a `ReactNode`) so a
  toggle's label can carry the severity-colored dot alongside its text.
- `useNotificationSync.ts` now reads `useSettings()` and filters
  `generateInsights()`'s output by `notifyOnSeverity[insight.severity]`
  *before* handing insights to `selectNewNotifications` — an insight whose
  severity is off never creates a notification, but still shows on
  `InsightsPage` exactly as before (that page calls `generateInsights`
  directly and doesn't consult these settings). The sync also now waits
  for `SettingsContext`'s own `loading` to clear before running, the same
  way it already waits for every other data source — syncing against the
  momentary "all severities on" default before the user's real saved
  choice has loaded back from Firestore would be a real, if narrow, race.
- `BudgetsPage.tsx`'s `openCreateDialog` now seeds `prefilledFormValues`
  from `settings` (period/warning/over) merged over `defaultBudgetFormValues`
  — reusing the exact `initialValues` seam "Use template" (Phase 25) and
  "Create from suggestion" (Phase 26) already proved out, rather than
  adding a second way to pre-fill the dialog.
- `TransactionsPage.tsx`'s "Add Income"/"Add Expense" now seed
  `accountId` (both) and `category` (Expense only) from `settings` when
  creating a new transaction — `editingTransaction`'s own values still
  always win.
- `firestore.rules` — a new `settings/{userId}` block, matched by path
  segment against `request.auth.uid` exactly like `users/{userId}` (not a
  `userId`-field check like every list-shaped collection's rules). `create`
  and `update` share one validation predicate (there's no "immutable once
  set" field here — every preference can always be changed) and both
  require the complete field set, matching `saveUserSettings` always
  writing the whole document. `delete` is disallowed — there's never a
  reason to delete this document, only to save it back to defaults.
- New tests: `utils/userSettingsDefaults.test.ts` (every branch of the
  default-merge logic — missing document, fully-populated document,
  invalid/missing period, invalid/missing thresholds, non-string account/
  category IDs, partially- and fully-missing `notifyOnSeverity`),
  `components/settings/PreferencesSection.test.tsx` (populates from loaded
  settings, "No default" rendering, Save button disabled until dirty,
  saves and shows a success toast, toggles a severity off and saves it as
  `false`, surfaces an error toast on failure), plus new cases added to
  `useNotificationSync.test.ts` (waits for settings to finish loading;
  filters out a turned-off severity before selecting new notifications),
  `BudgetsPage.test.tsx` (pre-fills period/thresholds from settings), and
  `TransactionsPage.test.tsx` (pre-fills account/category for a new
  Expense; pre-fills account for a new Income).

**Known limitations, not fixed this phase:**

- `defaultAccountId` isn't wired into Refund, Adjustment, or Transfer
  creation — only Income and Expense. Transfer inherently needs *two*
  accounts (from/to), so "the default account" is ambiguous there by
  construction; Refund/Adjustment are lower-traffic entry points than
  Income/Expense. The seam (`initialValues` on each dialog) is already
  proven by this phase and by Phases 25/26, so extending it later is
  straightforward if it turns out to matter.
- `defaultAccountId`/`defaultCategoryId` aren't consumed by Phase 38's
  future "Quick add transaction" yet, since that phase doesn't exist yet —
  it's the most natural next consumer of these two settings and should
  reach for them rather than re-deriving its own defaults.
- If a user signs out and a *different* user signs in within the same
  browser session (no full page reload), `SettingsContext`'s `loading`
  flag can briefly read `false` with the previous user's settings still
  showing until the new user's document loads and overwrites it — a
  correctness gap only in this same-session multi-account-switch case
  (the far more common sign-out-only and single-account cases are
  unaffected). Accepted rather than reintroducing the `set-state-in-effect`
  pattern the render-time-derivation fix above deliberately removed, for
  an edge case this app's own login flow doesn't really invite (there's no
  "switch account" affordance — just log out, then log back in as someone
  else).
- No admin/bulk way to reset preferences to defaults from the UI — a user
  can manually re-pick "No default" and re-toggle every severity back on,
  but there's no single "Reset to defaults" button. Small enough that it
  wasn't worth a dedicated control this phase.

**Verified:**

- `npx tsc -b --noEmit` — clean.
- `npx vitest run` — **1084/1084 passing** (up from 1066; 18 new tests in
  `userSettingsDefaults.test.ts` and `PreferencesSection.test.tsx`, plus
  new cases added to `useNotificationSync.test.ts`, `BudgetsPage.test.tsx`,
  and `TransactionsPage.test.tsx` — all passing, with no fixture rework
  needed elsewhere since this phase only added new consumers of a new,
  additive settings object).
- `npx oxlint` — 0 errors, same 25 pre-existing benign fast-refresh
  warnings as every prior phase. (One new `set-state-in-effect` warning
  surfaced mid-phase in an early `SettingsContext.tsx` draft and was
  designed away rather than suppressed — see "Delivered," above.)
- `npm run build` — clean, no size warnings.
- A Playwright pass across all 21 routes (plus the 404 catch-all) confirmed
  zero console/page errors, including that `SettingsProvider` and the new
  `useSettings()` call inside `useNotificationSync` mount cleanly
  everywhere via `AppLayout`. As with every prior phase, this sandbox can't
  authenticate against the real Firebase project, so this exercises
  import/mount correctness rather than an authenticated user actually
  saving and seeing their own preferences take effect — that behavioral
  guarantee comes from the unit tests above. Browser-testable scenarios
  for the Phase 42 checklist: saving a default budget period/thresholds on
  the Settings page and then opening "Add Budget" shows them already
  filled in; saving a default account (and, for Expense, a default
  category) and then opening "Add Income"/"Add Expense" shows it already
  selected; turning off a notification severity (e.g. "Positive") and
  triggering that condition again produces no new bell notification, while
  the same condition still appears on the Insights page; turning a
  severity back on and reloading while the condition still holds produces
  a fresh notification; switching the dark/light toggle is unaffected by
  anything on this page (confirming `theme` really did stay local-only).

**Next phase when instructed ("Continue to Phase 38"):** Phase 38 (Quick
add transaction) — Phase 37 (Mobile experience) is an ongoing,
already-underway concern rather than a discrete not-started phase (see the
phase plan table), same as Phases 40/41.

## Phase 38 — Quick Add Transaction (COMPLETE)

**Scope:** a global, always-available way to log a transaction without
navigating to `TransactionsPage` first and opening its "Add" menu — a
floating "+" button, visible on every authenticated page, that opens a
small dialog for the two most common transaction types (Income and
Expense). Refund/Adjustment/Transfer stay behind `TransactionsPage`'s full
"Add" menu — Transfer inherently needs two accounts (ambiguous for a
one-tap flow by construction), and Refund/Adjustment are meaningfully
lower-traffic. Investigated first whether this needed a new, simpler
dialog component or new service functions: it doesn't — `expenseFormSchema`/
`incomeFormSchema` (Phase 7) already treat everything except amount/date/
account/category as optional or defaultable, and `createExpenseTransaction`/
`createIncomeTransaction` already accept exactly that shape. So this phase
is a new, minimal *entry point and form*, not a new *data path* — a
quick-added transaction is written identically to a fully detailed one and
shows up the same everywhere (reports, budgets, the ledger) with no new
Firestore rules required.

**Delivered:**

- `schemas/quickAddSchemas.ts` — `quickAddFormSchema`, a small unified
  schema (`type: 'expense'|'income'`, amount, date, accountId, category,
  description) covering both transaction types with one form rather than
  two, since only `category`'s valid *values* differ by type (an expense-
  category slug vs. a fixed `IncomeCategory`) — the dialog's type-dependent
  `FormSelect` enforces that, the same division of responsibility
  `expenseFormSchema`'s own `category` field comment already documents for
  the full dialogs.
- `components/transactions/QuickAddTransactionDialog.tsx` — a compact
  (`maxWidth="xs"`) dialog: a two-button `ToggleButtonGroup` for type,
  then Amount/Date, Account, Category (expense categories or the fixed
  income category list, swapped based on the toggle), and an optional
  Description. Switching type resets `category` to the right default for
  the new type right in the toggle's `onChange` handler — the same
  "handle it where the causing event fires" pattern `ExpenseFormDialog`'s
  own category/subcategory reset already established, not a `useEffect`
  watching the field. On submit, builds a complete `ExpenseFormValues` or
  `IncomeFormValues` (blank/default values for every field this form
  doesn't show — `subcategory`/`merchant`: `''`, `paymentMethod`: `'cash'`,
  `notes`: `''`, `tags`: `[]` for Expense; `source`: `''`,
  `isRecurring`: `false`, `tags`: `[]` for Income) and calls
  `onSubmitExpense`/`onSubmitIncome` — the exact same values a full
  Add-Expense/Add-Income submission with those fields left blank would
  produce.
- `components/layout/QuickAddFab.tsx` — the global entry point. Fully
  self-contained (subscribes to `useAccounts`, `useExpenseCategories`,
  `useSettings`, `useAuth`, `useNotification` itself), the same
  "drop it in and it works" shape `NotificationBell` already established
  for `Topbar`. Renders a `Fab` fixed at the bottom-right of the viewport
  (`position: fixed`, `zIndex: theme.zIndex.speedDial`) and the dialog
  above; pre-fills the account (and, for Expense, the category) from
  Phase 36's `settings.defaultAccountId`/`defaultCategoryId` — the exact
  consumer Phase 36's own "Known limitations" section named as the natural
  next user of those two settings. Renders nothing when signed out
  (defensive — `AppLayout` is already auth-gated, so this shouldn't
  matter in practice). A successful save shows the usual "Expense added"/
  "Income added" toast and closes the dialog; a failed one surfaces inline
  inside the dialog itself (its own `formError` state, via the propagated
  exception) exactly like every other transaction dialog — this component
  itself has no error-handling code at all, on purpose.
- `AppLayout.tsx` now also mounts `<QuickAddFab />` alongside the existing
  `<Outlet />` — fixed-position, so where it sits in the tree doesn't
  affect layout, mounted next to the other "available on every
  authenticated page" concerns (`useRecurringTransactionGenerator`,
  `useNotificationSync`). Deliberately shows on `TransactionsPage` too
  rather than hiding there — a persistent, always-in-the-same-corner entry
  point is the whole point, and one more button on a page that already has
  its own "Add" menu is a small, acceptable overlap rather than a bug.
- New tests: `schemas/quickAddSchemas.ts` needed none of its own (thin,
  exercised through the dialog); `components/transactions/
  QuickAddTransactionDialog.test.tsx` (defaults to Expense; pre-fills
  account/category from given defaults; falls back to the first expense
  category with no default set; submits a full expense with blanked
  optional fields; switching to Income swaps the category list and
  submits an income entry; switching back to Expense restores the expense
  default category; a missing account is rejected; a failed submit shows
  its error inline; Cancel closes without submitting) and
  `components/layout/QuickAddFab.test.tsx` (renders nothing signed out;
  renders the "+" button; opens the dialog; creates an expense end-to-end
  with a success toast and dialog close; creates an income entry via the
  toggle).

**Known limitations, not fixed this phase:**

- No keyboard shortcut (e.g. "press N") to open Quick Add — confirmed via
  research that this app has no keyboard-shortcut infrastructure at all
  today, and building one just for this one entry point would be
  disproportionate to the phase. A mouse/touch-only affordance is
  consistent with how every other "Add" action in this app already works.
- The Fab shows on every authenticated page uniformly, including
  `TransactionsPage` (see "Delivered," above) — a deliberate choice, not
  an oversight, but noted here since it is a visible, debatable design
  decision rather than a hidden implementation detail.
- Quick Add's Income flow has no equivalent to Expense's
  `defaultCategoryId` settings pre-fill — Income quick-adds always start
  from `'salary'` (the schema's own default), the same starting point a
  full "Add Income" gets today. Adding a dedicated
  `defaultIncomeCategoryId` setting was judged not worth a new Phase 36
  field for a category the user can already change in two clicks.
- No dashboard-specific "Quick Add" card/shortcut in addition to the
  global Fab — investigated during scoping (see the phase's own research)
  and judged redundant once the Fab exists on every page, dashboard
  included.

**Verified:**

- `npx tsc -b --noEmit` — clean.
- `npx vitest run` — **1098/1098 passing** (up from 1084; 14 new tests
  across `QuickAddTransactionDialog.test.tsx` and `QuickAddFab.test.tsx`,
  all passing with no fixture rework needed elsewhere since this phase
  reuses existing services/schemas rather than changing them).
- `npx oxlint` — 0 errors, same 25 pre-existing benign fast-refresh
  warnings as every prior phase — nothing new.
- `npm run build` — clean, no size warnings.
- A Playwright pass across all 21 routes (plus the 404 catch-all)
  confirmed zero console/page errors, including that `QuickAddFab` mounts
  cleanly via `AppLayout` everywhere. As with every prior phase, this
  sandbox can't authenticate against the real Firebase project, so this
  exercises import/mount correctness rather than an authenticated user
  actually quick-adding a real transaction — that behavioral guarantee
  comes from the unit tests above. Browser-testable scenarios for the
  Phase 42 checklist: the "+" button is visible and in the same spot on
  every page (Dashboard, Budgets, Reports, Transactions, …); clicking it
  opens the Quick Add dialog defaulted to Expense with the saved default
  account/category (Phase 36) already selected, if set; switching to
  Income swaps the category list to the fixed income categories and
  defaults to Salary; submitting an expense/income closes the dialog,
  shows a success toast, and the new transaction immediately appears in
  the ledger, dashboard totals, and any budget it counts against; leaving
  Account blank and submitting shows "Select an account" without closing
  the dialog; Cancel discards the form without creating anything.

## Phase 39 — Dashboard Customization (COMPLETE)

**Scope.** `DashboardPage` (Phase 11) had three sections below its always-on
stat row (total balance/income/expenses/net) — Active budgets, Recent
transactions, Spending by category — hardcoded into a fixed two-column
layout with no way to hide or reorder any of them. This phase makes those
three sections **widgets**: independently showable/hideable and reorderable,
persisted per user, exactly matching what "customization" concretely means
for a dashboard of fixed content (no third-party widgets, no per-widget
settings — just which of the app's own sections show, and in what order).
The stat row itself stays fixed: it's the "at a glance" summary the page
exists for, not a section a user would want to remove, and keeping it
uncustomizable keeps the scope tight to what a single phase should cover.

**Delivered:**

- New `config/dashboardWidgets.ts` — the closed set of `DashboardWidgetId`s
  (`'activeBudgets' | 'recentTransactions' | 'categorySpending'`) plus their
  display metadata (label/description), the same "one place defines the
  set" shape `TRANSACTION_TYPE_CHIP_META`/`INSIGHT_SEVERITY_META` already
  use.
- `UserSettings` (Phase 36) gains one new field: `dashboardWidgets:
  DashboardWidgetId[]` — the *visible* widgets, in display order. A widget's
  absence from the array means hidden, so order and visibility live in one
  field instead of two that could disagree with each other. Default: all
  three, in their original order — an existing user's first load after this
  phase ships looks identical to before.
  `utils/userSettingsDefaults.ts`'s `mergeUserSettingsDefaults` gained a
  `sanitizeDashboardWidgets` step: drops unknown ids and de-duplicates while
  preserving saved order, and — like every other field in that function —
  only falls back to the default when the field is missing or not an array
  at all; a document that deliberately saved `[]` (everything hidden) keeps
  it, since that's a real, distinct choice.
- `firestore.rules`'s `settings/{userId}` rule extended: `dashboardWidgets`
  added to the field allowlist, validated as a list whose entries are all
  within the three known ids (`hasOnly`).
- New `components/dashboard/DashboardCustomizeDialog.tsx` — lists all three
  widgets (including currently-hidden ones, so they can be found and
  re-enabled), each row a checkbox (visible/hidden) plus up/down icon
  buttons to reorder. No drag-and-drop library — the app has none, and one
  dialog with three rows doesn't justify adding one, so explicit buttons
  play the same "small controls over a bigger dependency" role
  `QuickAddTransactionDialog`'s type toggle already established. Working
  state is local until Save, matching every other dialog in the app.
- `DashboardPage.tsx` refactored: the three hardcoded `Card`s became a
  `widgetCards: Record<DashboardWidgetId, ReactNode>` map plus a
  `WIDGET_GRID_SIZE` map (`activeBudgets`/`recentTransactions` at `md: 7`,
  `categorySpending` at `md: 5` — the same sizes as before), and the second
  `Grid` now maps over `settings.dashboardWidgets` in order instead of
  rendering two fixed columns. Reordering across the size boundary relies on
  `Grid`'s own wrapping (e.g. `categorySpending` (5) then `activeBudgets` (7)
  fills one row exactly; `recentTransactions` (7) wraps to the next) rather
  than a bespoke masonry layout — acceptable for three items, noted as a
  limitation below. A new "Customize" button (`PageHeader`'s `actions` slot,
  matching `BudgetsPage`'s "Add Budget" convention) opens the dialog; saving
  calls `updateSettings` with `dashboardWidgets` set to the new order and
  every other settings field carried through unchanged, with a `notifyError`
  toast on failure (`useNotification`, same convention as
  `PreferencesSection`). Hiding every widget shows an `EmptyState` with its
  own "Customize" action rather than a blank page.
- `schemas/settingsSchemas.ts`'s `fromSettingsFormValues` gained a second
  parameter (`current: UserSettings`) so `PreferencesSection`'s own form —
  which doesn't edit `dashboardWidgets` — can still submit the whole
  `UpdatableUserSettingsFields` entity per the codebase's "the form always
  submits the whole entity" convention, carrying the current
  `dashboardWidgets` through unchanged instead of the type system forcing a
  narrower, partial-patch shape just for this one field.

**Known limitations, not fixed this phase:**

- Reordering is buttons, not drag-and-drop, per the "no new dependency for
  three rows" reasoning above.
- No per-breakpoint layout — the same order/visibility applies on mobile and
  desktop; Phase 37 (Mobile experience) already established that this app's
  general approach is one responsive layout rather than device-specific
  ones.
- The two-column wrapping when `categorySpending` is reordered away from its
  original neighbor is `Grid`'s default flow behavior, not a hand-tuned
  layout for every permutation — visually fine for three items, but not a
  general masonry solution.

**Verified:**

- `npx tsc -b --noEmit` — clean.
- `npx vitest run` — **1113/1113 passing** (up from 1098; 15 new tests
  across `DashboardCustomizeDialog.test.tsx`, `DashboardPage.test.tsx`
  additions, and `userSettingsDefaults.test.ts` additions).
- `npx oxlint` — 0 errors, same 25 pre-existing benign fast-refresh warnings
  as every prior phase — nothing new.
- `npm run build` — clean, no size warnings.
- A Playwright pass across all 21 routes (plus the 404 catch-all) confirmed
  zero console/page errors. As with every prior phase, this sandbox can't
  authenticate against the real Firebase project, so this exercises
  import/mount correctness rather than an authenticated user actually
  reordering their dashboard — that behavioral guarantee comes from the unit
  tests above. Browser-testable scenarios for the Phase 42 checklist:
  clicking "Customize" on the Dashboard opens a dialog listing Active
  budgets, Recent transactions, and Spending by category, each with a
  checkbox and up/down arrows; unchecking a widget and saving removes it
  from the dashboard immediately; re-opening Customize still lists the
  hidden widget (unchecked, in its last position) so it can be brought back;
  moving a widget up/down and saving changes its position on the dashboard;
  unchecking all three widgets and saving shows an empty-state message with
  its own "Customize" button; Cancel discards any changes made in the
  dialog; the chosen layout persists across a page reload and a re-login
  (it's stored in Firestore, not local-only).

**Next phase when instructed ("Continue to Phase 42"):** Phases 40
(Performance) and 41 (Testing) are marked "Ongoing" rather than
"Not started" — like Phase 37 (Mobile experience) before it, each is
already partially addressed by earlier phases' own choices (route-level
code splitting, the growing Vitest suite) rather than being a discrete
feature to build, so per the precedent set when Phase 37 was skipped
between Phases 36 and 38, the next concrete phase to implement is
**Phase 42 (Final quality review)** — the last row in the phase-plan table
and the last item on the task list.

## Phase 42 — Final Quality Review (COMPLETE)

**Scope.** The last phase in the plan, and unlike every phase before it,
this one adds no user-facing feature. Per the process rule established
early on (see the Phase 8 section's "Process change" note above), live
testing was deferred from every individual phase to one consolidated
checklist at the very end — this phase is where that checklist gets
assembled, plus a final pass across the whole 39-feature-phase codebase
looking specifically for gaps a strictly one-phase-at-a-time process could
plausibly have let through (an inconsistency between two phases, something
verified in isolation that doesn't hold once every feature coexists, a
config file that should have been touched alongside a feature but wasn't).

**Delivered:**

- New `TESTING_CHECKLIST.md` at the repo root — the consolidated manual
  testing checklist, assembled from every phase's own "Verified" section
  above (re-read in full, phase by phase, rather than re-derived from
  memory, to keep every concrete detail — exact button labels, exact
  thresholds, exact edge cases — intact). Organized by phase in build
  order, each with checkbox-style scenarios plus that phase's "Known
  limitations" reproduced inline (so a deliberate simplification isn't
  mistaken for a bug during testing), a "Before you start testing" section
  up front covering every rules/index/Storage deploy step scattered across
  the log, and a short "Reporting back" section at the end. This is the
  file to work through against the real, live Firebase project.
- **Full-codebase verification re-run**, one more time, from a clean
  state — not scoped to any one phase's files, everything:
  `npx tsc -b`, `npx vitest run`, `npx oxlint`, `npm run build`. See
  "Verified" below.
- **Cross-cutting checks that no single phase's own review would catch**,
  since each of those phases only checked its own new collection/rule/query
  in isolation:
  - Every Firestore collection name actually used anywhere in
    `src/services/*.ts` (`accounts`, `assets`, `auditLogs`, `budgets`,
    `budgetTemplates`, `debts`, `debtPayments`, `expenseCategories`,
    `goalContributions`, `liabilities`, `notifications`, `receipts`,
    `recurringTransactions`, `savingsGoals`, `settings`, `tags`,
    `transactions`, `users`) has a corresponding `match` block in
    `firestore.rules` — confirmed a match for all 18, no orphaned
    collection writing with no rule (or, worse, silently falling through to
    whatever the default/catch-all rule is).
  - Every collection queried with `where('userId', '==', …)` *plus* an
    `orderBy` on a different field (the exact shape that needs a Firestore
    composite index, not just an automatic single-field one) has a matching
    entry in `firestore.indexes.json`. This found a real gap: **Phase 35's
    `notifications` query (`userId` + `orderBy('createdAt')`, exactly the
    pattern every other ordered, user-scoped collection already has an
    index for) had no index at all** — missed because Phase 35's own
    "Verified" section, written in isolation, had no earlier phase's index
    file to compare itself against. Fixed this phase: added the
    `notifications` (`userId` ASC, `createdAt` DESC) composite index to
    `firestore.indexes.json`. Redeploying indexes (see
    `TESTING_CHECKLIST.md`'s "Before you start testing") is required before
    the notification bell will work against live Firestore — without it,
    Phase 35's entire feature would show a "the query requires an index"
    console error the first time any user has a notification.
  - `.env.example` cross-checked field-for-field against every
    `VITE_FIREBASE_*` key `.env`/`src/firebase/config.ts` actually
    reads — exact match, nothing missing or stale.
  - Searched all of `src/` (excluding tests) for `console.log`,
    `console.debug`, `debugger`, `TODO`, `FIXME`, `XXX` — zero hits.
- **Found and fixed a testing-tooling bug, not an app bug:** the ad hoc
  Playwright smoke-test route list used internally for verification since
  Phase 27 had `/networth` where the actual route (per
  `src/routes/router.tsx`) is `/net-worth`. Since an unmatched route falls
  through to the 404 catch-all page — which itself renders with zero
  console errors — every prior phase's "Playwright pass across all routes,
  zero console errors" claim was true as stated but never actually
  exercised `NetWorthPage` itself; the automated check was silently testing
  the wrong page since Phase 27 shipped. `NetWorthPage` was still built and
  covered by `NetWorthPage.test.tsx`'s unit tests the whole time — this
  only affected the *browser-level* smoke check, not the automated test
  suite, and not the app itself. Corrected the route list (built by copying
  the literal path strings out of `router.tsx` rather than retyping them,
  so this class of typo can't recur) and re-ran — see "Verified" below.
  Flagged explicitly in `TESTING_CHECKLIST.md`'s own Phase 42 section so a
  live pass over Net Worth gets a little extra attention.

**Known limitations, not fixed this phase (structural, out of scope for a
review pass):**

- This sandbox still has no network path to a real Firebase project or the
  Firebase emulator, so nothing in `TESTING_CHECKLIST.md` has actually been
  executed against live data — that remains the user's job, which is the
  entire reason this checklist exists.
- The review cross-checked collections against rules and indexes, and
  scanned for debug/TODO artifacts, but did not attempt a full manual
  line-by-line audit of all 39 phases' code, nor an automated dead-code/
  unused-export sweep (no such tool is part of this project's toolchain) —
  the four automated checks (`tsc`/`vitest`/`oxlint`/`build`) plus the
  targeted cross-checks above are what "final quality review" concretely
  means here, not an exhaustive re-audit of already-shipped, already-tested
  phases.

**Verified:**

- `npx tsc -b --noEmit` — clean.
- `npx vitest run` — **1113/1113 passing** (unchanged from Phase 39 — this
  phase added no new source code with test coverage of its own, only a
  Firestore config fix and a documentation file).
- `npx oxlint` — 0 errors, same 25 pre-existing benign fast-refresh
  warnings as every prior phase.
- `npm run build` — clean, no size warnings.
- A corrected Playwright pass across all 21 real routes from
  `router.tsx` (including, for the first time, the actual `/net-worth`
  path) plus the 404 catch-all confirmed zero console/page errors on every
  one.
- Manual cross-checks (collections vs. rules, indexes vs. queries,
  `.env`/`.env.example` parity, debug-statement/TODO scan) as described
  above.
- Browser-testable scenario for the checklist: after redeploying
  `firestore.indexes.json`, confirm the notification bell (Phase 35)
  populates without a "the query requires an index" console error, and
  separately confirm `/net-worth` (Phase 27) renders and behaves correctly
  for the first time against live data — both called out explicitly in
  `TESTING_CHECKLIST.md`.

**This is the last phase.** All 42 phases (39 of them shipping a
user-facing feature, 3 — Database design, Mobile experience, Performance/
Testing — addressed as cross-cutting concerns throughout rather than
standalone builds) are now complete. `TESTING_CHECKLIST.md` is the
deliverable for what comes next: working through it against the real,
live `budget-tracker-c4508` Firebase project and reporting back anything
that doesn't match.

## Post-Phase-42 — Timezone / date-range bug fix (COMPLETE)

**Found live, against the real `budget-tracker-c4508` project** while
working through `TESTING_CHECKLIST.md`: a transaction dated 1 Sep 2026
displayed correctly everywhere ("1 Sep 2026") but was silently excluded
from every "this month" calculation — the Dashboard's "Expenses this
month" stat and the Transactions page's "This month" filter both showed
it as absent, and (once traced further) so would Budgets' active-budget
matching, Monthly/Yearly Summary, Reports, and Insights, for any
calendar-date field on any record.

**Root cause:** `date`/`startDate`/`endDate`/`targetDate`/`asOf` are all
*calendar dates* (a day the user picked, not a moment in time), but every
service's Firestore-read mapper (`mapTransactionDoc`, `mapBudgetDoc`,
`mapSavingsGoalDoc`, `mapContributionDoc`, `mapDebtDoc`,
`mapDebtPaymentDoc`, `mapReceiptDoc`, `mapAssetDoc`, `mapLiabilityDoc`)
converted the stored Firestore `Timestamp` to an app-level string via
`.toISOString()`, which always renders in UTC. For any user ahead of UTC
(confirmed reproduced for IST, +5:30), a local-midnight "1 Sep" instant
renders as `"2026-08-31T18:30:00.000Z"` — and once that full string is
truncated to its first 10 characters and compared as a "YYYY-MM-DD" range
boundary (`isDateInRange`/`filterByDateRange`), the transaction reads as
31 Aug, not 1 Sep. `formatDate()`'s date-fns display path formats in
*local* time and so still showed the correct day, which is what made this
a silent range-filtering bug rather than an obviously-wrong display bug.

Phase 14's `recurringTransactionService.ts` had already solved this
correctly (storing/reading these fields as local-calendar "YYYY-MM-DD"
strings via a private `toDateOnlyString`/`parseDateOnly` pair in
`recurringCalculations.ts`) — every other date-only field just hadn't
been brought in line with that pattern.

**Fixed:**

- Moved `toDateOnlyString`/`parseDateOnly` from `recurringCalculations.ts`
  into `formatDate.ts` (re-exported from the old location so existing
  imports keep working) so every service can share one implementation.
- Fixed `toDate()` in `formatDate.ts` to special-case a bare
  `"YYYY-MM-DD"` string via local Y/M/D parsing (`parseDateOnly`) instead
  of `new Date(value)` — the previous behavior was correct for
  positive-UTC-offset users only by accident and would have shifted the
  day backward for any negative-offset user once these fields became
  clean date-only strings.
- Fixed the Firestore-read mappers listed above (`transactionService.ts`,
  `budgetService.ts`, `goalService.ts`, `debtService.ts`,
  `receiptService.ts`, `assetService.ts`, `liabilityService.ts`) to read
  every calendar-date field as a local "YYYY-MM-DD" string
  (`toDateOnlyString`-based `toDateOnlyField` helper, mirroring
  `recurringTransactionService.ts`'s existing pattern) instead of
  `.toISOString()`. `createdAt`/`updatedAt`/audit-log `timestamp` fields
  (true instants, not calendar dates) were deliberately left untouched, as
  were `transactionService.ts`'s audit-snapshot `.toISOString()` calls
  (display-only via `formatDate()`, never compared as a range).
- Fixed the mirror-image bug this would otherwise have introduced: nine
  call sites across `TransactionsPage.tsx`, `RecurringTransactionsPage.tsx`,
  `SubscriptionsPage.tsx`, `BudgetsPage.tsx`, `NetWorthPage.tsx`,
  `DebtsPage.tsx`, `ReceiptsPage.tsx`, and `goalCalculations.ts`'s
  `getDaysRemaining` were pre-filling an edit form's date picker (or doing
  days-remaining math) via the native `new Date(dateOnlyString)`, which
  parses a bare date string as UTC midnight — safe by accident for
  positive-offset users, wrong for negative-offset ones. All switched to
  `parseDateOnly()`.
- Fixed the same class of bug in CSV import (`csvTransactionImport.ts`'s
  `parseFlexibleDate`): a bare `"YYYY-MM-DD"` row is now parsed via
  `parseDateOnly()` instead of the native parser; a row that also carries
  a time/zone part still goes through the native parser, since that's a
  genuine instant.
- Cosmetic: `TransactionsPage.tsx`'s CSV-export filename date
  (`transactions-YYYY-MM-DD.csv`) now uses `toDateOnlyString(new Date())`
  instead of `new Date().toISOString().slice(0, 10)`, for the same
  reason — purely a filename, not a functional bug, but the same fix was
  free to apply for consistency.
- Updated `GoalCard.test.tsx`'s two date-dependent fixtures, which had
  encoded a `targetDate` as `date.toISOString()` — the old (and, it turns
  out, no longer accepted) full-instant shape — to use the new
  `toDateOnlyString()` helper instead, matching what the real read path
  now produces.

**Verified:**

- `npx tsc -b` — clean.
- `npx vitest run` — **1113/1113 passing** (2 failures found and fixed in
  `GoalCard.test.tsx` before this — see above).
- `npx oxlint` — 0 errors, same pre-existing benign fast-refresh warnings.
- `npm run build` — clean.
- A standalone Node repro script confirmed the exact reported scenario:
  simulating a local-midnight "1 Sep 2026" instant read via the old
  `.toISOString().slice(0, 10)` path incorrectly resolves to `2026-08-31`
  and fails a "is this in September 2026" range check; the same instant
  read via the new `toDateOnlyString()` path correctly resolves to
  `2026-09-01` and passes. A second script confirmed the mirror-image
  fix (`parseDateOnly` vs. native `new Date()`) for a negative-UTC-offset
  zone (`America/Los_Angeles`).
- Live re-verification against the real, already-authenticated
  `budget-tracker-c4508` session (after delivering the fix to
  `D:\Projects\sites\budget tracker` and confirming md5 parity): Dashboard
  "Expenses this month" now correctly includes the 1 Sep transaction;
  Transactions page "This month" filter now correctly shows it (1 of 1); a
  freshly-created budget spanning 1–30 Sep 2026 correctly matched it as
  "On track" spend; a freshly-created savings goal with a 30 Sep 2026
  target date correctly showed "10 days left" and its edit form correctly
  pre-filled the date picker with no shift; Monthly Summary, Yearly
  Summary, Reports, and Insights for September 2026 all correctly reflect
  the transaction. Swept every other page (Accounts, Debts, Net Worth,
  Receipts, Recurring, Subscriptions) for console errors — none found. A
  brand-new browser tab against the running dev server showed zero console
  errors on load, confirming the transient Vite HMR warnings seen
  mid-edit (from many source files changing in one batch) were stale
  history, not an actual runtime problem.
- Two small test artifacts were intentionally left in the live account
  for the user to inspect or delete at their discretion (deleting a
  user's own data is outside what this assistant does on its own): a
  budget named "Timezone Fix Test" (1–30 Sep 2026, ₹500) and a savings
  goal named "TZ Fix Goal" (target 30 Sep 2026, ₹1,000).

## Post-Phase-42 — Full application bug hunt (COMPLETE)

Per the user's request to "go through the whole application and check for
bugs and fix them if there are any," reviewed every feature area (Phase
1–42's full surface) in five parallel focus groups — transactions/import,
budgets/recurring/subscriptions, goals/debts/net worth/accounts,
reports/dashboard/notifications/audit log, and receipts/settings/money/
security rules — then independently re-read and verified every reported
finding against the actual source before fixing anything. Findings judged
not worth fixing (very low real-world impact for a single-user app, or
already-adequate mitigation elsewhere) are noted but left alone.

**Fixed:**

- **Recurring-transaction generation race condition**
  (`recurringTransactionService.ts`): `generateDueOccurrences` used to read
  every due rule's cursor once, generate every occurrence for all of them,
  then write every rule's new cursor back in a single end-of-batch update.
  Two overlapping calls (e.g. two browser tabs open, or a slow call
  overlapping the next scheduled check) could each generate the same
  occurrence before either had advanced the cursor, double-creating a
  transaction. Replaced with a per-occurrence optimistic-concurrency
  "claim" (`claimRecurringOccurrence`, a `runTransaction` that re-reads the
  rule, verifies its `nextOccurrence` still matches what this call expects,
  and only then atomically advances it) — a lost claim now silently skips
  that one occurrence for this call (the other call already generated it)
  rather than ever double-creating a real financial transaction.
- **Budget double-counting a category used by two budget items**
  (`budgetCalculations.ts`'s `getBudgetActualSpent`): summed
  `getCategoryActualSpent` once per budget *item* rather than once per
  distinct *category*, so a budget with two items pointed at the same
  category (possible via `BudgetFormDialog`'s form, nothing stopped it)
  counted that category's spend twice. Now reduces over the de-duplicated
  set of category ids.
- **Net worth wrongly excluding a credit card in credit**
  (`netWorthCalculations.ts`): `getAccountAssetsTotal`/`getAssetBreakdown`
  excluded every `credit_card` account from assets outright — correct for
  the common case (a card you owe money on is a liability, already counted
  via `getAccountLiabilitiesTotal`), but wrong for a card with a positive
  balance (e.g. after an overpayment or a large refund), which is real
  money the user has, not owes. Both now include a credit card in assets
  when its `currentBalance > 0`, matching how every other account type is
  already treated.
- **Deleting a savings goal / debt orphaned its contributions / payments**
  (`goalService.ts`'s `deleteSavingsGoal`, `debtService.ts`'s
  `deleteDebt`): both only ever removed the goal/debt document itself,
  leaving every `goalContribution`/`debtPayment` pointing at a now-dangling
  id — invisible in the UI but still fetched by `subscribeToGoalContributions`/
  `subscribeToDebtPayments` on every load, and directly contradicting what
  `GoalsPage`/`DebtsPage`'s own delete-confirmation dialog already told the
  user would happen ("permanently deletes ... and every
  contribution/payment recorded against it"). Both now cascade-delete the
  child records first. `GoalsPage.tsx`/`DebtsPage.tsx` and their tests
  updated for the new `(userId, id)` signatures these needed.
- **Audit log re-introducing the timezone date-shift bug for one field**:
  the Post-Phase-42 timezone fix above covered every *read* path and the
  real transaction document's own `date` field, but missed four audit-log
  *write* sites in `transactionService.ts` (`createTransaction`,
  `updateTransactionCore`, `createTransferTransaction`,
  `updateTransferTransaction`) and `auditSnapshot.ts`'s
  `serializeTransactionSnapshot`, all of which still wrote a transaction's
  `date` via `.toISOString()` — UTC-normalizing a calendar date exactly
  like the original bug. A transaction's audit-log entries (viewable on
  `AuditLogPage`) could show the wrong calendar day for anyone not on UTC.
  All five now use `toDateOnlyString()`; `auditSnapshot.test.ts` updated to
  expect a plain "YYYY-MM-DD" string instead of a full ISO instant.
- **Orphaned Storage file if a receipt's Firestore write fails**
  (`receiptService.ts`): `ReceiptsPage` uploaded the file to Storage, then
  separately created the Firestore metadata doc — if the second step
  failed (a dropped connection, a rules rejection), the file stayed in
  Storage with no doc ever pointing at it, invisible and undeletable
  through the app. Added `createReceiptWithFile`, which does both steps
  and deletes the just-uploaded file if the Firestore write fails;
  `ReceiptsPage.tsx` and its tests updated to use it.
- **Receipt file-size boundary mismatch**: `ReceiptFormDialog.tsx`
  accepted a file up to and including exactly 5 MB, but `storage.rules`
  only allows a file *strictly less than* 5 MB — a file of exactly 5 MB
  passed the friendly client-side check only to be rejected by Storage
  with an opaque permission error. Client check changed from `>` to `>=`
  to match the rule exactly; added a boundary test.
- **`toMinorUnits` float-representation rounding error**
  (`money.ts`): `1.005 * 100 === 100.49999999999999` in IEEE754, which
  `Math.round` alone sent to 100 (paise) instead of the correct 101 — an
  amount like ₹1.005 (typeable by mistake, or a byproduct of some
  calculation) silently lost a paisa. Added a tiny relative-epsilon nudge
  before rounding so a value that was only supposed to sit exactly on a
  .5-minor-unit boundary lands on the correct side of it, without
  affecting any value that wasn't near that boundary.
- **No validation for an amount that rounds to 0 minor units**: every
  money-amount form field across the app (transactions, transfers,
  adjustments, recurring rules, budgets, goals, debts, receipts, assets,
  liabilities) only checked `> 0` on the typed decimal, so something like
  "0.004" passed client-side validation, converted to 0 paise via
  `toMinorUnits`, and would have been rejected by `firestore.rules`
  (which requires the stored amount be `> 0`) with an opaque "Missing or
  insufficient permissions" error instead of a clear message at the point
  the user could still fix it. Extracted the repeated
  `z.coerce.number().positive().finite()` chain into a new shared
  `schemas/moneySchemas.ts` (`moneyAmountSchema`), which also rejects an
  amount that rounds to 0 minor units, and switched all 15 schema files
  that had their own copy of that chain to use it.
- **Editing a transaction became permanently blocked once its account was
  deleted** (`transactionService.ts`'s `updateTransactionCore`):
  `AccountsPage`'s own delete confirmation explicitly promises that
  deleting an account "does not delete any transactions already recorded
  against it" — but editing one of those survivors (even just fixing a
  typo in the description, no account change involved) unconditionally
  threw "The selected account no longer exists," since the function
  required the account to exist before it would touch the transaction
  document at all. Now follows the same defensive `accountSnap.exists()`
  pattern `deleteTransaction` already uses: an account that's gone is
  simply skipped for balance purposes (nothing left to reconcile) rather
  than blocking the edit. Reassigning *to* an account that doesn't exist
  is still rejected, since there's nowhere real to move the balance effect.
- **Stale default account/category silently pre-filling a form**
  (`QuickAddTransactionDialog.tsx`, `TransactionsPage.tsx`): Settings'
  "default account"/"default expense category" (Phase 36) are never
  cleared when the account or category they point at is later deleted, so
  a brand-new Income/Expense/Quick-Add form pre-filled `accountId`/
  `category` with an id that was no longer a real option — showing as a
  blank, nothing-selected `<Select>` at best, or (for the category field,
  which isn't cross-checked against real categories) silently submitting
  a transaction with a slug nothing can look up anymore. Added
  `resolveLiveDefaultId` (`userSettingsDefaults.ts`) and used it at both
  pre-fill sites to fall back to blank/the first category whenever the
  saved default isn't in the current live list.

**Considered and deliberately left alone:**

- `tagService.ts`'s slug-uniqueness check has a narrow TOCTOU race (two
  near-simultaneous creates of a same-named tag could both pass the
  "does this slug exist" read before either write lands) — real-world
  impact for a single-user app is negligible (worst case: two tags with
  the same display name), left as-is.
- Preventing duplicate category selection at the `BudgetFormDialog` form
  level (rather than only de-duplicating in the calculation layer) — the
  calculation fix above is sufficient; the form itself still allows
  picking the same category twice, which is harmless now that the total
  is computed correctly either way.

**Verified:**

- `npx tsc -b` — clean.
- `npx vitest run` — **1124/1124 passing** across 132 test files (new/
  updated tests: `netWorthCalculations.test.ts`, `GoalsPage.test.tsx`,
  `DebtsPage.test.tsx`, `auditSnapshot.test.ts`, `money.test.ts`,
  `moneySchemas.test.ts` (new), `ReceiptsPage.test.tsx`,
  `ReceiptFormDialog.test.tsx`, `QuickAddTransactionDialog.test.tsx`,
  `TransactionsPage.test.tsx`; `transactionService.ts` has no dedicated
  test file — same as before this round — so the account-deletion edit
  fix was verified by re-reading the transaction path end to end rather
  than a unit test).
- `npx oxlint` — 0 errors, same pre-existing benign fast-refresh warnings
  as every previous phase.
- `npm run build` — clean.
