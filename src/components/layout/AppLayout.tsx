import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { QuickAddFab } from './QuickAddFab';
import { navItems } from '../../config/navConfig';
import { useRecurringTransactionGenerator } from '../../hooks/useRecurringTransactionGenerator';
import { useNotificationSync } from '../../hooks/useNotificationSync';

const DRAWER_WIDTH = 260;

export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Phase 14: checks for due recurring transactions once per session,
  // regardless of which page the user lands on first — see that hook's doc
  // comment for why this lives here rather than on a specific page.
  useRecurringTransactionGenerator();
  // Phase 35: same "once per session, regardless of landing page" shape,
  // for turning Phase 24's insight rules into persisted notifications.
  useNotificationSync();

  const pageTitle = useMemo(() => {
    const match = navItems.find((item) =>
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
    );
    return match?.label ?? 'Coinlo';
  }, [location.pathname]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        {isDesktop ? (
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: 1,
                borderColor: 'divider',
              },
            }}
          >
            <Sidebar />
          </Drawer>
        ) : (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
            }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        )}
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        <Topbar title={pageTitle} onMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ p: { xs: 2, sm: 3 }, flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
      {/* Phase 38: fixed-position, so its place in the tree doesn't matter
          for layout — mounted here alongside the other "available on every
          authenticated page" concerns above. */}
      <QuickAddFab />
    </Box>
  );
}
