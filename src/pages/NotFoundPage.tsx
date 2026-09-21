import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        textAlign: 'center',
        minHeight: '100vh',
        p: 3,
      }}
    >
      <Typography variant="h2" color="primary" sx={{ fontWeight: 700 }}>
        404
      </Typography>
      <Typography variant="h6">Page not found</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
        The page you’re looking for doesn’t exist or may have moved.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Back to Dashboard
      </Button>
    </Box>
  );
}
