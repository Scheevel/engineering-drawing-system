import React from 'react';
import { Paper, Typography, Grid, Card, CardContent, CircularProgress, Alert, Box, IconButton, Tooltip } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useQuery } from 'react-query';
import { getSystemStats } from '../services/api.ts';

const SystemStats: React.FC = () => {
  const { data: systemStats, isLoading, error, refetch } = useQuery(
    'system-stats',
    getSystemStats,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      retry: 1, // Only retry once
      retryDelay: 1000, // 1 second retry delay
    }
  );

  // Mock data for when API is unavailable
  const mockStats = {
    total_drawings: 42,
    total_components: 1337,
    processing_queue: 3,
    success_rate: 95,
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Paper>
    );
  }

  // Use mock data if API fails (e.g., backend not running in development)
  const statsData = error ? mockStats : systemStats;

  const stats = [
    {
      label: 'Total Drawings',
      value: statsData?.total_drawings?.toString() || '0',
      color: '#1976d2'
    },
    {
      label: 'Components Found',
      value: statsData?.total_components?.toString() || '0',
      color: '#388e3c'
    },
    {
      label: 'Processing Queue',
      value: statsData?.processing_queue?.toString() || '0',
      color: '#f57c00'
    },
    {
      label: 'Success Rate',
      value: `${statsData?.success_rate || 0}%`,
      color: '#7b1fa2'
    },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          System Statistics
        </Typography>
        <Tooltip title="Refresh statistics">
          <IconButton onClick={() => refetch()} disabled={isLoading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Using demo data - backend unavailable
        </Alert>
      )}
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