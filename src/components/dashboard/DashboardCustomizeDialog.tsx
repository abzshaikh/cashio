import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowUpwardOutlinedIcon from '@mui/icons-material/ArrowUpwardOutlined';
import ArrowDownwardOutlinedIcon from '@mui/icons-material/ArrowDownwardOutlined';
import { DASHBOARD_WIDGET_IDS, DASHBOARD_WIDGET_META, type DashboardWidgetId } from '../../config/dashboardWidgets';

interface DashboardCustomizeDialogProps {
  open: boolean;
  /** The currently *visible* widgets, in display order — a widget id
   * missing from this array is hidden. Matches `UserSettings.dashboardWidgets`
   * exactly, so the caller can pass it straight through. */
  value: DashboardWidgetId[];
  onClose: () => void;
  onSave: (widgets: DashboardWidgetId[]) => void | Promise<void>;
}

/**
 * Builds the dialog's own working order: every known widget, always —
 * including ones currently hidden, so a hidden widget can still be found,
 * re-checked, and moved. Visible widgets keep `value`'s order up front;
 * hidden ones (anything in `DASHBOARD_WIDGET_IDS` but not in `value`)
 * follow in their default order.
 */
function buildInitialOrder(value: DashboardWidgetId[]): DashboardWidgetId[] {
  const hidden = DASHBOARD_WIDGET_IDS.filter((id) => !value.includes(id));
  return [...value, ...hidden];
}

/**
 * Phase 39: lets the user show/hide and reorder `DashboardPage`'s
 * customizable sections. No drag-and-drop library — the app has none, and
 * one dialog with three rows doesn't justify adding one — so reordering is
 * a pair of up/down icon buttons per row, the same "small, explicit
 * controls over a bigger dependency" call `QuickAddTransactionDialog` made
 * for its own type toggle.
 *
 * Working state is local (`order`/`hidden`) until Save, matching every
 * other dialog in the app (`BudgetFormDialog`, `ExpenseFormDialog`, …) —
 * closing without saving discards changes, re-seeded from `value` each
 * time the dialog opens via the `open` effect below.
 */
export function DashboardCustomizeDialog({ open, value, onClose, onSave }: DashboardCustomizeDialogProps) {
  const [order, setOrder] = useState<DashboardWidgetId[]>(() => buildInitialOrder(value));
  const [hidden, setHidden] = useState<Set<DashboardWidgetId>>(
    () => new Set(DASHBOARD_WIDGET_IDS.filter((id) => !value.includes(id))),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOrder(buildInitialOrder(value));
      setHidden(new Set(DASHBOARD_WIDGET_IDS.filter((id) => !value.includes(id))));
    }
    // Only re-seed when the dialog transitions open — deliberately not
    // depending on `value` beyond that, so a settings update elsewhere
    // while this dialog happens to be open doesn't blow away in-progress
    // edits (same convention `PreferencesSection`'s form reset avoids for
    // an open, dirty form).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleVisible = (id: DashboardWidgetId) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(order.filter((id) => !hidden.has(id)));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Customize Dashboard</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Choose which sections appear below the summary cards, and in what order.
        </Typography>
        <List disablePadding>
          {order.map((id, index) => (
            <ListItem
              key={id}
              disableGutters
              secondaryAction={
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    aria-label={`Move ${DASHBOARD_WIDGET_META[id].label} up`}
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUpwardOutlinedIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Move ${DASHBOARD_WIDGET_META[id].label} down`}
                    onClick={() => move(index, 1)}
                    disabled={index === order.length - 1}
                  >
                    <ArrowDownwardOutlinedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
            >
              <ListItemIcon sx={{ minWidth: 0 }}>
                <Checkbox
                  edge="start"
                  checked={!hidden.has(id)}
                  onChange={() => toggleVisible(id)}
                  slotProps={{ input: { 'aria-label': DASHBOARD_WIDGET_META[id].label } }}
                />
              </ListItemIcon>
              <ListItemText
                primary={DASHBOARD_WIDGET_META[id].label}
                secondary={DASHBOARD_WIDGET_META[id].description}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} loading={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
