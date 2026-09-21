import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slugify';

describe('slugify', () => {
  it('lowercases and joins words with underscores', () => {
    expect(slugify('Personal Care')).toBe('personal_care');
    expect(slugify('Public Transport')).toBe('public_transport');
  });

  it('reproduces every Phase 5 fixed-enum slug from its label', () => {
    // These are the exact values the old fixed EXPENSE_CATEGORIES/
    // EXPENSE_SUBCATEGORIES enums used — Phase 6's seeding relies on this
    // to keep every pre-existing expense transaction's category resolving
    // correctly with no migration.
    expect(slugify('Housing')).toBe('housing');
    expect(slugify('Bank Fees')).toBe('bank_fees');
    expect(slugify('Other')).toBe('other');
  });

  it('strips punctuation and collapses repeated separators', () => {
    expect(slugify("Kids' Stuff!!")).toBe('kids_stuff');
    expect(slugify('  Pet -- Care  ')).toBe('pet_care');
  });

  it('trims leading and trailing underscores', () => {
    expect(slugify('__weird__')).toBe('weird');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it does not collide', () => {
    expect(uniqueSlug('pet_care', ['food', 'housing'])).toBe('pet_care');
  });

  it('appends a numeric suffix on collision', () => {
    expect(uniqueSlug('food', ['food'])).toBe('food_2');
  });

  it('finds the first free suffix when multiple already exist', () => {
    expect(uniqueSlug('food', ['food', 'food_2', 'food_3'])).toBe('food_4');
  });
});
