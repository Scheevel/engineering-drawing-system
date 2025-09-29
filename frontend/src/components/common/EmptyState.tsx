/**
 * Empty State Component
 *
 * Provides helpful guidance and clear calls-to-action when users
 * encounter empty lists or missing data, enhancing the user experience
 * by directing them toward productive next steps.
 */

import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  useTheme,
  alpha,
  SvgIcon,
} from '@mui/material';
import {
  Add as AddIcon,
  Schema as SchemaIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  CloudOff as OfflineIcon,
  Refresh as RefreshIcon,
  GetApp as ImportIcon,
  Help as HelpIcon,
  Lightbulb as TipIcon,
} from '@mui/icons-material';
import EnhancedTooltip from './EnhancedTooltip';

// Custom illustration components
const EmptySchemaIcon = () => (
  <SvgIcon sx={{ fontSize: 80 }} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
    />
  </SvgIcon>
);

const EmptySearchIcon = () => (
  <SvgIcon sx={{ fontSize: 80 }} viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
    />
    <path
      fill="currentColor"
      opacity="0.3"
      d="M9.5 7C8.12 7 7 8.12 7 9.5S8.12 12 9.5 12s2.5-1.12 2.5-2.5S10.88 7 9.5 7z"
    />
  </SvgIcon>
);

export type EmptyStateType =
  | 'no-schemas'
  | 'no-search-results'
  | 'no-filtered-results'
  | 'network-error'
  | 'loading-error'
  | 'permission-denied'
  | 'maintenance'
  | 'custom';

interface EmptyStateAction {
  label: string;
  action: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'inherit';
  icon?: ReactNode;
  tooltip?: string;
}

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  illustration?: ReactNode;
  actions?: EmptyStateAction[];
  helpText?: string;
  helpLink?: string;
  compact?: boolean;
  showBorder?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  icon,
  illustration,
  actions = [],
  helpText,
  helpLink,
  compact = false,
  showBorder = true,
}) => {
  const theme = useTheme();

  // Get default configuration based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'no-schemas':
        return {
          title: title || 'No Schemas Found',
          description: description || 'Get started by creating your first schema to define the structure of your components.',
          icon: icon || <EmptySchemaIcon />,
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.05),
          defaultActions: [
            {
              label: 'Create Schema',
              action: () => console.log('Create schema'),
              variant: 'contained' as const,
              color: 'primary' as const,
              icon: <AddIcon />,
              tooltip: 'Create a new schema from scratch',
            },
            {
              label: 'Import Schema',
              action: () => console.log('Import schema'),
              variant: 'outlined' as const,
              icon: <ImportIcon />,
              tooltip: 'Import an existing schema template',
            },
          ],
          helpText: helpText || 'Schemas define the structure and validation rules for your components. Start with a simple schema and expand it as needed.',
        };

      case 'no-search-results':
        return {
          title: title || 'No Results Found',
          description: description || 'We couldn\'t find any schemas matching your search criteria. Try adjusting your search terms or filters.',
          icon: icon || <EmptySearchIcon />,
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          defaultActions: [
            {
              label: 'Clear Search',
              action: () => console.log('Clear search'),
              variant: 'outlined' as const,
              icon: <SearchIcon />,
            },
            {
              label: 'Reset Filters',
              action: () => console.log('Reset filters'),
              variant: 'text' as const,
              icon: <FilterIcon />,
            },
          ],
          helpText: helpText || 'Try using different keywords or removing some filters to broaden your search.',
        };

      case 'no-filtered-results':
        return {
          title: title || 'No Matching Schemas',
          description: description || 'No schemas match your current filter selection. Try adjusting or clearing your filters.',
          icon: icon || <FilterIcon sx={{ fontSize: 80 }} />,
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.05),
          defaultActions: [
            {
              label: 'Reset Filters',
              action: () => console.log('Reset filters'),
              variant: 'contained' as const,
              color: 'primary' as const,
              icon: <FilterIcon />,
            },
            {
              label: 'Show All',
              action: () => console.log('Show all'),
              variant: 'outlined' as const,
            },
          ],
          helpText: helpText || 'Filters help you find specific schemas quickly, but they can be too restrictive sometimes.',
        };

      case 'network-error':
        return {
          title: title || 'Connection Error',
          description: description || 'Unable to load schemas due to network issues. Please check your connection and try again.',
          icon: icon || <OfflineIcon sx={{ fontSize: 80 }} />,
          color: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.05),
          defaultActions: [
            {
              label: 'Retry',
              action: () => window.location.reload(),
              variant: 'contained' as const,
              color: 'primary' as const,
              icon: <RefreshIcon />,
            },
          ],
          helpText: helpText || 'Network issues can be temporary. Retrying often resolves the problem.',
        };

      case 'loading-error':
        return {
          title: title || 'Loading Error',
          description: description || 'Something went wrong while loading the schemas. Please try refreshing the page.',
          icon: icon || <RefreshIcon sx={{ fontSize: 80 }} />,
          color: theme.palette.error.main,
          backgroundColor: alpha(theme.palette.error.main, 0.05),
          defaultActions: [
            {
              label: 'Refresh Page',
              action: () => window.location.reload(),
              variant: 'contained' as const,
              color: 'primary' as const,
              icon: <RefreshIcon />,
            },
          ],
          helpText: helpText || 'If the problem persists, please contact support.',
        };

      case 'permission-denied':
        return {
          title: title || 'Access Restricted',
          description: description || 'You don\'t have permission to view schemas in this project. Contact your administrator for access.',
          icon: icon || <SchemaIcon sx={{ fontSize: 80 }} />,
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.05),
          defaultActions: [
            {
              label: 'Contact Admin',
              action: () => console.log('Contact admin'),
              variant: 'outlined' as const,
              icon: <HelpIcon />,
            },
          ],
          helpText: helpText || 'Permission levels are managed by project administrators.',
        };

      case 'maintenance':
        return {
          title: title || 'Under Maintenance',
          description: description || 'Schema management is temporarily unavailable due to system maintenance. Please try again later.',
          icon: icon || <SchemaIcon sx={{ fontSize: 80 }} />,
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          defaultActions: [
            {
              label: 'Check Status',
              action: () => console.log('Check status'),
              variant: 'outlined' as const,
              icon: <RefreshIcon />,
            },
          ],
          helpText: helpText || 'Maintenance windows are typically brief. Thank you for your patience.',
        };

      default:
        return {
          title: title || 'No Content',
          description: description || 'There\'s nothing to show here right now.',
          icon: icon || <SchemaIcon sx={{ fontSize: 80 }} />,
          color: theme.palette.text.secondary,
          backgroundColor: alpha(theme.palette.action.hover, 0.1),
          defaultActions: [],
          helpText,
        };
    }
  };

  const config = getTypeConfig();
  const finalActions = actions.length > 0 ? actions : config.defaultActions;

  const content = (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      textAlign="center"
      py={compact ? theme.spacing(4) : theme.spacing(6)}
      px={theme.spacing(3)}
    >
      {/* Icon/Illustration */}
      <Box
        sx={{
          color: config.color,
          mb: theme.spacing(3),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {illustration || config.icon}
      </Box>

      {/* Title */}
      <Typography
        variant={compact ? "h6" : "h5"}
        color="text.primary"
        fontWeight="bold"
        mb={theme.spacing(1)}
      >
        {config.title}
      </Typography>

      {/* Description */}
      <Typography
        variant="body1"
        color="text.secondary"
        mb={theme.spacing(3)}
        maxWidth={compact ? 300 : 400}
        lineHeight={1.6}
      >
        {config.description}
      </Typography>

      {/* Actions */}
      {finalActions.length > 0 && (
        <Box
          display="flex"
          gap={theme.spacing(1)}
          flexWrap="wrap"
          justifyContent="center"
          mb={config.helpText ? theme.spacing(2) : 0}
        >
          {finalActions.map((action, index) => (
            <EnhancedTooltip
              key={index}
              title={action.tooltip || ''}
              type="help"
            >
              <Button
                variant={action.variant || 'contained'}
                color={action.color || 'primary'}
                onClick={action.action}
                startIcon={action.icon}
                size={compact ? 'small' : 'medium'}
              >
                {action.label}
              </Button>
            </EnhancedTooltip>
          ))}
        </Box>
      )}

      {/* Help Text */}
      {config.helpText && (
        <Box
          display="flex"
          alignItems="flex-start"
          gap={theme.spacing(1)}
          maxWidth={compact ? 300 : 500}
          sx={{
            backgroundColor: alpha(theme.palette.info.main, 0.05),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            borderRadius: theme.spacing(1),
            p: theme.spacing(2),
          }}
        >
          <TipIcon
            sx={{
              color: theme.palette.info.main,
              fontSize: 20,
              mt: theme.spacing(0.25),
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: helpLink ? theme.spacing(1) : 0 }}
            >
              {config.helpText}
            </Typography>
            {helpLink && (
              <Button
                variant="text"
                size="small"
                href={helpLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ p: 0, minHeight: 'auto' }}
              >
                Learn more
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );

  if (!showBorder) {
    return content;
  }

  return (
    <Card
      sx={{
        backgroundColor: config.backgroundColor,
        border: `1px solid ${alpha(config.color, 0.2)}`,
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 0 }}>
        {content}
      </CardContent>
    </Card>
  );
};

// Pre-configured empty states for common schema management scenarios
export const NoSchemasState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="no-schemas" {...props} />
);

export const NoSearchResultsState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="no-search-results" {...props} />
);

export const NetworkErrorState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="network-error" {...props} />
);

export const LoadingErrorState: React.FC<Partial<EmptyStateProps>> = (props) => (
  <EmptyState type="loading-error" {...props} />
);

export default EmptyState;