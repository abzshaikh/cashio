import type { IncomeCategory } from '../types/transaction';

export const incomeCategoryMeta: Record<IncomeCategory, { label: string }> = {
  salary: { label: 'Salary' },
  freelance_income: { label: 'Freelance Income' },
  business_income: { label: 'Business Income' },
  interest: { label: 'Interest' },
  rental_income: { label: 'Rental Income' },
  bonus: { label: 'Bonus' },
  gift: { label: 'Gift' },
  refund: { label: 'Refund' },
  other_income: { label: 'Other Income' },
};

export const incomeCategoryOptions = (Object.keys(incomeCategoryMeta) as IncomeCategory[]).map(
  (value) => ({ value, label: incomeCategoryMeta[value].label }),
);
