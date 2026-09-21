import { useMemo } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { CurrencyText } from '../common/CurrencyText';
import { EmptyState } from '../common/EmptyState';
import {
  getSuggestedCategoryBudgets,
  getSuggestedOverallBudget,
  SUGGESTION_TRAILING_MONTHS,
  type CategoryBudgetSuggestion,
} from '../../utils/budgetSuggestionEngine';
import { getCategoryLabel } from '../../utils/expenseCategoryLookup';
import type { ExpenseCategoryRecord } from '../../types/category';
import type { Transaction } from '../../types/transaction';

interface SmartSuggestionsSectionProps {
  transactions: Transaction[];
  categories: ExpenseCategoryRecord[];
  currency?: string;
  onUseOverall: (amount: number) => void;
  onUseCategories: (suggestions: CategoryBudgetSuggestion[]) => void;
}

/**
 * Phase 26's "Smart Suggestions" card on `BudgetsPage` — same "section on
 * the existing page, not a new route" placement `BudgetTemplatesSection`
 * (Phase 25) uses, since a suggestion is a convenience for filling out the
 * budget form, not a page-worthy concept of its own. Pure client-side
 * computation over transactions already loaded by the page — no
 * subscription, no new collection, nothing to add to `firestore.rules`.
 */
export function SmartSuggestionsSection({
  transactions,
  categories,
  currency,
  onUseOverall,
  onUseCategories,
}: SmartSuggestionsSectionProps) {
  const referenceDate = useMemo(() => new Date(), []);
  const overallSuggestion = useMemo(
    () => getSuggestedOverallBudget(transactions, referenceDate),
    [transactions, referenceDate],
  );
  const categorySuggestions = useMemo(
    () => getSuggestedCategoryBudgets(transactions, referenceDate),
    [transactions, referenceDate],
  );

  const hasSuggestions = overallSuggestion !== null || categorySuggestions.length > 0;

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader
        title="Smart Suggestions"
        subheader={`Based on your average spending over the last ${SUGGESTION_TRAILING_MONTHS} months.`}
      />
      <CardContent>
        {!hasSuggestions && (
          <EmptyState
            icon={<TipsAndUpdatesOutlinedIcon fontSize="inherit" />}
            title="Not enough history yet"
            description={`Keep recording expenses — once you have at least a month of history, this card will suggest budget amounts based on your average spending.`}
          />
        )}

        {hasSuggestions && (
          <Stack spacing={2}>
            {overallSuggestion !== null && (
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Overall monthly budget
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <CurrencyText amount={overallSuggestion} currency={currency} component="span" />{' '}
                    /month
                  </Typography>
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutoAwesomeOutlinedIcon />}
                  onClick={() => onUseOverall(overallSuggestion)}
                >
                  Create
                </Button>
              </Stack>
            )}

            {overallSuggestion !== null && categorySuggestions.length > 0 && <Divider />}

            {categorySuggestions.length > 0 && (
              <Stack spacing={1}>
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    By category
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AutoAwesomeOutlinedIcon />}
                    onClick={() => onUseCategories(categorySuggestions)}
                  >
                    Create from all
                  </Button>
                </Stack>
                {categorySuggestions.map((suggestion) => (
                  <Stack
                    key={suggestion.categoryId}
                    direction="row"
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {getCategoryLabel(categories, suggestion.categoryId)}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CurrencyText
                        amount={suggestion.suggestedAmount}
                        currency={currency}
                        component="span"
                      />
                      <Tooltip title="Create a budget from this suggestion">
                        <IconButton
                          size="small"
                          aria-label={`Use suggestion for ${getCategoryLabel(categories, suggestion.categoryId)}`}
                          onClick={() => onUseCategories([suggestion])}
                        >
                          <AutoAwesomeOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
