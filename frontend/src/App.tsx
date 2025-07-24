import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import Dashboard from './pages/Dashboard.tsx';
import SearchPage from './pages/SearchPage.tsx';
import DrawingViewer from './pages/DrawingViewer.tsx';
import UploadPage from './pages/UploadPage.tsx';
import ComponentEditor from './pages/ComponentEditor.tsx';
import Navigation from './components/Navigation.tsx';

const App: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Engineering Drawing Index System
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box sx={{ display: 'flex', flexGrow: 1 }}>
        <Navigation />
        
        <Container component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/upload" element={<UploadPage />} />
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
