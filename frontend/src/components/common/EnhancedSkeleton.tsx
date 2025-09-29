/**
 * Enhanced Skeleton Component
 *
 * Professional loading skeleton with smooth animations that match
 * schema management content structure and provide excellent UX
 * during loading states.
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Skeleton,
  useTheme,
  alpha,
  styled,
} from '@mui/material';
import { pulse, respectReducedMotion, optimizeForPerformance } from '../../utils/animations.ts';

// Enhanced skeleton with custom animation
const AnimatedSkeleton = styled(Skeleton)(({ theme }) => ({
  ...optimizeForPerformance,
  ...respectReducedMotion({
    animation: `${pulse} 1200ms ${theme.transitions.easing.easeInOut} infinite`,
  }),
  backgroundColor: alpha(theme.palette.action.hover, 0.3),
  '&::after': {
    background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.action.hover, 0.6)}, transparent)`,
  },
}));

interface EnhancedSkeletonProps {
  variant?: 'card' | 'list' | 'form' | 'table' | 'custom';
  count?: number;
  height?: number | string;
  width?: number | string;
  animation?: 'pulse' | 'wave' | false;
  showAvatar?: boolean;
  showActions?: boolean;
  lines?: number;
  compact?: boolean;
}

interface SkeletonCardProps {
  showAvatar?: boolean;
  showActions?: boolean;
  lines?: number;
  compact?: boolean;
  animation?: 'pulse' | 'wave' | false;
}

// Schema Management Card Skeleton
const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showAvatar = true,
  showActions = true,
  lines = 2,
  compact = false,
  animation = 'wave',
}) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        mb: theme.spacing(2),
        border: '2px solid',
        borderColor: alpha(theme.palette.divider, 0.5),
        borderRadius: theme.spacing(1.5),
        ...optimizeForPerformance,
      }}
    >
      <CardContent
        sx={{
          p: theme.spacing(compact ? 2 : 3),
          pb: theme.spacing(compact ? 2 : 3),
          '&:last-child': { pb: theme.spacing(compact ? 2 : 3) },
        }}
      >
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={theme.spacing(2)}>
          <Box flex={1}>
            {/* Title */}
            <AnimatedSkeleton
              variant="text"
              width="60%"
              height={theme.typography.h6.lineHeight ?
                `${parseFloat(theme.typography.h6.fontSize) * parseFloat(theme.typography.h6.lineHeight)}rem` :
                32}
              animation={animation}
              sx={{ mb: theme.spacing(1) }}
            />

            {/* Subtitle/Description */}
            <AnimatedSkeleton
              variant="text"
              width="40%"
              height={24}
              animation={animation}
              sx={{ mb: theme.spacing(1) }}
            />

            {/* Additional lines */}
            {Array.from({ length: lines }).map((_, index) => (
              <AnimatedSkeleton
                key={index}
                variant="text"
                width={`${80 - index * 15}%`}
                height={20}
                animation={animation}
                sx={{ mb: theme.spacing(0.5) }}
              />
            ))}
          </Box>

          {/* Actions */}
          {showActions && (
            <Box display="flex" flexDirection="column" gap={theme.spacing(1)} ml={theme.spacing(2)}>
              <AnimatedSkeleton
                variant="circular"
                width={40}
                height={40}
                animation={animation}
              />
              <AnimatedSkeleton
                variant="circular"
                width={40}
                height={40}
                animation={animation}
              />
            </Box>
          )}
        </Box>

        {!compact && (
          <>
            {/* Schema Information */}
            <Box display="flex" flexWrap="wrap" gap={theme.spacing(2)} mb={theme.spacing(2)}>
              <AnimatedSkeleton
                variant="text"
                width={80}
                height={20}
                animation={animation}
              />
              <AnimatedSkeleton
                variant="text"
                width={60}
                height={20}
                animation={animation}
              />
              <AnimatedSkeleton
                variant="text"
                width={120}
                height={20}
                animation={animation}
              />
            </Box>

            {/* Usage Statistics */}
            <Box display="flex" flexWrap="wrap" gap={theme.spacing(2)}>
              <AnimatedSkeleton
                variant="text"
                width={100}
                height={20}
                animation={animation}
              />
              <AnimatedSkeleton
                variant="text"
                width={140}
                height={20}
                animation={animation}
              />
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// Schema List Skeleton
const SkeletonList: React.FC<{ count: number; compact?: boolean; animation?: 'pulse' | 'wave' | false }> = ({
  count,
  compact = false,
  animation = 'wave',
}) => {
  return (
    <Box>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard
          key={index}
          compact={compact}
          animation={animation}
          lines={compact ? 1 : 2}
        />
      ))}
    </Box>
  );
};

// Form Field Skeleton
const SkeletonForm: React.FC<{ lines?: number; animation?: 'pulse' | 'wave' | false }> = ({
  lines = 3,
  animation = 'wave',
}) => {
  const theme = useTheme();

  return (
    <Box>
      {Array.from({ length: lines }).map((_, index) => (
        <Box key={index} mb={theme.spacing(3)}>
          {/* Field Label */}
          <AnimatedSkeleton
            variant="text"
            width="30%"
            height={24}
            animation={animation}
            sx={{ mb: theme.spacing(1) }}
          />

          {/* Field Input */}
          <AnimatedSkeleton
            variant="rectangular"
            width="100%"
            height={56}
            animation={animation}
            sx={{ borderRadius: theme.spacing(1) }}
          />
        </Box>
      ))}
    </Box>
  );
};

// Table Row Skeleton
const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  animation?: 'pulse' | 'wave' | false;
}> = ({
  rows = 5,
  columns = 4,
  animation = 'wave',
}) => {
  const theme = useTheme();

  return (
    <Box>
      {/* Table Header */}
      <Box display="flex" gap={theme.spacing(2)} mb={theme.spacing(2)} px={theme.spacing(2)}>
        {Array.from({ length: columns }).map((_, index) => (
          <AnimatedSkeleton
            key={`header-${index}`}
            variant="text"
            width="25%"
            height={24}
            animation={animation}
          />
        ))}
      </Box>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box
          key={`row-${rowIndex}`}
          display="flex"
          gap={theme.spacing(2)}
          mb={theme.spacing(1)}
          p={theme.spacing(2)}
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <AnimatedSkeleton
              key={`cell-${rowIndex}-${colIndex}`}
              variant="text"
              width="25%"
              height={20}
              animation={animation}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

// Main Enhanced Skeleton Component
const EnhancedSkeleton: React.FC<EnhancedSkeletonProps> = ({
  variant = 'card',
  count = 1,
  height,
  width,
  animation = 'wave',
  showAvatar = false,
  showActions = true,
  lines = 2,
  compact = false,
}) => {
  switch (variant) {
    case 'card':
      return (
        <SkeletonCard
          showAvatar={showAvatar}
          showActions={showActions}
          lines={lines}
          compact={compact}
          animation={animation}
        />
      );

    case 'list':
      return (
        <SkeletonList
          count={count}
          compact={compact}
          animation={animation}
        />
      );

    case 'form':
      return (
        <SkeletonForm
          lines={lines}
          animation={animation}
        />
      );

    case 'table':
      return (
        <SkeletonTable
          rows={count}
          columns={lines}
          animation={animation}
        />
      );

    case 'custom':
    default:
      return (
        <AnimatedSkeleton
          variant="rectangular"
          width={width}
          height={height}
          animation={animation}
        />
      );
  }
};

export default EnhancedSkeleton;