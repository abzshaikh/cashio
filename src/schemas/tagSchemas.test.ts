import { describe, expect, it } from 'vitest';
import { tagFormSchema } from './tagSchemas';

const base = { name: 'Vacation', color: 'primary' as const };

describe('tagFormSchema', () => {
  it('accepts a valid tag', () => {
    expect(tagFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a name', () => {
    const result = tagFormSchema.safeParse({ ...base, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a name over 30 characters', () => {
    const result = tagFormSchema.safeParse({ ...base, name: 'x'.repeat(31) });
    expect(result.success).toBe(false);
  });

  it('rejects a color outside the fixed palette', () => {
    const result = tagFormSchema.safeParse({ ...base, color: 'chartreuse' });
    expect(result.success).toBe(false);
  });

  it('accepts every color in the fixed palette', () => {
    const colors = ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'];
    for (const color of colors) {
      expect(tagFormSchema.safeParse({ ...base, color }).success).toBe(true);
    }
  });
});
