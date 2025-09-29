/**
 * Enhanced Error Boundary and Error State Management
 *
 * Comprehensive error handling with actionable recovery options,
 * graceful degradation, and user-friendly error messages.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  IconButton,
  Collapse,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as BugReportIcon,
  Home as HomeIcon,
  CloudOff as OfflineIcon,
  Wifi as OnlineIcon,
} from '@mui/icons-material';
import { ANIMATION_DURATION } from '../../utils/animations.ts';

// ========================================
// ERROR TYPES AND INTERFACES
// ========================================

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  type: 'boundary' | 'api' | 'network' | 'validation' | 'unknown';
  code?: string | number;
  retryable?: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
  isOnline: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  showReportButton?: boolean;
  reportEndpoint?: string;
}

// ========================================
// ERROR BOUNDARY COMPONENT
// ========================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
      isOnline: navigator.onLine,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedErrorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      type: this.categorizeError(error),
      severity: this.determineSeverity(error),
      retryable: this.isRetryable(error),
    };

    this.setState({
      errorInfo: enhancedErrorInfo,
    });

    // Report to error tracking service
    this.props.onError?.(error, errorInfo);

    // Log for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOnlineStatusChange);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnlineStatusChange);
    window.removeEventListener('offline', this.handleOnlineStatusChange);
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  handleOnlineStatusChange = () => {
    this.setState({ isOnline: navigator.onLine });

    // Auto-retry if coming back online and error was network-related
    if (navigator.onLine && this.state.errorInfo?.type === 'network') {
      this.handleRetry();
    }
  };

  categorizeError = (error: Error): ErrorInfo['type'] => {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('api') || message.includes('server')) {
      return 'api';
    }
    if (error.name === 'ChunkLoadError') {
      return 'network';
    }

    return 'unknown';
  };

  determineSeverity = (error: Error): ErrorInfo['severity'] => {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'medium';
    }
    if (message.includes('validation')) {
      return 'low';
    }

    return 'high';
  };

  isRetryable = (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('fetch') ||
           error.name === 'ChunkLoadError';
  };

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);

    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false,
        retryCount: retryCount + 1,
      });
    }, delay);

    this.retryTimeouts.push(timeout);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
    });
  };

  handleReportError = () => {
    const { reportEndpoint } = this.props;
    const { error, errorInfo } = this.state;

    if (!reportEndpoint || !error) return;

    fetch(reportEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        errorInfo,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    }).catch(() => {
      // Silently fail - don't cause more errors
    });
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { children, fallback, showReportButton = true, maxRetries = 3 } = this.props;
    const { hasError, error, errorInfo, showDetails, retryCount, isOnline } = this.state;

    if (hasError && error && errorInfo) {
      if (fallback) {
        return fallback;
      }

      return <ErrorDisplay
        error={error}
        errorInfo={errorInfo}
        showDetails={showDetails}
        retryCount={retryCount}
        maxRetries={maxRetries}
        isOnline={isOnline}
        showReportButton={showReportButton}
        onRetry={this.handleRetry}
        onReset={this.handleReset}
        onReportError={this.handleReportError}
        onToggleDetails={this.toggleDetails}
      />;
    }

    return children;
  }
}

// ========================================
// ERROR DISPLAY COMPONENT
// ========================================

interface ErrorDisplayProps {
  error: Error;
  errorInfo: ErrorInfo;
  showDetails: boolean;
  retryCount: number;
  maxRetries: number;
  isOnline: boolean;
  showReportButton: boolean;
  onRetry: () => void;
  onReset: () => void;
  onReportError: () => void;
  onToggleDetails: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorInfo,
  showDetails,
  retryCount,
  maxRetries,
  isOnline,
  showReportButton,
  onRetry,
  onReset,
  onReportError,
  onToggleDetails,
}) => {
  const theme = useTheme();

  const getErrorConfig = () => {
    switch (errorInfo.severity) {
      case 'critical':
        return {
          color: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          icon: <ErrorIcon />,
          title: 'Critical System Error',
        };
      case 'high':
        return {
          color: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.1),
          icon: <ErrorIcon />,
          title: 'Application Error',
        };
      case 'medium':
        return {
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
          icon: isOnline ? <ErrorIcon /> : <OfflineIcon />,
          title: errorInfo.type === 'network' ? 'Connection Error' : 'Service Error',
        };
      case 'low':
        return {
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.1),
          icon: <ErrorIcon />,
          title: 'Validation Error',
        };
    }
  };

  const config = getErrorConfig();

  const getRecoveryMessage = () => {
    switch (errorInfo.type) {
      case 'network':
        return isOnline
          ? 'Check your internet connection and try again.'
          : 'You appear to be offline. Please check your connection.';
      case 'api':
        return 'Our servers are experiencing issues. Please try again in a moment.';
      case 'validation':
        return 'Please check your input and try again.';
      default:
        return 'Something went wrong. Please refresh the page or try again.';
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="400px"
      p={theme.spacing(3)}
      textAlign="center"
    >
      <Card
        sx={{
          maxWidth: 600,
          width: '100%',
          boxShadow: theme.shadows[8],
          borderRadius: theme.spacing(2),
        }}
      >
        <CardContent sx={{ p: theme.spacing(3) }}>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="center" mb={theme.spacing(2)}>
            <Box
              sx={{
                color: config.color,
                backgroundColor: config.backgroundColor,
                borderRadius: '50%',
                p: theme.spacing(1),
                mr: theme.spacing(2),
              }}
            >
              {config.icon}
            </Box>
            <Typography variant="h5" color={config.color} fontWeight="bold">
              {config.title}
            </Typography>
            {!isOnline && (
              <Box
                sx={{
                  ml: theme.spacing(1),
                  color: theme.palette.warning.main,
                }}
              >
                <OfflineIcon fontSize="small" />
              </Box>
            )}
          </Box>

          {/* Error Message */}
          <Typography variant="body1" color="text.secondary" mb={theme.spacing(2)}>
            {getRecoveryMessage()}
          </Typography>

          {/* Connection Status */}
          {errorInfo.type === 'network' && (
            <Alert
              severity={isOnline ? 'warning' : 'error'}
              sx={{ mb: theme.spacing(2) }}
              icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
            >
              <AlertTitle>
                {isOnline ? 'Connection Issues' : 'You are offline'}
              </AlertTitle>
              {isOnline
                ? 'We\'re having trouble connecting to our servers.'
                : 'Please check your internet connection and try again.'}
            </Alert>
          )}

          {/* Action Buttons */}
          <Box display="flex" gap={theme.spacing(1)} justifyContent="center" flexWrap="wrap" mb={theme.spacing(2)}>
            {errorInfo.retryable && retryCount < maxRetries && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
                disabled={!isOnline && errorInfo.type === 'network'}
              >
                Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              onClick={onReset}
            >
              Reset Application
            </Button>

            {showReportButton && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<BugReportIcon />}
                onClick={onReportError}
              >
                Report Issue
              </Button>
            )}
          </Box>

          {/* Error Details */}
          <Divider sx={{ mb: theme.spacing(2) }} />

          <Button
            variant="text"
            size="small"
            onClick={onToggleDetails}
            startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mb: theme.spacing(1) }}
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </Button>

          <Collapse in={showDetails} timeout={ANIMATION_DURATION.standard}>
            <Box
              sx={{
                backgroundColor: alpha(theme.palette.action.hover, 0.1),
                borderRadius: theme.spacing(1),
                p: theme.spacing(2),
                textAlign: 'left',
              }}
            >
              <Typography variant="body2" component="div" sx={{ mb: theme.spacing(1) }}>
                <strong>Error Type:</strong> {errorInfo.type}
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: theme.spacing(1) }}>
                <strong>Severity:</strong> {errorInfo.severity}
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: theme.spacing(1) }}>
                <strong>Message:</strong> {error.message}
              </Typography>
              {errorInfo.code && (
                <Typography variant="body2" component="div" sx={{ mb: theme.spacing(1) }}>
                  <strong>Code:</strong> {errorInfo.code}
                </Typography>
              )}
              {errorInfo.stack && (
                <Box>
                  <Typography variant="body2" component="div" sx={{ mb: theme.spacing(1) }}>
                    <strong>Stack Trace:</strong>
                  </Typography>
                  <Typography
                    variant="caption"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      backgroundColor: alpha(theme.palette.action.hover, 0.3),
                      p: theme.spacing(1),
                      borderRadius: theme.spacing(0.5),
                      overflow: 'auto',
                      maxHeight: 200,
                      fontSize: '0.75rem',
                    }}
                  >
                    {errorInfo.stack}
                  </Typography>
                </Box>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
};

// ========================================
// UTILITY HOOKS AND FUNCTIONS
// ========================================

export const useErrorHandler = () => {
  const [error, setError] = React.useState<ErrorInfo | null>(null);

  const handleError = React.useCallback((error: Error, type: ErrorInfo['type'] = 'unknown') => {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      type,
      severity: type === 'network' ? 'medium' : 'high',
      retryable: type === 'network' || type === 'api',
    };
    setError(errorInfo);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
};

export default ErrorBoundary;