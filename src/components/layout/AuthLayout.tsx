import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CoinloMark } from '../common/CoinloMark';

export function AuthLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', mb: 3, justifyContent: 'center' }}
        >
          <CoinloMark size={40} />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Coinlo
          </Typography>
        </Stack>
        <Outlet />
      </Paper>
    </Box>
  );
}
