import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface SnackbarMessage {
  message: string;
  severity: AlertColor;
  key: number;
}

interface SnackbarContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextType | undefined>(undefined);

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

interface SnackbarProviderProps {
  children: React.ReactNode;
}

export const SnackbarProvider: React.FC<SnackbarProviderProps> = ({ children }) => {
  const [snackPack, setSnackPack] = useState<SnackbarMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [messageInfo, setMessageInfo] = useState<SnackbarMessage | undefined>(undefined);

  React.useEffect(() => {
    if (snackPack.length && !messageInfo) {
      // Set a new snack when we don't have an active one
      setMessageInfo({ ...snackPack[0] });
      setSnackPack((prev) => prev.slice(1));
      setOpen(true);
    } else if (snackPack.length && messageInfo && open) {
      // Close an active snack when a new one is added
      setOpen(false);
    }
  }, [snackPack, messageInfo, open]);

  const showMessage = useCallback((message: string, severity: AlertColor) => {
    setSnackPack((prev) => [...prev, { message, severity, key: new Date().getTime() }]);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showMessage(message, 'success');
  }, [showMessage]);

  const showError = useCallback((message: string) => {
    showMessage(message, 'error');
  }, [showMessage]);

  const showWarning = useCallback((message: string) => {
    showMessage(message, 'warning');
  }, [showMessage]);

  const showInfo = useCallback((message: string) => {
    showMessage(message, 'info');
  }, [showMessage]);

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleExited = () => {
    setMessageInfo(undefined);
  };

  return (
    <SnackbarContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      <Snackbar
        key={messageInfo ? messageInfo.key : undefined}
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        TransitionProps={{ onExited: handleExited }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={messageInfo?.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {messageInfo?.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
