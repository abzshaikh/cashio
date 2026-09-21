import { describe, expect, it } from 'vitest';
import { forgotPasswordSchema, loginSchema, profileSchema, registerSchema } from './authSchemas';

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anything',
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'anything',
      rememberMe: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
      rememberMe: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const base = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'Password1',
    confirmPassword: 'Password1',
  };

  it('accepts valid registration details', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a weak password (no uppercase)', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'password1',
      confirmPassword: 'password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a weak password (too short)', () => {
    const result = registerSchema.safeParse({
      ...base,
      password: 'Pw1',
      confirmPassword: 'Pw1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched password confirmation', () => {
    const result = registerSchema.safeParse({
      ...base,
      confirmPassword: 'Different1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('confirmPassword');
    }
  });

  it('requires first and last name', () => {
    expect(registerSchema.safeParse({ ...base, firstName: '' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, lastName: '' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('requires a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@example.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'nope' }).success).toBe(false);
  });
});

describe('profileSchema', () => {
  const base = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    photoURL: '',
    currency: 'INR',
    country: 'India',
    timezone: 'Asia/Kolkata',
  };

  it('accepts a valid profile with an empty photo URL', () => {
    expect(profileSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a valid absolute photo URL', () => {
    expect(
      profileSchema.safeParse({ ...base, photoURL: 'https://example.com/a.png' }).success,
    ).toBe(true);
  });

  it('rejects a malformed photo URL', () => {
    expect(profileSchema.safeParse({ ...base, photoURL: 'not-a-url' }).success).toBe(false);
  });

  it('requires currency/country/timezone', () => {
    expect(profileSchema.safeParse({ ...base, currency: '' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, country: '' }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, timezone: '' }).success).toBe(false);
  });
});
