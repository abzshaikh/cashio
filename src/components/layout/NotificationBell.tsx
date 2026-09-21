import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircleIcon from '@mui/icons-material/Circle';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { useNotifications } from '../../hooks/useNotifications';
import { useNotification } from '../../context/NotificationContext';
import {
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { formatRelative } from '../../utils/formatDate';
import { INSIGHT_SEVERITY_META } from '../../config/insightSeverityMeta';
import type { AppNotification } from '../../types/notification';

/** How many of the most recent notifications the popover shows — a full
 * history view isn't part of this phase's scope (see PHASE_LOG.md's Phase
 * 35 known limitations); "View all insights" links to the always-fresh,
 * unlimited `InsightsPage` instead. */
const MAX_VISIBLE = 20;

/**
 * Phase 35: the bell icon in `Topbar` — was a static, non-functional
 * placeholder since Phase 1. Reads notifications `useNotificationSync`
 * (mounted once in `AppLayout`) has already written, shows an unread-count
 * badge, and lets the user mark one/all read, delete one, or jump to the
 * page an alert is about (`actionPath`, same convention `InsightsPage`'s
 * own action buttons use).
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  const { error: notifyError } = useNotification();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.read).length;
  const visible = list.slice(0, MAX_VISIBLE);

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleSelect = async (notification: AppNotification) => {
    handleClose();
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
      } catch {
        notifyError('Failed to mark notification as read.');
      }
    }
    if (notification.actionPath) navigate(notification.actionPath);
  };

  const handleDelete = async (event: MouseEvent, notification: AppNotification) => {
    event.stopPropagation();
    try {
      await deleteNotification(notification.id);
    } catch {
      notifyError('Failed to delete notification.');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(list);
    } catch {
      notifyError('Failed to mark all notifications as read.');
    }
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton aria-label="Notifications" onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsNoneOutlinedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ width: 360, maxWidth: '90vw' }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            <Button size="small" disabled={unreadCount === 0} onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          </Stack>
          <Divider />

          {visible.length === 0 ? (
            <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
              <TaskAltOutlinedIcon color="disabled" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                You're all caught up — nothing to show here yet.
              </Typography>
            </Box>
          ) : (
            <Stack sx={{ maxHeight: 420, overflowY: 'auto' }} divider={<Divider />}>
              {visible.map((notification) => (
                <Stack
                  key={notification.id}
                  direction="row"
                  spacing={1}
                  onClick={() => handleSelect(notification)}
                  sx={{
                    px: 2,
                    py: 1.25,
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <CircleIcon
                    sx={{
                      fontSize: 10,
                      mt: 0.75,
                      flexShrink: 0,
                      color: notification.read
                        ? 'transparent'
                        : `${INSIGHT_SEVERITY_META[notification.severity].alertSeverity}.main`,
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="body2"
                      noWrap
                      sx={{ fontWeight: notification.read ? 400 : 600 }}
                    >
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      {formatRelative(notification.createdAt)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    aria-label={`Delete notification: ${notification.title}`}
                    onClick={(event) => handleDelete(event, notification)}
                    sx={{ flexShrink: 0 }}
                  >
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}

          <Divider />
          <Box sx={{ px: 1, py: 0.5 }}>
            <Button
              size="small"
              fullWidth
              onClick={() => {
                handleClose();
                navigate('/insights');
              }}
            >
              View all insights
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
