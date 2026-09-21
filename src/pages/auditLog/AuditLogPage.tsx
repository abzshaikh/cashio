import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import { PageHeader } from '../../components/common/PageHeader';
import { ErrorState } from '../../components/common/ErrorState';
import { DataTable, type DataTableColumn } from '../../components/common/DataTable';
import { AuditLogDetailsDialog } from '../../components/auditLog/AuditLogDetailsDialog';
import { useAuth } from '../../context/AuthContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { subscribeToAuditLogs } from '../../services/auditLogService';
import { AUDIT_ACTION_META, describeTransactionSnapshot } from '../../utils/auditLogFormatting';
import { formatDateTime } from '../../utils/formatDate';
import type { AuditLogEntry } from '../../types/auditLog';

/**
 * Phase 30's audit trail viewer. Read-only by design (see
 * `services/auditLogService.ts` and the `auditLogs` block in
 * `firestore.rules` — neither exposes any way to edit or delete an entry),
 * so unlike most list pages here there's no create/edit dialog, only a
 * "View details" action opening `AuditLogDetailsDialog`.
 *
 * Given a nav item (unlike Phase 28's one-off `ImportPage`) because a
 * history trail is exactly the kind of page a user comes back to — "what
 * changed, and when" — rather than a single workflow reached once from a
 * button.
 */
export function AuditLogPage() {
  const { user } = useAuth();
  const { accounts } = useAccounts();
  const { categories } = useExpenseCategories();

  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    setEntries(null);
    setLoadError(null);
    return subscribeToAuditLogs(user.uid, setEntries, setLoadError);
    // reloadKey lets the "Try again" button force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const accountsById = useMemo(
    () => Object.fromEntries((accounts ?? []).map((a) => [a.id, a])),
    [accounts],
  );

  const ctx = useMemo(
    () => ({ accountsById, categories: categories ?? [] }),
    [accountsById, categories],
  );

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      id: 'timestamp',
      header: 'When',
      accessor: (row) => row.timestamp,
      sortable: true,
      render: (row) => formatDateTime(row.timestamp),
    },
    {
      id: 'action',
      header: 'Action',
      render: (row) => (
        <Chip
          label={AUDIT_ACTION_META[row.action].label}
          size="small"
          color={AUDIT_ACTION_META[row.action].color}
          variant="outlined"
        />
      ),
    },
    {
      id: 'summary',
      header: 'Transaction',
      render: (row) => describeTransactionSnapshot(row.newValue ?? row.previousValue, ctx),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button size="small" onClick={() => setSelectedEntry(row)}>
          View details
        </Button>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Audit Log"
        subtitle="A read-only history of every transaction created, edited, or deleted — nothing here can be changed or removed."
      />

      {loadError && (
        <ErrorState description={loadError.message} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loadError && (
        <DataTable
          columns={columns}
          rows={entries ?? []}
          getRowId={(row) => row.id}
          loading={entries === null}
          emptyTitle="No history yet"
          emptyDescription="Every transaction you create, edit, or delete will show up here."
        />
      )}

      <AuditLogDetailsDialog
        open={selectedEntry !== null}
        entry={selectedEntry}
        ctx={ctx}
        onClose={() => setSelectedEntry(null)}
      />
    </Box>
  );
}
