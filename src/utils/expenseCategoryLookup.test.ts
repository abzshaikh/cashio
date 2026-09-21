import { describe, expect, it } from 'vitest';
import {
  getCategoryLabel,
  getSubcategoryLabel,
  getSubcategoryOptionsFor,
  toCategoryOptions,
} from './expenseCategoryLookup';
import type { ExpenseCategoryRecord } from '../types/category';

const categories: ExpenseCategoryRecord[] = [
  {
    id: 'cat-food',
    userId: 'user-1',
    slug: 'food',
    name: 'Food',
    isDefault: true,
    subcategories: [{ slug: 'restaurants', name: 'Restaurants' }],
    createdAt: '',
    updatedAt: '',
  },
];

describe('toCategoryOptions', () => {
  it('maps categories to FormSelect options keyed by slug', () => {
    expect(toCategoryOptions(categories)).toEqual([{ value: 'food', label: 'Food' }]);
  });
});

describe('getSubcategoryOptionsFor', () => {
  it("returns the matching category's subcategories as options", () => {
    expect(getSubcategoryOptionsFor(categories, 'food')).toEqual([
      { value: 'restaurants', label: 'Restaurants' },
    ]);
  });

  it('returns an empty list for an unknown category slug', () => {
    expect(getSubcategoryOptionsFor(categories, 'unknown')).toEqual([]);
  });
});

describe('getCategoryLabel', () => {
  it('returns the category name', () => {
    expect(getCategoryLabel(categories, 'food')).toBe('Food');
  });

  it('falls back to the raw slug when the category no longer exists', () => {
    expect(getCategoryLabel(categories, 'deleted_category')).toBe('deleted_category');
  });
});

describe('getSubcategoryLabel', () => {
  it('returns the subcategory name', () => {
    expect(getSubcategoryLabel(categories, 'food', 'restaurants')).toBe('Restaurants');
  });

  it('falls back to the raw slug when the subcategory no longer exists', () => {
    expect(getSubcategoryLabel(categories, 'food', 'deleted_sub')).toBe('deleted_sub');
  });
});
