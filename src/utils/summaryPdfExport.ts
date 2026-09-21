/**
 * Builds a downloadable PDF recap of a Monthly or Yearly Summary page
 * (Phase 29) — the "downloadable version" both `MonthlySummaryPage.tsx`
 * and `YearlySummaryPage.tsx` have pointed at since Phase 22/23's own
 * "known limitations" sections. One shared shape/builder covers both
 * pages, since their summaries are structurally identical (income/
 * expenses/net/savings rate, spending by category, budget performance,
 * biggest expense, transaction counts) — only the period label and the
 * underlying numbers differ.
 *
 * Uses `jsPDF` (the one real dependency this phase adds) rather than a
 * hand-rolled approach — unlike CSV, a PDF is a real binary/layout format
 * not worth reimplementing, the same reasoning already applied to
 * `recharts`/`date-fns` elsewhere in this app. The output is plain text
 * (numbers and labels only, no charts/images) — reproducing the on-screen
 * donut/bar charts as PDF graphics is out of scope for this phase, see
 * PHASE_LOG.md's known limitations.
 */
import { jsPDF } from 'jspdf';
import { formatCurrency } from './formatCurrency';

export interface SummaryPdfCategoryRow {
  label: string;
  amount: number;
}

export interface SummaryPdfBudgetRow {
  name: string;
  actual: number;
  total: number;
  statusLabel: string;
}

export interface SummaryPdfTransactionTypeRow {
  label: string;
  count: number;
}

export interface SummaryPdfBiggestExpense {
  amount: number;
  payee: string;
  date: string;
  category: string;
}

export interface SummaryPdfInput {
  title: string;
  periodLabel: string;
  currency: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number | null;
  categorySpend: SummaryPdfCategoryRow[];
  budgets: SummaryPdfBudgetRow[];
  biggestExpense: SummaryPdfBiggestExpense | null;
  transactionCounts: SummaryPdfTransactionTypeRow[];
  totalTransactionCount: number;
}

const PAGE_MARGIN = 14;
const PAGE_BOTTOM = 280;
const LINE_HEIGHT = 7;

/** Builds the `jsPDF` document in memory — split out from
 * `downloadSummaryPdf` so tests (and any future "preview before download"
 * feature) can inspect the built document without triggering a browser
 * download. */
export function buildSummaryPdf(input: SummaryPdfInput): jsPDF {
  const doc = new jsPDF();
  let y = PAGE_MARGIN;

  const money = (amount: number) => formatCurrency(amount, { currency: input.currency });

  const addLine = (text: string, options: { size?: number; bold?: boolean } = {}) => {
    if (y > PAGE_BOTTOM) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    doc.setFontSize(options.size ?? 11);
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.text(text, PAGE_MARGIN, y);
    y += LINE_HEIGHT;
  };

  const addSpacer = () => {
    y += LINE_HEIGHT / 2;
  };

  const addSectionHeading = (text: string) => {
    addSpacer();
    addLine(text, { size: 13, bold: true });
  };

  addLine(input.title, { size: 18, bold: true });
  addLine(input.periodLabel, { size: 12 });

  addSpacer();
  addLine(`Income: ${money(input.income)}`);
  addLine(`Expenses: ${money(input.expense)}`);
  addLine(`Net savings: ${money(input.net)}`);
  addLine(
    `Savings rate: ${input.savingsRate === null ? '—' : `${(input.savingsRate * 100).toFixed(1)}%`}`,
  );

  addSectionHeading('Spending by category');
  if (input.categorySpend.length === 0) {
    addLine('No expenses recorded for this period.');
  } else {
    input.categorySpend.forEach((row) => addLine(`${row.label}: ${money(row.amount)}`));
  }

  addSectionHeading('Budget performance');
  if (input.budgets.length === 0) {
    addLine('No budgets cover this period.');
  } else {
    input.budgets.forEach((row) =>
      addLine(`${row.name}: ${money(row.actual)} / ${money(row.total)} (${row.statusLabel})`),
    );
  }

  addSectionHeading('Biggest expense');
  if (!input.biggestExpense) {
    addLine('No expenses recorded for this period.');
  } else {
    addLine(
      `${money(input.biggestExpense.amount)} — ${
        input.biggestExpense.payee || 'No description'
      } (${input.biggestExpense.date}, ${input.biggestExpense.category})`,
    );
  }

  addSectionHeading('Transactions');
  if (input.totalTransactionCount === 0) {
    addLine('No transactions recorded for this period.');
  } else {
    addLine(`${input.totalTransactionCount} total`);
    input.transactionCounts.forEach((row) => addLine(`${row.label}: ${row.count}`));
  }

  return doc;
}

export function downloadSummaryPdf(input: SummaryPdfInput, filename: string): void {
  buildSummaryPdf(input).save(filename);
}
