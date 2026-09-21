/**
 * A persisted, cross-session notification (Phase 35) — the durable
 * "mark as read"/badge/history layer Phase 24's Insights engine explicitly
 * deferred to this phase (see PHASE_LOG.md's Phase 24 known limitations).
 * `generateInsights` (`utils/insightsEngine.ts`) still owns every actual
 * rule — this collection never re-derives "is this budget over its limit,"
 * it just durably records that a given rule-based condition fired, so the
 * bell icon can show an unread count and a history that survives a reload.
 *
 * `sourceKey` mirrors the originating `Insight.id` exactly (e.g.
 * `budget-over-${budget.id}`) — see `utils/notificationSync.ts` for how
 * it's used to avoid re-notifying about a condition the user hasn't
 * dismissed yet, while still allowing a fresh alert once they have.
 *
 * `severity` reuses the same four values as `InsightSeverity`
 * (`utils/insightsEngine.ts`) — declared independently here rather than
 * imported, the same "types don't reach into utils" boundary every other
 * type file in this app already keeps, but structurally identical so an
 * `Insight` converts to a `NewNotificationInput` with no casting.
 */
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface AppNotification {
  id: string;
  userId: string;
  /** The originating `Insight.id` this notification was created from —
   * see `utils/notificationSync.ts`'s dedup rule. */
  sourceKey: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** Both present together or both `null` — mirrors `Insight`'s own
   * optional `actionLabel`/`actionPath` pair. */
  actionLabel: string | null;
  actionPath: string | null;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewNotificationInput = Pick<
  AppNotification,
  'sourceKey' | 'severity' | 'title' | 'message' | 'actionLabel' | 'actionPath'
>;
