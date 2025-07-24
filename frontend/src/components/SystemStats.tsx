import React from 'react';
import { Paper, Typography, Grid, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { useQuery } from 'react-query';
import { getSystemStats } from '../services/api.ts';

const SystemStats: React.FC = () => {
  const { data: systemStats, isLoading, error } = useQuery(
    'system-stats',
    getSystemStats,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">Failed to load system statistics</Alert>
      </Paper>
    );
  }

  const stats = [
    { 
      label: 'Total Drawings', 
      value: systemStats?.total_drawings?.toString() || '0', 
      color: '#1976d2' 
    },
    { 
      label: 'Components Found', 
      value: systemStats?.total_components?.toString() || '0', 
      color: '#388e3c' 
    },
    { 
      label: 'Processing Queue', 
      value: systemStats?.processing_queue?.toString() || '0', 
      color: '#f57c00' 
    },
    { 
      label: 'Success Rate', 
      value: `${systemStats?.success_rate || 0}%`, 
      color: '#7b1fa2' 
    },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        System Statistics
      </Typography>
      <Grid container spacing={2}>
        {stats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default SystemStats;