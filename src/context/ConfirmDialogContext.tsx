import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the "error" color for destructive actions. */
  destructive?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmDialogContext = createContext<ConfirmFn | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    resolver.current?.(result);
    setOptions(null);
  }, []);

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      <Dialog
        open={options !== null}
        onClose={() => handleClose(false)}
        maxWidth="xs"
        fullWidth
      >
        {options && (
          <>
            <DialogTitle>{options.title ?? 'Are you sure?'}</DialogTitle>
            <DialogContent>
              <DialogContentText component="div">
                {options.message}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleClose(false)} color="inherit">
                {options.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                onClick={() => handleClose(true)}
                color={options.destructive ? 'error' : 'primary'}
                variant="contained"
                autoFocus
              >
                {options.confirmLabel ?? 'Confirm'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ConfirmDialogContext.Provider>
  );
}

/** Returns an async confirm(options) function: `if (await confirm({...})) { ... }` */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return ctx;
}
