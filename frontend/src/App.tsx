import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Container, useTheme } from '@mui/material';
import Dashboard from './pages/Dashboard.tsx';
import SearchPage from './pages/SearchPage.tsx';
import DrawingViewer from './pages/DrawingViewer.tsx';
import UploadPage from './pages/UploadPage.tsx';
import ComponentEditor from './pages/ComponentEditor.tsx';
import ProjectsPage from './pages/ProjectsPage.tsx';
import Navigation from './components/Navigation.tsx';

const App: React.FC = () => {
  const theme = useTheme();
  const [drawerExpanded, setDrawerExpanded] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              whiteSpace: 'nowrap',
              overflow: 'visible',
              minWidth: 'fit-content'
            }}
          >
            Engineering Drawing Index System
          </Typography>
        </Toolbar>
      </AppBar>
      <Toolbar />
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Navigation onDrawerToggle={setDrawerExpanded} />
        
        <Container 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: 3,
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/drawings/:id" element={<DrawingViewer />} />
            <Route path="/drawing-viewer/:id" element={<DrawingViewer />} />
            <Route path="/component/:id" element={<ComponentEditor />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
};

export default App;
