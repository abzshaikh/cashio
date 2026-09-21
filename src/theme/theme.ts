import { createTheme, type PaletteMode, type ThemeOptions } from '@mui/material/styles';

/**
 * Semantic status colors reused across budgets, goals, and alerts
 * (safe / warning / near-limit / over-budget — see Phase 10).
 */
declare module '@mui/material/styles' {
  interface Palette {
    status: {
      safe: string;
      warning: string;
      nearLimit: string;
      over: string;
    };
  }
  interface PaletteOptions {
    status?: {
      safe: string;
      warning: string;
      nearLimit: string;
      over: string;
    };
  }
}

const statusColors = {
  safe: '#2e7d32',
  warning: '#ed6c02',
  nearLimit: '#e65100',
  over: '#d32f2f',
};

function buildPalette(mode: PaletteMode): ThemeOptions['palette'] {
  const isLight = mode === 'light';
  return {
    mode,
    primary: {
      main: isLight ? '#1e5f8c' : '#7fb8e0',
    },
    secondary: {
      main: isLight ? '#2e7d5b' : '#7bd4a8',
    },
    background: {
      default: isLight ? '#f5f7fa' : '#0f1216',
      paper: isLight ? '#ffffff' : '#171b21',
    },
    status: statusColors,
  };
}

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: buildPalette(mode),
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
      ].join(','),
      h1: { fontSize: '2rem', fontWeight: 700 },
      h2: { fontSize: '1.5rem', fontWeight: 700 },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      h4: { fontSize: '1.1rem', fontWeight: 600 },
      h5: { fontSize: '1rem', fontWeight: 600 },
      h6: { fontSize: '0.95rem', fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
          },
        },
      },
    },
  });
}
