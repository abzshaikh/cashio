import { describe, expect, it } from 'vitest';
import { categoryFormSchema, subcategoryFormSchema } from './categorySchemas';

describe('categoryFormSchema', () => {
  it('accepts a non-blank name', () => {
    expect(categoryFormSchema.safeParse({ name: 'Pet Care' }).success).toBe(true);
  });

  it('rejects a blank name', () => {
    expect(categoryFormSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects a name over 60 characters', () => {
    expect(categoryFormSchema.safeParse({ name: 'a'.repeat(61) }).success).toBe(false);
  });
});

describe('subcategoryFormSchema', () => {
  it('accepts a non-blank name', () => {
    expect(subcategoryFormSchema.safeParse({ name: 'Vet Visits' }).success).toBe(true);
  });

  it('rejects a blank name', () => {
    expect(subcategoryFormSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
