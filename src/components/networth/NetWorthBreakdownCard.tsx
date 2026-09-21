import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { CurrencyText } from '../common/CurrencyText';
import { formatCurrency } from '../../utils/formatCurrency';
import { CATEGORY_CHART_COLORS as PIE_COLORS } from '../../config/chartColors';
import type { BreakdownEntry } from '../../utils/netWorthCalculations';

interface NetWorthBreakdownCardProps {
  title: string;
  entries: BreakdownEntry[];
  currency?: string;
  emptyMessage: string;
}

/**
 * A donut chart + ranked list for one side of the balance sheet — the
 * same chart shape `DashboardPage`'s "Spending by category" card already
 * uses, reused here for assets vs. liabilities instead of expense
 * categories, so both charts in the app look and behave consistently.
 */
export function NetWorthBreakdownCard({ title, entries, currency, emptyMessage }: NetWorthBreakdownCardProps) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardHeader title={title} />
      <CardContent sx={{ pt: 0 }}>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : (
          <>
            <Box sx={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={entries}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {entries.map((entry, index) => (
                      <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value), { currency })} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {entries.slice(0, 6).map((entry, index) => (
                <Stack
                  key={entry.label}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: PIE_COLORS[index % PIE_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="body2" noWrap>
                      {entry.label}
                    </Typography>
                  </Stack>
                  <CurrencyText amount={entry.amount} currency={currency} component="span" />
                </Stack>
              ))}
            </Stack>
          </>
        )}
      </CardContent>
    </Card>
  );
}
