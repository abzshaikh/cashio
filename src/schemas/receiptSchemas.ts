import { z } from 'zod';
import { moneyAmountSchema } from './moneySchemas';

/**
 * Deliberately does NOT include the file itself — see `types/receipt.ts`'s
 * doc comment for why a receipt's file is immutable once uploaded.
 * `ReceiptFormDialog` manages the selected `File` as separate component
 * state (native file inputs are inherently uncontrolled, and there's
 * nothing to validate with Zod's coercion here that a plain size/type
 * check in the dialog doesn't already handle more simply) and validates it
 * itself before calling `onSubmit`. `transactionId` uses `''` as the
 * "no linked transaction" sentinel, the same convention
 * `ExpenseFormDialog`'s optional subcategory select already uses.
 */
export const receiptFormSchema = z.object({
  merchant: z.string().min(1, 'Enter a merchant name').max(120),
  amount: moneyAmountSchema(),
  date: z.date({ error: 'Select a date' }),
  notes: z.string().max(500),
  transactionId: z.string(),
});
export type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

export const defaultReceiptFormValues: ReceiptFormValues = {
  merchant: '',
  amount: 0,
  date: new Date(),
  notes: '',
  transactionId: '',
};

/** Accepted receipt file types and the size cap `ReceiptFormDialog`
 * enforces before ever calling Storage — a judgment call (5 MB comfortably
 * covers a photographed or scanned receipt) chosen to keep this personal
 * app's Storage usage modest by default. */
export const RECEIPT_ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const RECEIPT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
