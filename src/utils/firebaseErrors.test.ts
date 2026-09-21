import { describe, expect, it } from 'vitest';
import { FirebaseError } from 'firebase/app';
import { getAuthErrorMessage } from './firebaseErrors';

function makeFirebaseError(code: string) {
  return new FirebaseError(code, `Simulated ${code}`);
}

describe('getAuthErrorMessage', () => {
  it('maps invalid-credential to a generic incorrect-login message', () => {
    expect(getAuthErrorMessage(makeFirebaseError('auth/invalid-credential'))).toBe(
      'Incorrect email or password.',
    );
  });

  it('maps email-already-in-use', () => {
    expect(getAuthErrorMessage(makeFirebaseError('auth/email-already-in-use'))).toMatch(
      /already exists/,
    );
  });

  it('falls back to a generic message for unknown Firebase error codes', () => {
    expect(getAuthErrorMessage(makeFirebaseError('auth/some-new-code'))).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('uses a plain Error message when not a FirebaseError', () => {
    expect(getAuthErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back for non-Error values', () => {
    expect(getAuthErrorMessage('nope')).toBe('Something went wrong. Please try again.');
  });
});
