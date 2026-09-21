import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csvParser';

describe('parseCsv', () => {
  it('parses a simple comma-separated grid', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('handles Windows-style CRLF line endings', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('drops a single trailing blank line from a trailing newline', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles a quoted field containing a comma', () => {
    expect(parseCsv('name,note\nRent,"Paid in full, on time"')).toEqual([
      ['name', 'note'],
      ['Rent', 'Paid in full, on time'],
    ]);
  });

  it('handles a quoted field containing an embedded newline', () => {
    expect(parseCsv('name,note\nRent,"Line one\nLine two"')).toEqual([
      ['name', 'note'],
      ['Rent', 'Line one\nLine two'],
    ]);
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    expect(parseCsv('name,note\nRent,"She said ""hi"""')).toEqual([
      ['name', 'note'],
      ['Rent', 'She said "hi"'],
    ]);
  });

  it('preserves an empty field between two commas', () => {
    expect(parseCsv('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('parses a single row with no trailing newline', () => {
    expect(parseCsv('a,b,c')).toEqual([['a', 'b', 'c']]);
  });

  it('handles a single-column file', () => {
    expect(parseCsv('header\nvalue1\nvalue2')).toEqual([['header'], ['value1'], ['value2']]);
  });
});

describe('toCsv', () => {
  it('joins plain fields with commas and rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 'b', 'c'],
        ['1', '2', '3'],
      ]),
    ).toBe('a,b,c\r\n1,2,3');
  });

  it('quotes a field containing a comma', () => {
    expect(toCsv([['Rent', 'Paid in full, on time']])).toBe('Rent,"Paid in full, on time"');
  });

  it('quotes a field containing a newline', () => {
    expect(toCsv([['Rent', 'Line one\nLine two']])).toBe('Rent,"Line one\nLine two"');
  });

  it('escapes an embedded quote by doubling it', () => {
    expect(toCsv([['Rent', 'She said "hi"']])).toBe('Rent,"She said ""hi"""');
  });

  it('leaves a plain field unquoted', () => {
    expect(toCsv([['Food', '450']])).toBe('Food,450');
  });

  it('round-trips through parseCsv', () => {
    const original = [
      ['Date', 'Note'],
      ['2026-03-15', 'Paid in full, on time'],
      ['2026-03-16', 'She said "hi" today'],
    ];
    expect(parseCsv(toCsv(original))).toEqual(original);
  });
});
