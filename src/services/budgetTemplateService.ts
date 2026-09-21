import type { DocumentData } from 'firebase/firestore';
import { createUserScopedCollection } from './firestoreCollection';
import { toDate } from '../utils/formatDate';
import { mapBudgetItem, toMinorUnitItems } from './budgetService';
import { toMinorUnits } from '../utils/money';
import type {
  BudgetTemplate,
  NewBudgetTemplateInput,
} from '../types/budgetTemplate';

function mapBudgetTemplateDoc(id: string, data: DocumentData): BudgetTemplate {
  return {
    id,
    userId: data.userId,
    name: data.name ?? '',
    period: data.period ?? 'monthly',
    scope: data.scope === 'category' ? 'category' : 'overall',
    overallAmount: typeof data.overallAmount === 'number' ? data.overallAmount : 0,
    items: Array.isArray(data.items) ? data.items.map(mapBudgetItem) : [],
    warningThreshold: typeof data.warningThreshold === 'number' ? data.warningThreshold : 80,
    overThreshold: typeof data.overThreshold === 'number' ? data.overThreshold : 100,
    createdAt: toDate(data.createdAt)?.toISOString() ?? '',
    updatedAt: toDate(data.updatedAt)?.toISOString() ?? '',
  };
}

const budgetTemplatesCollection = createUserScopedCollection<BudgetTemplate>(
  'budgetTemplates',
  mapBudgetTemplateDoc,
);

// Phase 34: `input.overallAmount`/`input.items[].amount` are decimal
// major-unit values (either from `BudgetFormDialog`'s "Save as template"
// flow, or `budgetTemplateCalculations.ts`'s `budgetToTemplateInput`, which
// converts an existing `Budget`'s minor-unit amounts back to major units
// specifically so this function's contract stays "always major units in")
// — converted to minor units here, this function's single choke point.
function toFirestoreFields(input: NewBudgetTemplateInput): Record<string, unknown> {
  return {
    name: input.name,
    period: input.period,
    scope: input.scope,
    overallAmount: input.scope === 'overall' ? toMinorUnits(input.overallAmount) : 0,
    items: input.scope === 'category' ? toMinorUnitItems(input.items) : [],
    warningThreshold: input.warningThreshold,
    overThreshold: input.overThreshold,
  };
}

export function createBudgetTemplate(userId: string, input: NewBudgetTemplateInput): Promise<string> {
  return budgetTemplatesCollection.create(userId, toFirestoreFields(input));
}

export function deleteBudgetTemplate(id: string): Promise<void> {
  return budgetTemplatesCollection.remove(id);
}

/** Realtime subscription to a user's saved templates, most recently saved first. */
export function subscribeToBudgetTemplates(
  userId: string,
  onData: (templates: BudgetTemplate[]) => void,
  onError: (error: Error) => void,
): () => void {
  return budgetTemplatesCollection.subscribeForUser(userId, onData, onError, {
    orderByField: 'createdAt',
    orderDirection: 'desc',
  });
}
