export interface CurrencyOption {
  code: string;
  label: string;
  symbol: string;
}

/**
 * A curated set of commonly used currencies rather than the full ISO 4217
 * list — keeps the picker usable. INR is first/default per the product
 * requirements; add more here as users need them.
 */
export const currencyOptions: CurrencyOption[] = [
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$' },
];

export const DEFAULT_CURRENCY_CODE = 'INR';
