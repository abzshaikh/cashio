import { describe, expect, it } from 'vitest';
import { moneyAmountSchema } from './moneySchemas';

describe('moneyAmountSchema', () => {
  const schema = moneyAmountSchema();

  it('accepts an ordinary positive amount', () => {
    expect(schema.safeParse(19.99).success).toBe(true);
  });

  it('rejects zero and negative amounts', () => {
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(-5).success).toBe(false);
  });

  it('rejects a positive amount that rounds to 0 minor units', () => {
    // 0.004 rupees rounds to 0 paise via `toMinorUnits` — `firestore.rules`
    // requires the stored minor-unit amount be > 0, so this must be caught
    // here with a clear message rather than surfacing as a Firestore
    // permission error after the form already "succeeded".
    const result = schema.safeParse(0.004);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('too small');
    }
  });

  it('accepts the smallest amount that survives rounding to a minor unit', () => {
    expect(schema.safeParse(0.01).success).toBe(true);
  });

  it('uses the "Value" noun in its message when asked', () => {
    const valueSchema = moneyAmountSchema('Value');
    const result = valueSchema.safeParse(0);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Value');
    }
  });
});
