import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

interface PasswordStrengthMeterProps {
  password: string;
}

function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
const COLORS: Array<'error' | 'warning' | 'info' | 'success'> = [
  'error',
  'error',
  'warning',
  'info',
  'success',
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null;
  const score = scorePassword(password);

  return (
    <Box sx={{ mt: -1 }}>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        color={COLORS[score]}
        sx={{ height: 6, borderRadius: 3 }}
      />
      <Typography variant="caption" color="text.secondary">
        {LABELS[score]}
      </Typography>
    </Box>
  );
}
