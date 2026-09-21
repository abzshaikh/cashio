import type { TransactionType } from '../types/transaction';

/**
 * Display label + MUI Chip color for each transaction type — used by
 * `TransactionsPage`'s table and, since Phase 11, the dashboard's recent-
 * transactions list. Centralized here (rather than duplicated per page)
 * once a second consumer needed it.
 */
export const TRANSACTION_TYPE_CHIP_META: Record<
  TransactionType,
  { label: string; color: 'success' | 'error' | 'info' | 'warning' | 'default' }
> = {
  income: { label: 'Income', color: 'success' },
  expense: { label: 'Expense', color: 'error' },
  refund: { label: 'Refund', color: 'info' },
  adjustment: { label: 'Adjustment', color: 'warning' },
  transfer: { label: 'Transfer', color: 'default' },
};
