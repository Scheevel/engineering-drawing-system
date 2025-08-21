import React from 'react';
import {
  Box,
  Typography,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';

interface ScopeCount {
  piece_mark: number;
  component_type: number;
  description: number;
}

interface ScopeEffectivenessMetricsProps {
  scopeCounts: ScopeCount;
  currentScope: string[];
  query: string;
}

const ScopeEffectivenessMetrics: React.FC<ScopeEffectivenessMetricsProps> = ({
  scopeCounts,
  currentScope,
  query,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Mapping for display names and scope keys
  const scopeDisplayData = [
    { key: 'piece_mark', label: 'Piece Marks', count: scopeCounts.piece_mark },
    { key: 'component_type', label: 'Component Types', count: scopeCounts.component_type },
    { key: 'description', label: 'Descriptions', count: scopeCounts.description },
  ];

  // Check if a scope is currently active
  const isScopeActive = (scopeKey: string): boolean => {
    return currentScope.includes(scopeKey);
  };

  // Get chip color and variant based on active state
  const getChipProps = (scopeKey: string, count: number) => {
    const isActive = isScopeActive(scopeKey);
    
    return {
      variant: isActive ? 'filled' : 'outlined',
      color: isActive ? 'primary' : 'default',
      className: isActive ? 'current-scope' : '',
      sx: {
        fontWeight: isActive ? 600 : 400,
        borderWidth: isActive ? 2 : 1,
        ...(count === 0 && {
          color: 'text.disabled',
          borderColor: 'action.disabled',
        }),
      },
    } as const;
  };

  // Don't render if no scope counts available
  if (!scopeCounts) {
    return null;
  }

  return (
    <Box
      role="region"
      aria-label="Scope effectiveness metrics showing result counts per search scope"
      data-testid="scope-metrics-container"
      className={isMobile ? 'mobile-layout' : 'desktop-layout'}
      sx={{
        mt: 1,
        p: 1.5,
        bgcolor: 'background.default',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1, fontWeight: 500 }}
      >
        Scope Effectiveness
        {query && (
          <Typography component="span" sx={{ ml: 1, fontStyle: 'italic' }}>
            for "{query}"
          </Typography>
        )}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 1,
          alignItems: isMobile ? 'stretch' : 'center',
          flexWrap: 'wrap',
        }}
      >
        {/* Compact format display for desktop */}
        {!isMobile && (
          <Typography
            variant="body2"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'text.primary',
            }}
          >
            {scopeDisplayData.map((scope, index) => (
              <React.Fragment key={scope.key}>
                <Typography
                  component="span"
                  sx={{
                    fontWeight: isScopeActive(scope.key) ? 600 : 400,
                    color: isScopeActive(scope.key) ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {scope.label} ({scope.count})
                </Typography>
                {index < scopeDisplayData.length - 1 && (
                  <Typography component="span" sx={{ mx: 0.5, color: 'text.disabled' }}>
                    |
                  </Typography>
                )}
              </React.Fragment>
            ))}
          </Typography>
        )}

        {/* Chip format display for mobile */}
        {isMobile && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {scopeDisplayData.map((scope) => (
              <Chip
                key={scope.key}
                label={`${scope.label}: ${scope.count}`}
                size="small"
                {...getChipProps(scope.key, scope.count)}
              />
            ))}
          </Box>
        )}

        {/* Interactive chips for desktop (additional to compact format) */}
        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            {scopeDisplayData.map((scope) => (
              <Chip
                key={scope.key}
                label={`${scope.count}`}
                size="small"
                {...getChipProps(scope.key, scope.count)}
                title={`${scope.count} matches in ${scope.label.toLowerCase()}`}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Help text */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          mt: 1,
          fontStyle: 'italic',
          lineHeight: 1.3,
        }}
      >
        Numbers show potential matches in each field. Current scope is highlighted.
        {currentScope.length > 1 && " Multiple scopes are active."}
      </Typography>
    </Box>
  );
};

export default ScopeEffectivenessMetrics;