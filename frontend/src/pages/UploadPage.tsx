import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import DrawingUpload from '../components/DrawingUpload.tsx';

const UploadPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Engineering Drawings
      </Typography>
      
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Upload your engineering drawings for automatic processing and component extraction.
          Supported formats include PDF, JPEG, and PNG files up to 50MB.
        </Typography>
        
        <Box sx={{ mt: 3 }}>
          <DrawingUpload />
        </Box>
      </Paper>
    </Box>
  );
};

export default UploadPage;