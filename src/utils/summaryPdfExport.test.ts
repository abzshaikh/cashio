import { describe, expect, it, vi, afterEach } from 'vitest';
import { jsPDF } from 'jspdf';
import { buildSummaryPdf, downloadSummaryPdf, type SummaryPdfInput } from './summaryPdfExport';

// jsPDF (v4) assigns its API methods as own instance properties rather
// than prototype methods, and its exported `jsPDF` isn't reliably usable
// with `instanceof`/`vi.spyOn(Class.prototype, ...)` under Vitest's
// module interop — so this test replaces it with a small class that
// behaves the normal, spy-able way, and asserts `buildSummaryPdf`/
// `downloadSummaryPdf` call the right methods with the right arguments,
// rather than trying to inspect a real rendered PDF's binary content.
vi.mock('jspdf', () => {
  class MockJsPDF {
    text(..._args: unknown[]) {}
    setFontSize(..._args: unknown[]) {}
    setFont(..._args: unknown[]) {}
    addPage(..._args: unknown[]) {}
    save(..._args: unknown[]) {}
  }
  return { jsPDF: MockJsPDF };
});

const baseInput: SummaryPdfInput = {
  title: 'Monthly Summary',
  periodLabel: 'March 2026',
  currency: 'INR',
  income: 50000,
  expense: 30000,
  net: 20000,
  savingsRate: 0.4,
  categorySpend: [{ label: 'Food', amount: 12000 }],
  budgets: [{ name: 'Overall Budget', actual: 30000, total: 40000, statusLabel: 'On track' }],
  biggestExpense: { amount: 8000, payee: 'Rent', date: '1 Mar 2026', category: 'Housing' },
  transactionCounts: [{ label: 'Expense', count: 12 }],
  totalTransactionCount: 15,
};

describe('buildSummaryPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a jsPDF document', () => {
    const doc = buildSummaryPdf(baseInput);
    expect(doc).toBeInstanceOf(jsPDF);
  });

  it('writes the title, period, and headline figures', () => {
    const textSpy = vi.spyOn(jsPDF.prototype, 'text');
    buildSummaryPdf(baseInput);
    const written = textSpy.mock.calls.map((call) => call[0]);
    expect(written).toContain('Monthly Summary');
    expect(written).toContain('March 2026');
    expect(written.some((t) => String(t).includes('Income'))).toBe(true);
    expect(written.some((t) => String(t).includes('Food'))).toBe(true);
    expect(written.some((t) => String(t).includes('Overall Budget'))).toBe(true);
    expect(written.some((t) => String(t).includes('Rent'))).toBe(true);
  });

  it('shows an empty-period message when there is nothing to report', () => {
    const textSpy = vi.spyOn(jsPDF.prototype, 'text');
    buildSummaryPdf({
      ...baseInput,
      categorySpend: [],
      budgets: [],
      biggestExpense: null,
      transactionCounts: [],
      totalTransactionCount: 0,
    });
    const written = textSpy.mock.calls.map((call) => String(call[0]));
    expect(written.filter((t) => t === 'No expenses recorded for this period.')).toHaveLength(2);
    expect(written).toContain('No budgets cover this period.');
    expect(written).toContain('No transactions recorded for this period.');
  });

  it('shows a dash for a null savings rate', () => {
    const textSpy = vi.spyOn(jsPDF.prototype, 'text');
    buildSummaryPdf({ ...baseInput, savingsRate: null });
    const written = textSpy.mock.calls.map((call) => String(call[0]));
    expect(written.some((t) => t.includes('Savings rate: —'))).toBe(true);
  });

  it('starts a new page once content overflows the first page', () => {
    const addPageSpy = vi.spyOn(jsPDF.prototype, 'addPage');
    const manyCategories = Array.from({ length: 60 }, (_, i) => ({
      label: `Category ${i}`,
      amount: 100,
    }));
    buildSummaryPdf({ ...baseInput, categorySpend: manyCategories });
    expect(addPageSpy).toHaveBeenCalled();
  });
});

describe('downloadSummaryPdf', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves the built document under the given filename', () => {
    const saveSpy = vi.spyOn(jsPDF.prototype, 'save');
    downloadSummaryPdf(baseInput, 'monthly-summary-2026-03.pdf');
    expect(saveSpy).toHaveBeenCalledWith('monthly-summary-2026-03.pdf');
  });
});
