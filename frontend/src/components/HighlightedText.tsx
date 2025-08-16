import React from 'react';
import { Typography, TypographyProps } from '@mui/material';

interface HighlightedTextProps extends Omit<TypographyProps, 'children'> {
  text: string;
  searchTerm: string;
  highlightStyle?: React.CSSProperties;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  searchTerm,
  highlightStyle = { backgroundColor: '#ffeb3b', fontWeight: 'bold' },
  ...typographyProps
}) => {
  if (!searchTerm.trim()) {
    return <Typography {...typographyProps}>{text}</Typography>;
  }

  // Create a case-insensitive regex to find matches
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Typography {...typographyProps}>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <span key={index} style={highlightStyle}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </Typography>
  );
};

export default HighlightedText;