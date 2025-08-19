import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Button,
} from '@mui/material';
import {
  UploadFile as UploadIcon,
  Search as SearchIcon,
  Description as DrawingIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import RecentActivity from '../components/RecentActivity.tsx';
import SystemStats from '../components/SystemStats.tsx';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: 'Upload Drawings',
      description: 'Upload new engineering drawings for processing',
      icon: <UploadIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/upload'),
      color: '#1976d2',
    },
    {
      title: 'Search Components',
      description: 'Find components across all drawings',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/search'),
      color: '#388e3c',
    },
    {
      title: 'View Drawings',
      description: 'Browse uploaded drawings',
      icon: <DrawingIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/drawings'),
      color: '#f57c00',
    },
    {
      title: 'System Reports',
      description: 'View processing statistics and reports',
      icon: <StatsIcon sx={{ fontSize: 40 }} />,
      action: () => navigate('/reports'),
      color: '#7b1fa2',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {quickActions.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease-in-out'
                    }
                  }}
                  onClick={action.action}
                >
                  <CardContent sx={{ textAlign: 'center', p: 3 }}>
                    <Box sx={{ color: action.color, mb: 2 }}>
                      {action.icon}
                    </Box>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* System Stats */}
        <Grid item xs={12} md={8}>
          <SystemStats />
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <RecentActivity />
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;