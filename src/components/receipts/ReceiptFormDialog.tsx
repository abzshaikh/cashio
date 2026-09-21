import { useMemo, useState, type ChangeEvent } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { FormTextField } from '../common/form/FormTextField';
import { FormDatePicker } from '../common/form/FormDatePicker';
import { FormSelect, type FormSelectOption } from '../common/form/FormSelect';
import {
  receiptFormSchema,
  defaultReceiptFormValues,
  RECEIPT_ACCEPTED_FILE_TYPES,
  RECEIPT_MAX_FILE_SIZE_BYTES,
  type ReceiptFormValues,
} from '../../schemas/receiptSchemas';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import type { Transaction } from '../../types/transaction';

interface ReceiptFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues?: ReceiptFormValues;
  /** Shown read-only in edit mode instead of the file picker — a receipt's
   * file can't be replaced, only the receipt deleted and re-added. */
  existingFileName?: string;
  transactions: Transaction[];
  onClose: () => void;
  onSubmit: (values: ReceiptFormValues, file: File | null) => Promise<void>;
}

export function ReceiptFormDialog({
  open,
  mode,
  initialValues,
  existingFileName,
  transactions,
  onClose,
  onSubmit,
}: ReceiptFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {open && (
        <ReceiptFormFields
          mode={mode}
          initialValues={initialValues}
          existingFileName={existingFileName}
          transactions={transactions}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Dialog>
  );
}

type ReceiptFormFieldsProps = Omit<ReceiptFormDialogProps, 'open'>;

function ReceiptFormFields({
  mode,
  initialValues,
  existingFileName,
  transactions,
  onClose,
  onSubmit,
}: ReceiptFormFieldsProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ReceiptFormValues>({
    // See the matching comment in ExpenseFormDialog.tsx — zod v4's
    // z.coerce.number() has an `unknown` input type that doesn't quite fit
    // a plain Resolver<ReceiptFormValues>. The coercion still happens
    // correctly at runtime.
    resolver: zodResolver(receiptFormSchema) as Resolver<ReceiptFormValues>,
    defaultValues: initialValues ?? defaultReceiptFormValues,
  });

  const transactionOptions: FormSelectOption[] = useMemo(
    () => [
      { value: '', label: 'No linked transaction' },
      ...transactions.map((t) => ({
        value: t.id,
        label: `${formatDate(t.date)} · ${t.description || t.merchant || t.type} · ${formatCurrency(t.amount)}`,
      })),
    ],
    [transactions],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFormError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!RECEIPT_ACCEPTED_FILE_TYPES.includes(selected.type)) {
      setFormError('Choose a JPEG, PNG, WebP, or PDF file.');
      event.target.value = '';
      return;
    }
    // `storage.rules` allows a file only when its size is strictly *less
    // than* 5 MB (`request.resource.size < 5 * 1024 * 1024`), so a file of
    // exactly 5 MB must be rejected here too — otherwise it'd pass this
    // check only to fail the upload with a raw Storage permission error.
    if (selected.size >= RECEIPT_MAX_FILE_SIZE_BYTES) {
      setFormError('That file is larger than 5 MB — choose a smaller one.');
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const submit = async (values: ReceiptFormValues) => {
    setFormError(null);
    if (mode === 'create' && !file) {
      setFormError('Choose a receipt file to upload.');
      return;
    }
    try {
      await onSubmit(values, file);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Something went wrong.');
    }
  };

  return (
    <>
      <DialogTitle>{mode === 'create' ? 'Add Receipt' : 'Edit Receipt'}</DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          id="receipt-form"
          spacing={2.5}
          sx={{ mt: 0.5 }}
          onSubmit={handleSubmit(submit)}
          noValidate
        >
          {formError && <Alert severity="error">{formError}</Alert>}

          {mode === 'create' ? (
            <Stack spacing={1}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadOutlinedIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Choose file
                <input
                  type="file"
                  hidden
                  accept={RECEIPT_ACCEPTED_FILE_TYPES.join(',')}
                  onChange={handleFileChange}
                />
              </Button>
              {file && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                    {file.name}
                  </Typography>
                  <IconButton size="small" aria-label="Remove selected file" onClick={() => setFile(null)}>
                    <CloseOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Stack>
          ) : (
            existingFileName && (
              <Typography variant="body2" color="text.secondary">
                File: {existingFileName} (can't be replaced — delete and re-add the receipt instead)
              </Typography>
            )
          )}

          <FormTextField name="merchant" control={control} label="Merchant" autoFocus={mode === 'edit'} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormTextField name="amount" control={control} label="Amount" type="number" />
            <FormDatePicker name="date" control={control} label="Date" />
          </Stack>
          <FormSelect
            name="transactionId"
            control={control}
            label="Link to transaction (optional)"
            options={transactionOptions}
          />
          <FormTextField name="notes" control={control} label="Notes (optional)" multiline minRows={2} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button type="submit" form="receipt-form" variant="contained" loading={isSubmitting}>
          {mode === 'create' ? 'Add Receipt' : 'Save changes'}
        </Button>
      </DialogActions>
    </>
  );
}
