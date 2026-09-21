import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { useBudgetTemplates } from '../../hooks/useBudgetTemplates';
import type { BudgetTemplate } from '../../types/budgetTemplate';

interface BudgetTemplatesSectionProps {
  onUse: (template: BudgetTemplate) => void;
  onDelete: (template: BudgetTemplate) => void;
}

/**
 * A "Templates" card on `BudgetsPage`, the same "extend the existing page
 * with a section" pattern Phase 21 used for `TagsSection` on Settings,
 * rather than a standalone route — a template is a convenience layered
 * onto budgets, not a page-worthy concept of its own. There's no "Add"
 * button here (unlike `TagsSection`): a template can only be created via
 * "Save as template" from an existing `BudgetCard`, since it always starts
 * from a real budget's shape rather than being authored from scratch.
 */
export function BudgetTemplatesSection({ onUse, onDelete }: BudgetTemplatesSectionProps) {
  const { templates, error: loadError, reload } = useBudgetTemplates();

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader
        title="Templates"
        subheader="Reuse a saved budget shape for a new period instead of building one from scratch."
      />
      <CardContent>
        {loadError && <ErrorState description={loadError.message} onRetry={reload} />}
        {!loadError && templates === null && <EmptyState title="Loading templates…" />}
        {!loadError && templates !== null && templates.length === 0 && (
          <EmptyState
            icon={<ContentCopyOutlinedIcon fontSize="inherit" />}
            title="No templates yet"
            description={'Use a budget\'s "⋮" menu and choose "Save as template" to create one.'}
          />
        )}
        {!loadError && templates !== null && templates.length > 0 && (
          <Stack spacing={1}>
            {templates.map((template) => (
              <Stack
                key={template.id}
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {template.name}
                  </Typography>
                  <Chip
                    label={template.scope === 'overall' ? 'Overall' : 'By category'}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="Use this template">
                    <IconButton
                      size="small"
                      aria-label={`Use template ${template.name}`}
                      onClick={() => onUse(template)}
                    >
                      <ContentCopyOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete template">
                    <IconButton
                      size="small"
                      aria-label={`Delete template ${template.name}`}
                      onClick={() => onDelete(template)}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
