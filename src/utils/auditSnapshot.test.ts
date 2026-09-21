import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { serializeTransactionSnapshot } from './auditSnapshot';

describe('serializeTransactionSnapshot', () => {
  it('drops userId, createdAt, and updatedAt', () => {
    const snapshot = serializeTransactionSnapshot({
      userId: 'user-1',
      createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-02T00:00:00.000Z')),
      type: 'expense',
      amount: 450,
    });
    expect(snapshot).toEqual({ type: 'expense', amount: 450 });
  });

  it('converts a Firestore Timestamp date field to a local calendar-date string', () => {
    const snapshot = serializeTransactionSnapshot({
      type: 'expense',
      date: Timestamp.fromDate(new Date(2026, 2, 15)),
    });
    expect(snapshot.date).toBe('2026-03-15');
  });

  it('converts a plain Date date field the same way', () => {
    const snapshot = serializeTransactionSnapshot({
      date: new Date(2026, 2, 15),
    });
    expect(snapshot.date).toBe('2026-03-15');
  });

  it('keeps every other field as-is', () => {
    const snapshot = serializeTransactionSnapshot({
      type: 'transfer',
      amount: 300,
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      tags: ['vacation'],
      description: '',
    });
    expect(snapshot).toEqual({
      type: 'transfer',
      amount: 300,
      fromAccountId: 'acc-1',
      toAccountId: 'acc-2',
      tags: ['vacation'],
      description: '',
    });
  });

  it('sets date to null when it is missing or unparsable', () => {
    expect(serializeTransactionSnapshot({ date: null }).date).toBeNull();
    expect(serializeTransactionSnapshot({ date: 'not-a-date' }).date).toBeNull();
  });
});
