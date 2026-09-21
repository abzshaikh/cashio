import { RouterProvider } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ColorModeProvider } from './context/ColorModeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmDialogProvider } from './context/ConfirmDialogContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes/router';

function App() {
  return (
    <ErrorBoundary>
      <ColorModeProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <NotificationProvider>
            <ConfirmDialogProvider>
              <AuthProvider>
                {/* Phase 36: needs the signed-in user from AuthProvider,
                    so it nests inside it — see SettingsContext.tsx. */}
                <SettingsProvider>
                  <RouterProvider router={router} />
                </SettingsProvider>
              </AuthProvider>
            </ConfirmDialogProvider>
          </NotificationProvider>
        </LocalizationProvider>
      </ColorModeProvider>
    </ErrorBoundary>
  );
}

export default App;
