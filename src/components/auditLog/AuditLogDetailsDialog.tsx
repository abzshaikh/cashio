import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {
  AUDIT_ACTION_META,
  describeTransactionSnapshot,
  getSnapshotFieldDiffs,
  type AuditLookupContext,
} from '../../utils/auditLogFormatting';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { getCategoryLabel } from '../../utils/expenseCategoryLookup';
import { incomeCategoryMeta } from '../../config/incomeCategories';
import type { AuditLogEntry } from '../../types/auditLog';
import type { IncomeCategory } from '../../types/transaction';

interface AuditLogDetailsDialogProps {
  open: boolean;
  entry: AuditLogEntry | null;
  ctx: AuditLookupContext;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  type: 'Type',
  amount: 'Amount',
  date: 'Date',
  accountId: 'Account',
  fromAccountId: 'From account',
  toAccountId: 'To account',
  category: 'Category',
  subcategory: 'Subcategory',
  merchant: 'Merchant',
  description: 'Description',
  notes: 'Notes',
  tags: 'Tags',
  reason: 'Reason',
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

/**
 * Prettifies one side of a field diff for display. Falls back gracefully
 * (raw id/slug, or a JSON-ish string) rather than throwing when a value
 * doesn't have the shape a given field normally has — an audit entry can
 * be old enough that a category or account no longer exists, and this
 * dialog should never break because of it.
 */
function formatDiffValue(field: string, value: unknown, ctx: AuditLookupContext): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'amount' && typeof value === 'number') {
    return formatCurrency(value, { currency: ctx.currency });
  }
  if (field === 'date') return formatDateTime(value);
  if ((field === 'accountId' || field === 'fromAccountId' || field === 'toAccountId') && typeof value === 'string') {
    return ctx.accountsById[value]?.name ?? value;
  }
  if (field === 'category' && typeof value === 'string') {
    const expenseLabel = getCategoryLabel(ctx.categories, value);
    if (expenseLabel !== value) return expenseLabel;
    const incomeLabel = incomeCategoryMeta[value as IncomeCategory]?.label;
    return incomeLabel ?? value;
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/**
 * Read-only dialog opened from a "View details" action on an audit log
 * row (`AuditLogPage`). A `create`/`delete` entry only ever has one side
 * populated, so it just describes that snapshot in one line; an `update`
 * entry shows a field-by-field before/after table via
 * `getSnapshotFieldDiffs`, since that's the useful question for an edit —
 * not the full new snapshot, but specifically what changed.
 */
export function AuditLogDetailsDialog({ open, entry, ctx, onClose }: AuditLogDetailsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && entry && <DetailsContent entry={entry} ctx={ctx} onClose={onClose} />}
    </Dialog>
  );
}

interface DetailsContentProps {
  entry: AuditLogEntry;
  ctx: AuditLookupContext;
  onClose: () => void;
}

function DetailsContent({ entry, ctx, onClose }: DetailsContentProps) {
  const actionMeta = AUDIT_ACTION_META[entry.action];
  const diffs = entry.action === 'update' ? getSnapshotFieldDiffs(entry.previousValue, entry.newValue) : [];

  return (
    <>
      <DialogTitle>{actionMeta.label} transaction</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {formatDateTime(entry.timestamp)}
          </Typography>

          {entry.action === 'create' && (
            <Typography variant="body1">
              {describeTransactionSnapshot(entry.newValue, ctx)}
            </Typography>
          )}

          {entry.action === 'delete' && (
            <Typography variant="body1">
              {describeTransactionSnapshot(entry.previousValue, ctx)}
            </Typography>
          )}

          {entry.action === 'update' &&
            (diffs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No field changes were recorded for this update.
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Before</TableCell>
                    <TableCell>After</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {diffs.map((diff) => (
                    <TableRow key={diff.field}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fieldLabel(diff.field)}
                      </TableCell>
                      <TableCell>{formatDiffValue(diff.field, diff.before, ctx)}</TableCell>
                      <TableCell>{formatDiffValue(diff.field, diff.after, ctx)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </>
  );
}
