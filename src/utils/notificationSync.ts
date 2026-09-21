import type { Insight } from './insightsEngine';
import type { AppNotification, NewNotificationInput } from '../types/notification';

/**
 * Phase 35: turns the current, freshly-recomputed `Insight[]` (Phase 24's
 * rule engine — see `insightsEngine.ts`) into the notifications that should
 * be newly created this session, given the notifications that already
 * exist. Pure and side-effect-free on purpose, same "calculations in utils,
 * I/O in services" split every other feature in this app already keeps
 * (`budgetCalculations.ts` vs `budgetService.ts`, etc.) — `notificationService.ts`
 * is the only thing that actually writes.
 *
 * **The dedup rule:** an insight is only turned into a new notification if
 * there is no existing notification with the same `sourceKey` that is still
 * `read: false`. Insights are recomputed fresh on every load (an ongoing
 * condition like "Food spending is up 30%" reappears every session for as
 * long as it's true), so deduping on "any notification ever created for
 * this sourceKey" would mean a monthly-recurring condition (e.g. a category
 * spike, which is naturally a new comparison every month) only ever
 * notifies once, permanently, the very first time it's seen. Deduping on
 * "any *unread* notification" instead means: while an alert sits
 * unacknowledged in the bell, it isn't duplicated every time the app
 * reloads — but once the user marks it read (acknowledging it), a fresh
 * occurrence of the same underlying condition is worth surfacing again.
 * This also naturally self-heals a condition that resolves and later
 * recurs (e.g. a budget dips under its warning threshold, then goes back
 * over) without any extra "is this insight still active" bookkeeping.
 *
 * Not attempted here: pruning old, read notifications, or capping how many
 * accumulate over a long-lived account — accepted as a known limitation
 * (see PHASE_LOG.md's Phase 35 section) the same way earlier phases have
 * documented similar scope boundaries rather than half-solving them.
 */
export function selectNewNotifications(
  insights: Insight[],
  existingNotifications: AppNotification[],
): NewNotificationInput[] {
  const unreadSourceKeys = new Set(
    existingNotifications.filter((n) => !n.read).map((n) => n.sourceKey),
  );
  return insights
    .filter((insight) => !unreadSourceKeys.has(insight.id))
    .map((insight) => ({
      sourceKey: insight.id,
      severity: insight.severity,
      title: insight.title,
      message: insight.description,
      actionLabel: insight.actionLabel ?? null,
      actionPath: insight.actionPath ?? null,
    }));
}
