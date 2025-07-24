import React from 'react';
import { Paper, Typography, List, ListItem, ListItemText } from '@mui/material';

const RecentActivity: React.FC = () => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Recent Activity
      </Typography>
      <List>
        <ListItem>
          <ListItemText primary="No recent activity" secondary="Upload drawings to see activity" />
        </ListItem>
      </List>
    </Paper>
  );
};

export default RecentActivity;