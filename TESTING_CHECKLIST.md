# Budget Tracker — Consolidated Testing Checklist

This is the single checklist assembled at the end of the 42-phase build, per
your instruction to defer live testing to the end rather than confirm each
phase individually. Every item below comes from a phase's own "Verified"
section in `PHASE_LOG.md` — the manual, browser-testable scenario that
phase's automated tests couldn't cover because this build sandbox has no
network path to your real Firebase project. Nothing here has been run
against live data yet; this is the list to work through in your own
browser, signed in for real.

**How to use this:** work through it section by section (each section is
one phase, in build order). Check items off as you confirm them. If
something doesn't behave as described, note the section number, the exact
steps, and what happened instead — that's what to report back. A "Known
limitations" line under a section is a documented, deliberate simplification
from that phase, not a bug — you don't need to report those unless one
surprises you in practice.

---

## Before you start testing

These are one-time setup steps. Skipping them will produce confusing
failures (most commonly a browser-console "Missing or insufficient
permissions" error, or "the query requires an index" with a Firebase
Console link) that look like app bugs but are actually just undeployed
config.

- [ ] **Firebase CLI is set up for this project** (`budget-tracker-c4508`):
      `firebase.json` and `.firebaserc` are already in the repo; run
      `npx firebase-tools login` once if you haven't.
- [ ] **Deploy Firestore rules and indexes together:**
      `npx firebase-tools deploy --only firestore:rules,firestore:indexes`
      (or paste `firestore.rules` into Firebase Console → Firestore
      Database → Rules, and `firestore.indexes.json`'s contents into the
      Indexes tab). This covers every collection added across all 39
      feature phases, including `settings`, `notifications`, and this
      phase's fix to `notifications`' missing composite index (see
      "Phase 42" below).
- [ ] **Enable Firebase Storage and deploy its rules** (needed for Phase 19
      receipts): enable Storage in the Firebase Console for this project,
      then `npx firebase-tools deploy --only storage`.
- [ ] **Phase 31 regression pass** — this phase rewrote `firestore.rules`
      from scratch (field allowlisting, cross-collection ownership checks)
      with no way to verify it against a live emulator from this sandbox.
      The very first thing to do after deploying is exercise *every*
      feature that writes to Firestore at least once, watching the browser
      console for "Missing or insufficient permissions": account CRUD,
      every transaction type (income/expense/refund/adjustment/transfer),
      recurring rule CRUD/pause/resume, budget CRUD, savings goal +
      contribution CRUD, debt + payment CRUD, receipt CRUD (linked and
      unlinked), category/subcategory CRUD, tag CRUD, budget template CRUD,
      asset/liability CRUD, and confirm the Audit Log populates. If
      something breaks, `firestore.rules.pre-phase31.bak` is the rollback.
- [ ] Register a brand-new account and log in for real — this build has
      never been exercised against live Firebase Auth at all, from any
      phase.

---

## Phase 1 — Project Foundation

- [ ] Visit every route (Dashboard, Transactions, Accounts, Budgets, Goals,
      Reports, Settings, Login, Register, Forgot Password, and an unknown
      URL for the 404 page) on both a desktop-sized window and a phone —
      zero console errors on any of them.
- [ ] Light/dark theme toggle works and the choice survives a reload.
- [ ] On a narrow/mobile width, the sidebar collapses to a hamburger menu
      that slides over the content; navigating via it closes the drawer and
      routes correctly.

*Known limitation: MUI's `Box`/`Stack`/`Typography` only accept the `sx`
prop for styling here, not shorthand props like `display`/`gap`/`p` — not a
bug if custom code doesn't respond to those.*

## Phase 2 — User Authentication

- [ ] Register with first/last name, email, password, confirm password —
      confirm validation catches missing fields, a bad email format, a weak
      password (watch the live strength meter), and a mismatched confirm.
- [ ] Log in with "Remember me" toggled — confirm it affects whether you
      stay signed in after closing the browser.
- [ ] Get redirected to login from a protected page while signed out, then
      log in — confirm you land back on the page you originally wanted.
- [ ] Forgot Password — confirm the response looks identical whether or not
      the email you enter is actually registered (no account enumeration).
- [ ] Log out via the account menu (topbar avatar) — confirm it shows your
      initials/photo, name, and email while signed in.
- [ ] In Settings, update first/last name, currency, country, and timezone
      (auto-detected from your browser); set a profile picture by pasting an
      image URL and confirm the live preview updates. Email should show
      read-only.

*Known limitations: profile picture is a pasted URL, not a file upload;
changing your email address isn't supported yet; "financial preferences"
became Phase 36's Settings page.*

## Phase 3 — Financial Accounts

- [ ] Create an account, edit it, then delete it — the displayed balance
      matches what you entered throughout.
- [ ] Opening balance is editable only when creating an account; editing an
      existing account shows it disabled with an explanatory note.
- [ ] With accounts in more than one currency, confirm the dashboard's
      total-balance stat cards are split one per currency rather than
      summed together.
- [ ] A long numeric account number shows masked (only the last 4 digits
      visible); a non-numeric identifier (e.g. a wallet name) shows as
      entered.

## Phase 4 — Income Management

- [ ] Add an income entry — the chosen account's balance increases by
      exactly that amount.
- [ ] Edit an income entry, including moving it to a different account —
      both accounts' balances end up correct.
- [ ] Delete an income entry — the balance effect is fully reversed.
- [ ] No "this query requires an index" error appears on the Transactions
      page (confirms the composite index deployed correctly).

*Known limitation: deleting an account doesn't check whether transactions
still reference it — an orphaned transaction just shows "—" for Account.*

## Phase 5 — Expense Management

- [ ] Add an expense — the chosen account's balance decreases by exactly
      that amount.
- [ ] Edit an expense, including changing its category/subcategory or
      moving it to a different account — balances stay correct.
- [ ] The Transactions table shows expense rows as "Category → Subcategory".

## Phase 6 — Expense Categories

- [ ] Open Settings — the 9 default categories appear exactly once, even
      after reopening the page (no duplicates).
- [ ] Add a new expense — it records and displays the right category.
- [ ] Every expense you tested in Phase 5 still shows its correct
      category/subcategory label.
- [ ] In Settings → Expense Categories, rename and delete a category and a
      subcategory (try both a default one and one you create) — chips
      update accordingly.

*Known limitation: deleting a category doesn't check for referencing
transactions — they fall back to showing the raw category slug as plain
text.*

## Phase 7 — Unified Transaction System

- [ ] Record a refund — confirm it *increases* the account balance (same
      direction as income, not expense).
- [ ] Record an adjustment both increasing and decreasing a balance —
      confirm each direction works, and that editing an adjustment's
      direction correctly re-reverses and re-applies the old effect first.
- [ ] Every income/expense entry from earlier testing still displays and
      edits correctly (merchant/tags fields added this phase didn't corrupt
      older records).

## Phase 8 — Account Transfers

- [ ] Create a transfer between two real accounts — one is debited, the
      other credited, by the same amount.
- [ ] Edit a transfer's amount or either account — both sides' balances are
      correctly re-reversed and re-applied.
- [ ] Delete a transfer — both accounts are correctly reversed.
- [ ] "Add Transfer" is disabled with only one account, and becomes enabled
      once you add a second.

*Known limitation: no currency conversion — a transfer applies its entered
amount unchanged to both accounts even across different currencies.*

## Phase 9 — Budget Management

- [ ] Create an overall-scope budget and a separate category-scope budget —
      both save and display the right total.
- [ ] Edit a budget, including switching between overall and category
      scope — no stale data left behind from the old scope.
- [ ] Delete a budget — confirm it has no effect on any recorded
      transaction.

## Phase 10 — Budget vs. Actual

- [ ] A budget's card shows the correct actual-spend total and percentage
      against transactions really recorded in its date range.
- [ ] Recording a new expense in a budgeted category updates that budget's
      card live.
- [ ] A refund correctly reduces the actual-spend shown.
- [ ] The status color (safe/warning/near-limit/over) changes correctly as
      spend crosses each threshold.
- [ ] A category-scope budget's per-category breakdown shows the right
      actual amount against each category's own limit.

*Known limitation: weekly/custom-period budgets don't auto-advance into the
next period — you'd create a new one.*

## Phase 11 — Dashboard

- [ ] Total balance stat card(s) match the Accounts page.
- [ ] Income/expenses/net for the current month match manually totaling
      this month's transactions.
- [ ] The active-budgets panel matches the Budgets page for any budget
      covering today.
- [ ] Recent transactions match the top of the Transactions page.
- [ ] The category donut chart's slices and amounts match this month's real
      category spend.

*Known limitation: the three "this month" stat cards mix currencies rather
than splitting per-currency, unlike "Total balance."*

## Phase 12 — Reports & Analytics

- [ ] The selected month's income/expenses/net match manually totaling that
      month's transactions.
- [ ] Stepping backward through previous months shows correct historical
      data; "Next month" is disabled once you're at the current month.
- [ ] The 6-month bar chart's bars match each month's actual figures.
- [ ] The top-categories list and progress bars match that month's real
      spend.

## Phase 13 — Date Filtering

- [ ] Transactions page shows everything by default ("All time").
- [ ] Each preset (This month, Last month, Last 3 months, Last 6 months,
      This year) correctly narrows the table.
- [ ] "Custom range" with a From/To date narrows to exactly that span.
- [ ] Switching back to "All time" restores the full list.

*Known limitation: the two custom-range date pickers don't warn if you set
an end date before the start date — it just silently matches nothing.*

## Phase 14 — Recurring Transactions

- [ ] Add a monthly expense rule with a start date in the past — it
      immediately generates every missed occurrence up to today (each
      lowering the account balance) and shows the correct "Next due" date.
- [ ] Add an income rule starting today — exactly one occurrence generates
      and the balance increases.
- [ ] Pause a rule — confirm it stops generating even once its due date
      passes.
- [ ] Edit a rule's amount — only future occurrences are affected; nothing
      already generated changes.
- [ ] Delete a rule — already-generated transactions stay in the ledger
      untouched.

*Known limitations: occurrences only catch up when you open the app (no
server-side scheduler); a day that overflows a shorter month (e.g. Jan 31
+1 month) rolls into the next month rather than clamping.*

## Phase 15 — Subscription Tracker

- [ ] Flip "This is a subscription" on an existing recurring expense — it
      immediately appears on the Subscriptions page with the right
      monthly-equivalent cost.
- [ ] Add a subscription directly — it also appears on the Recurring page
      with a "Subscription" chip.
- [ ] Pausing, resuming, or deleting a subscription correctly
      excludes/includes/removes it from the Monthly/Yearly cost stat cards.
- [ ] A yearly-billed subscription shows a Monthly cost roughly 1/12th its
      sticker price.
- [ ] Editing from the Subscriptions page and from the Recurring page both
      affect the same underlying rule.

## Phase 16 — Savings Goals

- [ ] Create a goal with a target date 10 days out — it shows "10 days
      left" with a matching status color.
- [ ] Add a contribution — the progress bar, percentage, and "Total saved"
      stat card update immediately.
- [ ] Reach the target with enough contributions — the chip flips to "Goal
      reached" and it's counted in "Goals completed."
- [ ] Delete a contribution — the goal's current amount correctly reduces.
- [ ] A goal with no target date never shows a deadline warning.
- [ ] Delete a goal — it disappears and its contributions stop counting
      toward page totals.

*Known limitation: a contribution is a standalone progress record — it
doesn't debit any real account/transaction.*

## Phase 17 — Debt Tracking

- [ ] Add a debt with payment due day 31 in a short month (e.g. February) —
      confirm the due date clamps rather than spilling into March.
- [ ] Record a payment — outstanding amount, percent-paid bar, and "Total
      outstanding" update immediately.
- [ ] Status chip escalates correctly: within 3 days → "Payment due soon";
      4–7 days → "Payment approaching"; beyond → "On track."
- [ ] Pay a debt off in full — it flips to "Paid off" and counts toward
      "Debts paid off."
- [ ] Delete a payment — outstanding amount correctly increases back.
- [ ] Delete a debt — its card and payments disappear from totals.

*Known limitation: no interest accrual; a payment doesn't debit a real
account/transaction; scoped to installment debts, not revolving credit
(that's what a Credit Card account type is for — Phase 18).*

## Phase 18 — Credit Card Management

- [ ] Add a credit card account — Credit limit, Statement day, and Payment
      due day fields appear only once "Credit Card" is selected as the type.
- [ ] Charge an expense to the card — debt and utilization percentage
      increase.
- [ ] Utilization status chip escalates at 50% ("elevated"), 80% ("Near
      credit limit"), and 100% ("Over credit limit").
- [ ] Record a payment as a transfer into the card account — debt and
      available credit reduce immediately.
- [ ] Set a payment due day — "Payment due in N days" is correct and rolls
      to next month once the day passes, clamping correctly for a due day
      past a shorter month's end.
- [ ] "Total credit card debt"/"Total available credit" cards only appear
      once at least one card has a limit set, and sum correctly across
      multiple cards.

*Known limitation: no interest accrual; no statement-balance concept, only
current running debt.*

## Phase 19 — Receipt Management

- [ ] Adding a receipt requires choosing a file first.
- [ ] Upload a JPEG/PNG/WebP/PDF under 5MB — it appears in the grid with a
      working thumbnail (or a PDF icon for PDFs).
- [ ] Try a wrong file type or one over 5MB — confirm it's rejected with a
      clear message before any upload starts.
- [ ] Edit a receipt — merchant/amount/date/notes/linked-transaction can
      change, but the file itself cannot be replaced.
- [ ] Link a receipt to an existing transaction — the chip and transaction
      description show on the card.
- [ ] Delete a receipt — both the Firestore record and the underlying
      Storage file are removed (check the Storage console to be sure).
- [ ] "View receipt" opens the actual uploaded file in a new tab.

*Known limitations: no OCR — manual entry only; no bulk upload; PDFs get a
generic icon, not a real thumbnail.*

## Phase 20 — Transaction Search

- [ ] Type a merchant name — the table narrows to matching expense/refund
      rows.
- [ ] Search an income source, an adjustment's reason text, or an account
      name — each works.
- [ ] Filter by one or more transaction types and/or accounts — a transfer
      shows up if either its source or destination account is selected.
- [ ] Set a minimum and/or maximum amount — the table narrows to that range.
- [ ] "N matching transactions" updates live as filters change.
- [ ] "Clear filters" restores the full (date-range-limited) list.

*Known limitation: plain case-insensitive substring search, no fuzzy
matching or highlighting.*

## Phase 21 — Tags

- [ ] In Settings → Tags, create a tag with a name and color — it shows as
      a colored chip.
- [ ] Rename and recolor an existing tag.
- [ ] Delete a tag — confirm the dialog explains that existing transactions
      keep showing its name as plain text.
- [ ] Every transaction form's Tags field shows a dropdown of real tags as
      colored chips (not free typing); selecting one attaches it.
- [ ] The Transactions table shows each row's tags as colored chips.
- [ ] Typing a tag's name into search narrows the table to transactions
      with that tag.
- [ ] Rename a tag — its label updates everywhere (table, picker, search)
      without touching any transaction.
- [ ] Delete a tag — it disappears from the picker, while transactions that
      already had it keep the old name as plain, uncolored text.

## Phase 22 — Monthly Financial Summary

- [ ] "Monthly Summary" opens a page distinct from Dashboard and Reports.
- [ ] The month picker walks backward/forward and can't go past the current
      month.
- [ ] The four stat cards (Income/Expenses/Net savings/Savings rate) show
      correct figures with a "+X% vs last month" comparison — specifically
      confirm an expense *increase* is colored red, not green.
- [ ] The category donut chart and list show every category with spending
      that month, not just a top few.
- [ ] Every budget whose period touches the selected month appears with the
      correct spent/total and status color; a month with no such budget
      shows the empty state.
- [ ] "View all" (budgets) navigates to the Budgets page.
- [ ] The biggest single expense shows the correct amount, merchant, and
      category.
- [ ] Transaction-count chips match what was actually recorded that month.
- [ ] "Export PDF" downloads a PDF matching what's on screen.

*Known limitation: "Biggest expense" doesn't net against a later refund.*

## Phase 23 — Yearly Summary

- [ ] "Yearly Summary" opens a page distinct from Dashboard, Reports, and
      Monthly Summary.
- [ ] The year picker walks backward/forward and can't go past the current
      year.
- [ ] The four stat cards show correct year figures with a "+X% vs last
      year" comparison, same red/green convention as Monthly Summary.
- [ ] The month-by-month bar chart shows all 12 months, including zeroed
      bars for months with no activity.
- [ ] The category donut chart/list show every category with spending that
      year.
- [ ] Every budget touching the year appears (multiple monthly budgets show
      as separate rows, no rollup); a year with none shows the empty state.
- [ ] "Export PDF" downloads a matching PDF.

## Phase 24 — Spending Insights (Rule-Based)

- [ ] "Insights" opens a distinct page.
- [ ] Push a budget over its limit — a red "over budget" alert appears with
      a working "View budgets" button.
- [ ] Spend much more than a category's recent average — a matching alert
      appears.
- [ ] Spend more than you earned in a month — a "spent more than you
      earned" alert appears; a very high savings rate produces a green
      celebratory one instead.
- [ ] A debt with a payment due within the next few days produces a
      due-soon alert that gets more urgent inside 3 days.
- [ ] An atypically large expense in a category with spending history
      produces an "unusually large expense" alert.
- [ ] Heavy subscription costs relative to income produce a subscriptions
      alert.
- [ ] With nothing to flag, the page shows "You're all caught up" instead
      of an empty list.

*Known limitation: insights recompute fresh on every load — no dismiss/read
history on this page itself (that's what Phase 35's notifications add).*

## Phase 25 — Budget Templates

- [ ] Budgets page shows a "Templates" card above the budget list.
- [ ] A budget's "⋮" menu → "Save as template" opens a naming dialog; after
      saving, it appears in the Templates card.
- [ ] A template's "Use" icon opens "Add Budget" pre-filled with its
      amount/category limits/thresholds, but today's month as the date
      range.
- [ ] Deleting a template (after confirming) doesn't affect any budget
      already created from it.
- [ ] With no templates saved, the card shows a "No templates yet" empty
      state.

## Phase 26 — Smart Budget Suggestions

- [ ] With at least one full trailing month of expense history, Budgets
      shows a "Smart Suggestions" card with a suggested overall amount and
      per-category breakdown.
- [ ] A category's suggestion icon (or the overall "Create" button) opens
      "Add Budget" pre-filled with the suggested amount.
- [ ] "Create from all" opens a category-scope budget pre-filled with every
      listed suggestion at once.
- [ ] A brand-new account with no expense history shows "Not enough history
      yet" instead of a suggestion.

## Phase 27 — Net Worth

- [ ] "Net Worth" shows Total Assets/Total Liabilities/Net Worth stat cards
      matching a hand-calculated sum of active account balances, debts, and
      manually added assets/liabilities.
- [ ] A credit card carrying a balance shows as a *liability*, not a
      negative asset.
- [ ] The two donut charts show a proportional breakdown with the largest
      items listed below each.
- [ ] "Add Asset"/"Add Liability" — a new row appears and all three stat
      cards plus both charts update immediately.
- [ ] Edit and delete an entry — the row and totals update correctly.
- [ ] With nothing tracked, "Other Assets"/"Other Liabilities" show their
      own empty state while stat cards/charts show zero without erroring.

*Known limitation: point-in-time only, no historical trend over time.*

## Phase 28 — Import Data (CSV)

- [ ] "Import CSV" on Transactions opens the wizard.
- [ ] Choose an account, upload a `.csv` (or paste CSV text) — Continue
      moves to column mapping with sensible columns pre-guessed.
- [ ] Adjust a mapping — the preview marks rows with a valid date/amount as
      "Ready" and rows with a bad date/amount as "Error."
- [ ] "Import N transactions" shows a progress bar, then a completion
      screen with correct imported/failed counts.
- [ ] Imported transactions appear on the Transactions page with correct
      type, amount, category, and merchant/source; the account balance
      reflects all of them exactly as if entered by hand.
- [ ] A file with zero valid rows leaves the Import button disabled.

*Known limitations: income/expense only, no refund/adjustment/transfer from
CSV; a mid-import interruption isn't resumable, and re-running would create
duplicates.*

## Phase 29 — Export Data (CSV/PDF)

- [ ] "Export CSV" on Transactions downloads a file that opens cleanly in a
      spreadsheet app and reflects exactly the currently-filtered list —
      change filters first and confirm the export follows.
- [ ] "Export PDF" on Monthly or Yearly Summary matches what's on screen
      (figures, category breakdown, budget performance, biggest expense,
      transaction counts).
- [ ] Switching the selected month/year before exporting reflects that
      period in the PDF, not the originally-loaded one.

## Phase 30 — Audit & Data History

- [ ] Create a transaction — a "Created" entry appears on the Audit Log
      describing it correctly.
- [ ] Edit it (e.g. change amount or category) — an "Updated" entry's "View
      details" shows exactly the changed fields, old value vs. new, with
      unchanged fields not listed.
- [ ] Delete it — a "Deleted" entry shows the transaction as it was right
      before removal.
- [ ] A transfer's create/update/delete entries correctly name both
      accounts involved.
- [ ] No edit/delete action of any kind appears anywhere on the Audit Log
      page itself (fully read-only).

## Phase 31 — Security (Firestore Rules Review)

No new UI this phase — see "Before you start testing" above for the full
regression pass this phase requires. The thing to specifically watch for
across every feature is a browser-console **"Missing or insufficient
permissions"** error; if you see one anywhere, that's the finding to report,
including exactly which action triggered it.

## Phase 33 — Financial Calculation Engine Centralization

Pure internal refactor, no user-visible change — no dedicated scenarios
beyond the general regression coverage above. If any number anywhere looks
wrong compared to earlier testing, note it here.

## Phase 34 — Money Precision

- [ ] Create an expense/income/refund/adjustment/transfer with a decimal
      amount (e.g. ₹19.99) — it round-trips through editing without
      drifting.
- [ ] Create a budget or recurring rule from a Smart Suggestion — it lands
      on the exact suggested amount.
- [ ] Edit an account's opening balance or a credit card's limit — the
      correct decimal value pre-fills.
- [ ] The Min/Max amount filter on Transactions doesn't redisplay a typed
      value scaled up (typing "500" shouldn't become "50000").
- [ ] Export a transaction CSV — decimal rupee amounts, not raw integers.
- [ ] The CSV import preview shows correct decimal amounts before
      importing.
- [ ] Sum 50+ small transactions with odd decimal amounts — the total never
      drifts by even a paisa versus a calculator.

## Phase 35 — Notifications

- [ ] An existing over-budget/near-limit/debt-due condition produces a bell
      badge after signing in.
- [ ] Clicking a notification marks it read (badge count drops) and
      navigates to the right page.
- [ ] "Mark all as read" clears the badge.
- [ ] Deleting a notification removes it without navigating anywhere.
- [ ] Reloading the app doesn't duplicate an already-unread notification
      for the same condition.
- [ ] Mark one read, then reload while the underlying condition still
      holds — a fresh notification is produced.

*Known limitation: the bell popover shows only the 20 most recent
notifications, no dedicated notifications page or pagination.*

## Phase 36 — Settings

- [ ] Save a default budget period/thresholds — opening "Add Budget"
      pre-fills them.
- [ ] Save a default account (and, for Expense, a default category) —
      opening "Add Income"/"Add Expense" pre-selects it.
- [ ] Turn off a notification severity (e.g. "Positive") and trigger that
      condition again — no new bell notification appears, though the
      condition still shows on the Insights page.
- [ ] Turn the severity back on and reload while the condition still
      holds — a fresh notification is produced.
- [ ] The dark/light theme toggle is unaffected by anything on the Settings
      page (it's local-only, not synced to your account).

*Known limitation: at the time this phase shipped, Quick Add didn't yet use
these defaults — Phase 38 fixed that.*

## Phase 38 — Quick Add Transaction

- [ ] The "+" floating button is visible in the same spot on every page
      (Dashboard, Budgets, Reports, Transactions, etc.).
- [ ] Clicking it opens a dialog defaulted to Expense, with your saved
      default account/category (Phase 36) already selected, if set.
- [ ] Switching to Income swaps the category list to fixed income
      categories, defaulting to Salary.
- [ ] Submitting an expense/income closes the dialog, shows a success
      toast, and the new transaction immediately appears in the ledger,
      dashboard totals, and any budget it counts against.
- [ ] Leaving Account blank and submitting shows "Select an account"
      without closing the dialog.
- [ ] Cancel discards the form without creating anything.

*Known limitation: the "+" button also shows on the Transactions page,
which already has its own Add menu — a deliberate, accepted overlap.*

## Phase 39 — Dashboard Customization

- [ ] "Customize" on the Dashboard opens a dialog listing Active budgets,
      Recent transactions, and Spending by category, each with a checkbox
      and up/down arrows.
- [ ] Unchecking a widget and saving removes it from the dashboard
      immediately.
- [ ] Re-opening Customize still lists a hidden widget (unchecked, in its
      last position) so it can be brought back.
- [ ] Moving a widget up/down and saving changes its position on the
      dashboard.
- [ ] Unchecking all three widgets and saving shows an empty-state message
      with its own "Customize" button.
- [ ] Cancel discards any changes made in the dialog.
- [ ] The chosen layout survives a page reload and a full re-login (it's
      stored in your account, not just this browser).

## Phase 42 — Final Quality Review

This phase didn't add a user-facing feature — it re-ran the full
verification suite one more time across all 39 feature phases and looked
specifically for gaps the phase-by-phase process might have missed.

**Found and fixed during this review:**

- The Firestore composite index for `notifications` (`userId` +
  `createdAt`, the exact query Phase 35's bell popover runs) was missing
  from `firestore.indexes.json` — every other user-scoped, ordered
  collection had one, this one was overlooked when Phase 35 shipped. Fixed
  in this phase; make sure to redeploy indexes (see "Before you start
  testing" above) before testing the notification bell.
- An internal smoke-testing script used the wrong path for the Net Worth
  page (`/networth` instead of the real `/net-worth`) since Phase 27, so
  every prior phase's "zero console errors" automated check silently never
  actually loaded that page in this sandbox — it fell through to the 404
  page unnoticed, which also renders without errors. This is a testing-tool
  bug, not an app bug: Net Worth was still built, unit-tested, and
  presumably worked, but this is exactly why the manual scenarios in Phase
  27's section above matter — please pay a little extra attention there.

**Also confirmed clean this phase:** every collection used by the app's
services has a matching Firestore rule; `.env.example` matches every key
`.env` actually uses; no stray `console.log`/`debugger` statements or
leftover `TODO`/`FIXME` comments anywhere in `src/`; `npx tsc -b`,
`npx vitest run` (1113/1113 tests), `npx oxlint` (0 errors), and
`npm run build` are all clean; a corrected Playwright pass across all 21
routes (including the real `/net-worth` this time) plus the 404 page shows
zero console/page errors.

- [ ] After redeploying indexes, open the app while signed in with at least
      one unread-worthy condition (e.g. an over-budget budget) and confirm
      the notification bell populates without a console "requires an index"
      error.
- [ ] Visit Net Worth directly (not just via the sidebar link, to be sure)
      and work through its full Phase 27 checklist above for the first time
      against live data.

## Post-Phase-42 — Timezone / Date-Range Bug Fix

Found while working through this checklist against live data: a
transaction dated 1 Sep 2026 displayed correctly everywhere but was
silently excluded from "this month" totals (Dashboard, Transactions page
filter). Root cause was a timezone bug in how every calendar-date field
(transaction date, budget start/end, goal target date, debt dates,
receipt date, asset/liability "as of") round-tripped through Firestore —
see `PHASE_LOG.md`'s "Post-Phase-42" section for the full writeup. Fixed,
re-verified against live data, and the full suite (`tsc`/`vitest`
1113/1113/`oxlint`/`build`) is clean.

This shouldn't require anything from you — the fix is transparent — but
since it touches date handling everywhere, a little extra attention here
is worthwhile:

- [ ] Dashboard's "Expenses this month" / "Income this month" match what
      you'd expect by eye for the current calendar month, including any
      transaction dated on the 1st or the last day of the month.
- [ ] Transactions page → "This month" filter includes every transaction
      actually dated this month, with none dropped at either edge.
- [ ] A budget whose period covers today shows as active/on-track (Phase
      9/10) rather than missing from "Active budgets".
- [ ] Editing a transaction, budget, goal, debt, receipt, or net-worth
      asset/liability pre-fills its date picker with the exact date you
      set — not one day off in either direction.
- [ ] If you're not in India (IST), this is actually the more important
      timezone to test with, since IST-adjacent offsets were the ones
      already exercised live — please flag anything that looks off by a
      day.

Two small test records were intentionally left in the account for you to
delete at your convenience: a budget named "Timezone Fix Test" and a
savings goal named "TZ Fix Goal", both dated around Sep 2026.

## Post-Phase-42 — Full Application Bug Hunt

At your request ("go through the whole application and check for bugs and
fix them if there are any"), every feature area was reviewed and ten
issues were found and fixed — see `PHASE_LOG.md`'s matching section for
the full technical writeup of each. The full suite
(`tsc`/`vitest` 1124/1124/`oxlint`/`build`) is clean. Most of these are
either invisible in normal use or only matter in an edge case, so nothing
below is urgent — a few spot-checks when you have a few minutes are
enough:

- [ ] Recurring transactions/subscriptions still generate normally — open
      Recurring Transactions with at least one rule due, and confirm you
      don't see a duplicate transaction appear (this was a narrow race
      condition; hard to hit by hand, but worth a glance at your existing
      recurring rules for any duplicate-looking pair of transactions on
      the same date).
- [ ] If any budget has two line items pointed at the same category, its
      "spent" total should now be noticeably lower than before (it was
      double-counting that category).
- [ ] If you have a credit card account that's ever been in credit
      (positive balance, e.g. after an overpayment), check Net Worth —
      it should now count toward your assets instead of being ignored.
- [ ] Delete a savings goal or a debt that has contributions/payments
      recorded against it, then reload the page — the deletion should
      still work exactly as before (this only fixed data left behind
      afterward, not the visible behavior).
- [ ] Open the Audit Log for any transaction you edit or create today —
      the date shown should match the transaction's actual date.
- [ ] Add a receipt as normal — no visible change expected, but a failed
      upload can no longer leave an orphaned file behind.
- [ ] Try uploading a receipt file that's just over 5 MB — you should get
      the friendly "That file is larger than 5 MB" message either way, not
      a raw error.
- [ ] If you have a default account/category set in Settings → Preferences,
      try deleting that account or category, then open Quick Add or
      Transactions → Add — the field should come up blank (asking you to
      pick one) rather than showing something broken.
- [ ] Delete an account that has old transactions against it, then edit
      one of those transactions (e.g. fix its description) — it should
      save normally now instead of failing with "The selected account no
      longer exists."

---

## Reporting back

For anything that doesn't match what's described above, the most useful
report includes: the phase/section number, the exact steps you took, what
you expected, and what actually happened (a screenshot of any browser
console error is especially useful for permission/index errors). Everything
else — the "Known limitations" notes throughout — are deliberate,
documented simplifications, not bugs, so no need to report those unless one
surprises you in a way this document didn't warn about.
