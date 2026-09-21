import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import LinearProgress from '@mui/material/LinearProgress';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { DataTable, type DataTableColumn } from '../../components/common/DataTable';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useAccounts } from '../../hooks/useAccounts';
import { useExpenseCategories } from '../../hooks/useExpenseCategories';
import { createExpenseTransaction, createIncomeTransaction } from '../../services/transactionService';
import { parseCsv } from '../../utils/csvParser';
import {
  IMPORT_COLUMNS,
  IMPORT_COLUMN_LABELS,
  REQUIRED_IMPORT_COLUMNS,
  guessColumnMapping,
  isMappingComplete,
  parseImportRow,
  summarizeImportRows,
  type ColumnMapping,
  type ImportRowResult,
} from '../../utils/csvTransactionImport';
import { formatCurrency } from '../../utils/formatCurrency';
import { toMinorUnits } from '../../utils/money';

const STEPS = ['Select account & data', 'Map columns', 'Preview & import'];

export function ImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const { accounts } = useAccounts();
  const { categories } = useExpenseCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeStep, setActiveStep] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [header, setHeader] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(
    null,
  );

  const accountOptions = useMemo(
    () => (accounts ?? []).map((a) => ({ value: a.id, label: a.name })),
    [accounts],
  );

  const results: ImportRowResult[] = useMemo(() => {
    if (dataRows.length === 0 || !isMappingComplete(mapping) || !accountId) return [];
    return dataRows.map((row, index) =>
      parseImportRow(row, index + 2, mapping, accountId, categories ?? []),
    );
  }, [dataRows, mapping, accountId, categories]);

  const summary = useMemo(() => summarizeImportRows(results), [results]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleParse = () => {
    setParseError(null);
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      setParseError('The file needs a header row plus at least one data row.');
      return;
    }
    const [headerRow, ...rest] = rows;
    setHeader(headerRow);
    setDataRows(rest);
    setMapping(guessColumnMapping(headerRow));
    setActiveStep(1);
  };

  const handleMappingChange = (key: (typeof IMPORT_COLUMNS)[number]) => (event: SelectChangeEvent) => {
    const value = event.target.value;
    setMapping((prev) => ({ ...prev, [key]: value === '' ? undefined : Number(value) }));
  };

  const handleStartOver = () => {
    setActiveStep(0);
    setCsvText('');
    setFileName(null);
    setParseError(null);
    setHeader([]);
    setDataRows([]);
    setMapping({});
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!user) return;
    const validRows = results.filter((r) => r.status === 'valid');
    setImporting(true);
    setImportProgress(0);
    let imported = 0;
    let failed = 0;
    for (const row of validRows) {
      try {
        if (row.type === 'expense' && row.expenseInput) {
          await createExpenseTransaction(user.uid, row.expenseInput);
        } else if (row.type === 'income' && row.incomeInput) {
          await createIncomeTransaction(user.uid, row.incomeInput);
        }
        imported += 1;
      } catch {
        failed += 1;
      }
      setImportProgress((p) => p + 1);
    }
    setImporting(false);
    setImportResult({ imported, failed });
    if (imported > 0) {
      success(`Imported ${imported} transaction${imported === 1 ? '' : 's'}`);
    }
    if (failed > 0) {
      notifyError(`${failed} row${failed === 1 ? '' : 's'} failed to import.`);
    }
  };

  const previewColumns: DataTableColumn<ImportRowResult & { __index: number }>[] = [
    {
      id: 'row',
      header: 'Row',
      accessor: (r) => r.rowNumber,
      render: (r) => r.rowNumber,
      sortable: true,
      width: 70,
    },
    {
      id: 'status',
      header: 'Status',
      render: (r) =>
        r.status === 'valid' ? (
          <Chip label="Ready" size="small" color="success" variant="outlined" />
        ) : (
          <Chip label="Error" size="small" color="error" variant="outlined" />
        ),
    },
    {
      id: 'type',
      header: 'Type',
      render: (r) => (r.status === 'valid' ? r.type : '—'),
    },
    {
      id: 'date',
      header: 'Date',
      render: (r) => (r.status === 'valid' ? r.preview.date : '—'),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      // `r.preview.amount` is a major-unit decimal parsed straight from the
      // CSV (same contract as `NewExpenseInput`/`NewIncomeInput` — see
      // csvTransactionImport.ts), so it needs converting to minor units
      // before `formatCurrency` (which now expects minor units) displays it.
      render: (r) => (r.status === 'valid' ? formatCurrency(toMinorUnits(r.preview.amount)) : '—'),
    },
    {
      id: 'category',
      header: 'Category',
      render: (r) => (r.status === 'valid' ? r.preview.category : '—'),
    },
    {
      id: 'payee',
      header: 'Merchant / Source',
      render: (r) => (r.status === 'valid' ? r.preview.payee || '—' : '—'),
    },
    {
      id: 'message',
      header: 'Notes',
      render: (r) => {
        if (r.status === 'error') return r.message;
        if (r.warnings.length === 0) return '—';
        return r.warnings.join(' ');
      },
    },
  ];

  const noAccountsYet = accounts !== null && accounts.length === 0;

  if (noAccountsYet) {
    return (
      <Box>
        <PageHeader title="Import Transactions" subtitle="Bring in income and expenses from a CSV file." />
        <EmptyState
          icon={<AccountBalanceWalletOutlinedIcon fontSize="inherit" />}
          title="Add an account first"
          description="Imported transactions need an account to belong to — add one before importing a CSV file."
          actionLabel="Add Account"
          onAction={() => navigate('/accounts')}
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Import Transactions"
        subtitle="Bring in income and expenses from a CSV file — refunds, adjustments, and transfers aren't supported by import."
      />

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && (
          <Stack spacing={3}>
            <FormControl sx={{ maxWidth: 360 }}>
              <InputLabel id="import-account-label">Import into account</InputLabel>
              <Select
                labelId="import-account-label"
                label="Import into account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accountOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack spacing={1}>
              <Typography variant="subtitle2">CSV file</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadFileOutlinedIcon />}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Choose file
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                  />
                </Button>
                {fileName && (
                  <Typography variant="body2" color="text.secondary">
                    {fileName}
                  </Typography>
                )}
              </Stack>
            </Stack>

            <Stack spacing={1}>
              <Typography variant="subtitle2">Or paste CSV text</Typography>
              <TextField
                multiline
                minRows={6}
                fullWidth
                placeholder={'Date,Amount,Category,Merchant\n2026-03-15,-450,Food,Cafe Coffee Day'}
                value={fileName ? '' : csvText}
                onChange={(e) => {
                  setFileName(null);
                  setCsvText(e.target.value);
                }}
              />
            </Stack>

            {parseError && <Alert severity="error">{parseError}</Alert>}

            <Box>
              <Button
                variant="contained"
                disabled={!accountId || !csvText.trim()}
                onClick={handleParse}
              >
                Continue
              </Button>
            </Box>
          </Stack>
        )}

        {activeStep === 1 && (
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              Tell us which column in your file holds each piece of information. Date and Amount
              are required; everything else is optional.
            </Typography>
            <Stack spacing={2} sx={{ maxWidth: 480 }}>
              {IMPORT_COLUMNS.map((key) => (
                <FormControl key={key} fullWidth>
                  <InputLabel id={`mapping-${key}-label`}>
                    {IMPORT_COLUMN_LABELS[key]}
                    {REQUIRED_IMPORT_COLUMNS.includes(key) ? ' *' : ''}
                  </InputLabel>
                  <Select
                    labelId={`mapping-${key}-label`}
                    label={`${IMPORT_COLUMN_LABELS[key]}${REQUIRED_IMPORT_COLUMNS.includes(key) ? ' *' : ''}`}
                    value={mapping[key] !== undefined ? String(mapping[key]) : ''}
                    onChange={handleMappingChange(key)}
                  >
                    <MenuItem value="">
                      <em>Not mapped</em>
                    </MenuItem>
                    {header.map((h, index) => (
                      <MenuItem key={index} value={String(index)}>
                        {h || `Column ${index + 1}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button onClick={() => setActiveStep(0)}>Back</Button>
              <Button
                variant="contained"
                disabled={!isMappingComplete(mapping)}
                onClick={() => setActiveStep(2)}
              >
                Continue
              </Button>
            </Stack>
          </Stack>
        )}

        {activeStep === 2 && !importResult && (
          <Stack spacing={3}>
            <Alert severity={summary.errorCount > 0 ? 'warning' : 'info'}>
              {summary.validCount} of {summary.total} row{summary.total === 1 ? '' : 's'} ready to
              import.
              {summary.errorCount > 0 &&
                ` ${summary.errorCount} row${summary.errorCount === 1 ? '' : 's'} will be skipped due to errors.`}
              {summary.warningCount > 0 &&
                ` ${summary.warningCount} warning${summary.warningCount === 1 ? '' : 's'} — those rows will still be imported.`}
            </Alert>

            <DataTable
              columns={previewColumns}
              rows={results.map((r, i) => ({ ...r, __index: i }))}
              getRowId={(r) => String(r.__index)}
              defaultRowsPerPage={10}
            />

            {importing && (
              <Stack spacing={1}>
                <LinearProgress
                  variant="determinate"
                  value={(importProgress / Math.max(summary.validCount, 1)) * 100}
                />
                <Typography variant="body2" color="text.secondary">
                  Importing {importProgress} of {summary.validCount}…
                </Typography>
              </Stack>
            )}

            <Stack direction="row" spacing={1}>
              <Button onClick={() => setActiveStep(1)} disabled={importing}>
                Back
              </Button>
              <Button
                variant="contained"
                disabled={summary.validCount === 0 || importing}
                onClick={handleImport}
              >
                Import {summary.validCount > 0 ? summary.validCount : ''} transaction
                {summary.validCount === 1 ? '' : 's'}
              </Button>
            </Stack>
          </Stack>
        )}

        {activeStep === 2 && importResult && (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 4 }}>
            <CheckCircleOutlinedIcon color="success" sx={{ fontSize: 48 }} />
            <Typography variant="h6">Import complete</Typography>
            <Typography variant="body2" color="text.secondary">
              {importResult.imported} transaction{importResult.imported === 1 ? '' : 's'} imported
              {importResult.failed > 0
                ? `, ${importResult.failed} failed to import.`
                : '.'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={handleStartOver}>Import another file</Button>
              <Button variant="contained" onClick={() => navigate('/transactions')}>
                Go to Transactions
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
