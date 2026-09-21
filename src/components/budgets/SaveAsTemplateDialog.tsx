import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { FormTextField } from '../common/form/FormTextField';
import {
  saveAsTemplateFormSchema,
  type SaveAsTemplateFormValues,
} from '../../schemas/budgetTemplateSchemas';
import type { Budget } from '../../types/budget';

interface SaveAsTemplateDialogProps {
  open: boolean;
  budget: Budget | null;
  onClose: () => void;
  onSubmit: (values: SaveAsTemplateFormValues) => Promise<void>;
}

/**
 * A single-field dialog for naming a new template from an existing budget
 * — same minimal shape as `TagFormDialog`, just one field instead of two.
 * Everything besides the name comes from `budget` via
 * `budgetToTemplateInput` in the caller (`BudgetsPage`), not from this form.
 */
export function SaveAsTemplateDialog({ open, budget, onClose, onSubmit }: SaveAsTemplateDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {open && budget && (
        <SaveAsTemplateFields budget={budget} onClose={onClose} onSubmit={onSubmit} />
      )}
    </Dialog>
  );
}

interface SaveAsTemplateFieldsProps {
  budget: Budget;
  onClose: () => void;
  onSubmit: (values: SaveAsTemplateFormValues) => Promise<void>;
}

function SaveAsTemplateFields({ budget, onClose, onSubmit }: SaveAsTemplateFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SaveAsTemplateFormValues>({
    resolver: zodResolver(saveAsTemplateFormSchema),
    defaultValues: { name: budget.name },
  });

  const submit = async (values: SaveAsTemplateFormValues) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>Save as template</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="save-as-template-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}
          <Typography variant="body2" color="text.secondary">
            Saves the amount, thresholds, and category limits from &quot;{budget.name}&quot; so you
            can reuse them for a future period. The date range isn&apos;t saved — you&apos;ll pick
            new dates each time you use the template.
          </Typography>
          <FormTextField
            name="name"
            control={control}
            label="Template name"
            placeholder="e.g. Standard month"
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="save-as-template-form" variant="contained" loading={isSubmitting}>
          Save template
        </Button>
      </DialogActions>
    </>
  );
}
