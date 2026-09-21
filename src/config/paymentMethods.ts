import type { PaymentMethod } from '../types/transaction';

export const paymentMethodMeta: Record<PaymentMethod, { label: string }> = {
  cash: { label: 'Cash' },
  debit_card: { label: 'Debit Card' },
  credit_card: { label: 'Credit Card' },
  upi: { label: 'UPI' },
  net_banking: { label: 'Net Banking' },
  wallet: { label: 'Wallet' },
  cheque: { label: 'Cheque' },
  other: { label: 'Other' },
};

export const paymentMethodOptions = (Object.keys(paymentMethodMeta) as PaymentMethod[]).map(
  (value) => ({ value, label: paymentMethodMeta[value].label }),
);
