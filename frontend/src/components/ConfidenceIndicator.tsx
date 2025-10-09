import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';

interface ConfidenceIndicatorProps {
  confidence: number; // 0-1 (e.g., 0.85 for 85%)
  showLabel?: boolean; // Whether to show percentage text
}

// Helper function to get confidence color based on value
const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.75) return 'success.main'; // Green (75-100%)
  if (confidence >= 0.50) return 'warning.main'; // Yellow (50-75%)
  if (confidence >= 0.25) return 'orange';        // Orange (25-50%)
  return 'error.main';                            // Red (0-25%)
};

// Helper function to get quartile label
const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.75) return 'High confidence - Trust extracted data';
  if (confidence >= 0.50) return 'Medium-High confidence - Verify if critical';
  if (confidence >= 0.25) return 'Medium-Low confidence - High chance of OCR error';
  return 'Low confidence - Manual review required';
};

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  showLabel = true,
}) => {
  const percentage = Math.round(confidence * 100);
  const color = getConfidenceColor(confidence);
  const label = getConfidenceLabel(confidence);

  return (
    <Tooltip title={label} arrow>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Color indicator circle */}
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: color,
            flexShrink: 0,
          }}
        />
        {/* Percentage text */}
        {showLabel && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {percentage}%
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default ConfidenceIndicator;
