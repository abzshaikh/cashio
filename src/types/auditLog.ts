/**
 * Phase 30's audit trail — the `auditLogs` collection the proposed schema
 * at the top of PHASE_LOG.md named from the very start ("userId, action,
 * entity, entityId, previousValue, newValue, timestamp"). Scoped to
 * `transaction` entities only for this phase: transactions are the one
 * kind of record where "what did this used to say, and when did it
 * change" actually matters for a budget app (account balances derive from
 * them, Rule 6 already requires reversing/reapplying their effect
 * correctly on edit/delete) — `entity` is still a plain string rather than
 * a single-value union so a later phase can start logging another
 * collection without a breaking schema change here.
 *
 * An entry is written by `transactionService.ts` inside the exact same
 * Firestore transaction that writes the change it describes (see
 * `services/auditLogService.ts`'s `buildAuditLogWrite`), so the log can
 * never drift out of sync with the ledger the way a separate, unguarded
 * write could.
 */
export const AUDIT_ACTIONS = ['create', 'update', 'delete'] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Not yet a closed union — see the file doc comment above. `transaction`
 * is the only value any phase through 30 ever writes. */
export type AuditEntity = string;

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  /** A plain-JSON snapshot of the entity's meaningful fields before the
   * change — `null` for a `create` entry, since there was no "before". */
  previousValue: Record<string, unknown> | null;
  /** Same idea, after the change — `null` for a `delete` entry, since
   * there's no "after". */
  newValue: Record<string, unknown> | null;
  timestamp: string;
}
