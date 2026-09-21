import { describe, expect, it } from 'vitest';
import { getTagColor, getTagLabel, toTagOptions } from './tagLookup';
import type { Tag } from '../types/tag';

const vacation: Tag = {
  id: 't1',
  userId: 'user-1',
  slug: 'vacation',
  name: 'Vacation',
  color: 'primary',
  createdAt: '',
  updatedAt: '',
};

const business: Tag = {
  id: 't2',
  userId: 'user-1',
  slug: 'business',
  name: 'Business',
  color: 'success',
  createdAt: '',
  updatedAt: '',
};

const tags = [vacation, business];

describe('toTagOptions', () => {
  it('maps each tag to a {value, label, color} option keyed by slug', () => {
    expect(toTagOptions(tags)).toEqual([
      { value: 'vacation', label: 'Vacation', color: 'primary' },
      { value: 'business', label: 'Business', color: 'success' },
    ]);
  });
});

describe('getTagLabel', () => {
  it('returns the current name for a known slug', () => {
    expect(getTagLabel(tags, 'vacation')).toBe('Vacation');
  });

  it('falls back to the raw slug for an unknown (e.g. deleted) tag', () => {
    expect(getTagLabel(tags, 'deleted_tag')).toBe('deleted_tag');
  });
});

describe('getTagColor', () => {
  it('returns the current color for a known slug', () => {
    expect(getTagColor(tags, 'business')).toBe('success');
  });

  it('falls back to "default" for an unknown (e.g. deleted) tag', () => {
    expect(getTagColor(tags, 'deleted_tag')).toBe('default');
  });
});
