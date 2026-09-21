import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  /** Usually a formatted string, but any node (e.g. a <CurrencyText/>) works. */
  value: ReactNode;
  icon?: SvgIconComponent;
  /** Optional trend text, e.g. "+4.2% vs last month" */
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  color = 'primary',
}: StatCardProps) {
  const trendColor =
    trendDirection === 'up'
      ? 'success.main'
      : trendDirection === 'down'
        ? 'error.main'
        : 'text.secondary';

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {label}
          </Typography>
          {Icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: `${color}.main`,
                color: `${color}.contrastText`,
                opacity: 0.9,
              }}
            >
              <Icon fontSize="small" />
            </Box>
          )}
        </Stack>
        <Typography variant="h4" component="p" sx={{ mt: 1.5, fontWeight: 700 }}>
          {value}
        </Typography>
        {trend && (
          <Typography variant="caption" sx={{ color: trendColor }}>
            {trend}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
