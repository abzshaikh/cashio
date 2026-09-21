/**
 * The 9 default expense categories and their subcategories, copied
 * verbatim from the product spec. `categoryService.ts`'s
 * `ensureDefaultExpenseCategories` seeds these into Firestore for every
 * user the first time they open the Categories section — this file itself
 * holds no per-user data, just the static list to seed from.
 */
export interface DefaultExpenseCategorySeed {
  name: string;
  subcategories: readonly string[];
}

export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultExpenseCategorySeed[] = [
  {
    name: 'Housing',
    subcategories: ['Rent', 'Mortgage', 'Maintenance', 'Electricity', 'Water', 'Gas', 'Internet'],
  },
  {
    name: 'Food',
    subcategories: ['Groceries', 'Restaurants', 'Takeaway', 'Coffee', 'Delivery'],
  },
  {
    name: 'Transportation',
    subcategories: ['Fuel', 'Public Transport', 'Taxi', 'Parking', 'Maintenance'],
  },
  {
    name: 'Shopping',
    subcategories: ['Clothing', 'Electronics', 'Household', 'Personal Care'],
  },
  {
    name: 'Health',
    subcategories: ['Medicine', 'Doctor', 'Insurance'],
  },
  {
    name: 'Entertainment',
    subcategories: ['Movies', 'Games', 'Subscriptions', 'Events'],
  },
  {
    name: 'Education',
    subcategories: ['Courses', 'Books', 'Tuition'],
  },
  {
    name: 'Financial',
    subcategories: ['Bank Fees', 'Interest', 'Investments'],
  },
  {
    name: 'Other',
    subcategories: [],
  },
];
