/**
 * A receipt (Phase 19) — a photo or PDF of a purchase, optionally linked to
 * an existing transaction in the ledger. `merchant`/`amount`/`date` are
 * entered by the user, not extracted from the file: per the proposed data
 * model's own note ("architecture leaves room for OCR fields without
 * requiring them now"), this phase deliberately does NOT implement OCR —
 * that would mean a client-side OCR library or a cloud vision API call,
 * neither of which this phase needs in order to deliver real value (a
 * place to keep receipts, searchable by merchant/date/amount, optionally
 * tied to the transaction they support). Adding real `ocrText`/
 * `ocrConfidence` fields later requires no migration — every existing
 * document simply has neither.
 *
 * `transactionId` points the other way from every other cross-reference in
 * this app so far (a `GoalContribution` points at its `goalId`, a
 * `DebtPayment` at its `debtId`) — same shape, just modeling "this receipt
 * supports that transaction" rather than "this transaction owns this
 * receipt." `null` means the receipt hasn't been tied to a ledger entry
 * (or never will be — a receipt can exist standalone, e.g. for tax records
 * or a purchase not otherwise tracked).
 *
 * The file itself lives in Firebase Storage (see `services/receiptService.ts`'s
 * `uploadReceiptFile` and the new `storage.rules`), not Firestore —
 * `storagePath`/`downloadUrl`/`fileName`/`fileType`/`fileSize` are metadata
 * about that file, captured once at upload time and never changed after
 * (see `UpdatableReceiptFields` below): replacing a receipt's file means
 * deleting the receipt and adding a new one, the same "no update, just
 * create/delete" scope Phase 16/17 chose for their own child records —
 * here applied to the file specifically, while the rest of a receipt's
 * fields (merchant/amount/date/notes/linked transaction) remain freely
 * editable, unlike a `GoalContribution`/`DebtPayment`.
 */
export interface Receipt {
  id: string;
  userId: string;
  merchant: string;
  amount: number;
  /** ISO date string — the date on the receipt, not the upload date. */
  date: string;
  notes: string;
  transactionId: string | null;
  /** Firebase Storage path, e.g. `receipts/{userId}/{timestamp}-{filename}` —
   * needed to delete the underlying file later (`getDownloadURL` alone
   * doesn't let you delete an object). */
  storagePath: string;
  /** Public download URL, safe to use directly in an `<img>`/link. */
  downloadUrl: string;
  fileName: string;
  /** MIME type, e.g. `image/jpeg` or `application/pdf` — used to decide
   * whether to render a thumbnail or a generic file icon. */
  fileType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export type NewReceiptInput = Pick<
  Receipt,
  | 'merchant'
  | 'amount'
  | 'notes'
  | 'transactionId'
  | 'storagePath'
  | 'downloadUrl'
  | 'fileName'
  | 'fileType'
  | 'fileSize'
> & { date: Date };

/** Everything except the file itself can be edited freely, including
 * `transactionId` — a receipt can be linked or unlinked after the fact;
 * only the file metadata (set once at upload) is fixed. */
export type UpdatableReceiptFields = Pick<Receipt, 'merchant' | 'amount' | 'notes' | 'transactionId'> & {
  date: Date;
};
