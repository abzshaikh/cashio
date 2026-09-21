import { Component, type ErrorInfo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Centralized place to hook up error reporting later.
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    window.location.assign('/');
  };

  render() {
    if (this.state.error) {
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
          <ReportProblemOutlinedIcon color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h5">Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            An unexpected error occurred. You can try returning to the
            dashboard; if the problem persists, please refresh the page.
          </Typography>
          <Button variant="contained" onClick={this.handleReset}>
            Back to Dashboard
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
