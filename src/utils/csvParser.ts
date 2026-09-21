/**
 * Minimal dependency-free RFC-4180-ish CSV reader/writer (Phase 28's
 * `parseCsv`, Phase 29's `toCsv`). No CSV library is installed
 * (`package.json` had no "papa"/"csv" dependency before Phase 28, and
 * still doesn't) — this app's established convention is to hand-roll
 * small, thoroughly unit-tested utils for a contained need rather than
 * pull in a library for it, see `formatCurrency.ts`, `slugify.ts`.
 * Reading and writing a CSV string is squarely that kind of need, and
 * keeping both directions in one file makes the round trip (`toCsv` then
 * `parseCsv`, exercised by this file's own test) easy to keep honest.
 *
 * `parseCsv` handles: quoted fields (so a field can contain a comma or a
 * newline), escaped quotes inside a quoted field (`""` -> `"`), and both
 * `\n` and `\r\n` line endings. Returns every row it finds, including the
 * header row if the CSV has one — callers decide whether row 0 is a
 * header.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < n) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      pushField();
      i += 1;
      continue;
    }
    if (char === '\r') {
      // Swallowed unconditionally — a lone `\r` (old Mac line endings) is
      // treated the same as the `\r` in `\r\n`, since neither should end
      // up as literal content in a field.
      i += 1;
      continue;
    }
    if (char === '\n') {
      pushRow();
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  // Flush a final field/row for input that doesn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Drop a trailing fully-blank row — the near-universal case of a CSV
  // file ending with a newline would otherwise show up as one extra empty
  // row after the real data.
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === '') {
      rows.pop();
    }
  }

  return rows;
}

/**
 * Serializes a plain string grid back into CSV text — the write side of
 * `parseCsv`, used by Phase 29's exports (transactions, and anywhere else
 * that needs a downloadable CSV). A field is quoted only when it actually
 * needs it (contains a comma, a quote, or a newline); an embedded quote is
 * escaped by doubling it, per RFC 4180. Rows are joined with `\r\n`,
 * matching Excel's own CSV export convention (importantly, `parseCsv`
 * already treats `\r\n` and `\n` interchangeably, so this stays a lossless
 * round trip either way).
 */
export function toCsv(rows: readonly (readonly string[])[]): string {
  const escapeField = (field: string): string => {
    if (/[",\r\n]/.test(field)) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}
