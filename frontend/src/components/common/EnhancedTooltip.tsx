/**
 * Enhanced Tooltip Component
 *
 * Professional tooltip system with contextual help, rich content support,
 * and consistent 150ms hover timing for optimal user experience.
 */

import React, { ReactNode } from 'react';
import {
  Tooltip,
  TooltipProps,
  Box,
  Typography,
  Paper,
  IconButton,
  Link,
  useTheme,
  alpha,
  Fade,
} from '@mui/material';
import {
  Info as InfoIcon,
  Help as HelpIcon,
  OpenInNew as ExternalLinkIcon,
  Lightbulb as TipIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { ANIMATION_DURATION } from '../../utils/animations.ts';

interface EnhancedTooltipProps extends Omit<TooltipProps, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  type?: 'info' | 'help' | 'tip' | 'warning' | 'success' | 'plain';
  showIcon?: boolean;
  maxWidth?: number;
  helpLink?: string;
  helpLinkText?: string;
  examples?: string[];
  shortcut?: string;
  interactive?: boolean;
  delayDuration?: number; // Custom delay for specific use cases
}

const EnhancedTooltip: React.FC<EnhancedTooltipProps> = ({
  title,
  description,
  type = 'plain',
  showIcon = false,
  maxWidth = 320,
  helpLink,
  helpLinkText = 'Learn more',
  examples,
  shortcut,
  interactive = false,
  delayDuration = 150, // Consistent 150ms delay as per requirements
  children,
  placement = 'top',
  arrow = true,
  ...tooltipProps
}) => {
  const theme = useTheme();

  // Get icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'info':
        return {
          icon: <InfoIcon fontSize="small" />,
          color: theme.palette.info.main,
          backgroundColor: alpha(theme.palette.info.main, 0.1),
        };
      case 'help':
        return {
          icon: <HelpIcon fontSize="small" />,
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
        };
      case 'tip':
        return {
          icon: <TipIcon fontSize="small" />,
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
        };
      case 'warning':
        return {
          icon: <WarningIcon fontSize="small" />,
          color: theme.palette.warning.main,
          backgroundColor: alpha(theme.palette.warning.main, 0.1),
        };
      case 'success':
        return {
          icon: <SuccessIcon fontSize="small" />,
          color: theme.palette.success.main,
          backgroundColor: alpha(theme.palette.success.main, 0.1),
        };
      default:
        return {
          icon: null,
          color: theme.palette.text.primary,
          backgroundColor: 'transparent',
        };
    }
  };

  const typeConfig = getTypeConfig();

  // Rich tooltip content
  const tooltipContent = (
    <Box sx={{ maxWidth, p: theme.spacing(1) }}>
      {/* Header */}
      <Box display="flex" alignItems="flex-start" gap={theme.spacing(1)} mb={description || examples ? theme.spacing(1) : 0}>
        {showIcon && typeConfig.icon && (
          <Box
            sx={{
              color: typeConfig.color,
              backgroundColor: typeConfig.backgroundColor,
              borderRadius: theme.spacing(0.5),
              p: theme.spacing(0.5),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mt: theme.spacing(0.25),
            }}
          >
            {typeConfig.icon}
          </Box>
        )}
        <Box flex={1}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: theme.typography.fontWeightMedium,
              color: theme.palette.text.primary,
              lineHeight: 1.4,
            }}
          >
            {title}
          </Typography>
          {shortcut && (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontFamily: 'monospace',
                backgroundColor: alpha(theme.palette.action.hover, 0.5),
                px: theme.spacing(0.5),
                py: theme.spacing(0.25),
                borderRadius: theme.spacing(0.5),
                ml: theme.spacing(1),
              }}
            >
              {shortcut}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Description */}
      {description && (
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            mb: examples || helpLink ? theme.spacing(1) : 0,
            lineHeight: 1.4,
          }}
        >
          {description}
        </Typography>
      )}

      {/* Examples */}
      {examples && examples.length > 0 && (
        <Box mb={helpLink ? theme.spacing(1) : 0}>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: theme.typography.fontWeightMedium,
              display: 'block',
              mb: theme.spacing(0.5),
            }}
          >
            Examples:
          </Typography>
          {examples.map((example, index) => (
            <Typography
              key={index}
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontFamily: 'monospace',
                backgroundColor: alpha(theme.palette.action.hover, 0.3),
                px: theme.spacing(0.5),
                py: theme.spacing(0.25),
                borderRadius: theme.spacing(0.5),
                display: 'block',
                mb: theme.spacing(0.25),
              }}
            >
              {example}
            </Typography>
          ))}
        </Box>
      )}

      {/* Help Link */}
      {helpLink && (
        <Box display="flex" alignItems="center" gap={theme.spacing(0.5)}>
          <Link
            href={helpLink}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: theme.palette.primary.main,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(0.5),
              fontSize: theme.typography.caption.fontSize,
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            {helpLinkText}
            <ExternalLinkIcon fontSize="inherit" />
          </Link>
        </Box>
      )}
    </Box>
  );

  return (
    <Tooltip
      {...tooltipProps}
      title={tooltipContent}
      placement={placement}
      arrow={arrow}
      interactive={interactive}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: ANIMATION_DURATION.fast }}
      enterDelay={delayDuration}
      leaveDelay={50}
      componentsProps={{
        tooltip: {
          sx: {
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(97, 97, 97, 0.95)'
              : 'rgba(33, 33, 33, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: theme.spacing(1),
            boxShadow: theme.shadows[8],
            border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            maxWidth: 'none', // Override default maxWidth
            fontSize: theme.typography.body2.fontSize,
          },
        },
        arrow: {
          sx: {
            color: theme.palette.mode === 'light'
              ? 'rgba(97, 97, 97, 0.95)'
              : 'rgba(33, 33, 33, 0.95)',
          },
        },
      }}
    >
      {children}
    </Tooltip>
  );
};

// Pre-configured tooltip variants for common use cases

export const InfoTooltip: React.FC<Omit<EnhancedTooltipProps, 'type'>> = (props) => (
  <EnhancedTooltip {...props} type="info" showIcon />
);

export const HelpTooltip: React.FC<Omit<EnhancedTooltipProps, 'type'>> = (props) => (
  <EnhancedTooltip {...props} type="help" showIcon interactive />
);

export const TipTooltip: React.FC<Omit<EnhancedTooltipProps, 'type'>> = (props) => (
  <EnhancedTooltip {...props} type="tip" showIcon />
);

export const WarningTooltip: React.FC<Omit<EnhancedTooltipProps, 'type'>> = (props) => (
  <EnhancedTooltip {...props} type="warning" showIcon />
);

export const SuccessTooltip: React.FC<Omit<EnhancedTooltipProps, 'type'>> = (props) => (
  <EnhancedTooltip {...props} type="success" showIcon />
);

// Schema-specific tooltip configurations
export const SchemaTooltips = {
  schemaName: {
    title: 'Schema Name',
    description: 'A unique identifier for this schema. Use descriptive names that clearly indicate the schema\'s purpose.',
    examples: ['Bridge Components v2', 'Standard Beam Schema', 'Column Details Schema'],
    type: 'help' as const,
  },
  schemaDescription: {
    title: 'Schema Description',
    description: 'Optional detailed description of the schema\'s purpose, scope, and usage guidelines.',
    type: 'help' as const,
  },
  defaultSchema: {
    title: 'Default Schema',
    description: 'The default schema is automatically selected when creating new components in this project.',
    type: 'info' as const,
  },
  globalSchema: {
    title: 'Global Schema',
    description: 'Global schemas are available across all projects and cannot be modified at the project level.',
    type: 'info' as const,
  },
  schemaFields: {
    title: 'Schema Fields',
    description: 'Define the structure and validation rules for component data. Each field has a type, configuration, and display options.',
    type: 'help' as const,
  },
  fieldReorder: {
    title: 'Reorder Fields',
    description: 'Drag and drop to reorder fields. The order affects how they appear in forms and displays.',
    shortcut: 'Drag & Drop',
    type: 'tip' as const,
  },
} as const;

export default EnhancedTooltip;