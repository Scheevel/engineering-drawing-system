import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Description as FileIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { uploadDrawing } from '../services/api.ts';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  drawingId?: string;
  isDuplicate?: boolean;
}

const DrawingUpload: React.FC = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending' as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const uploadFile = async (uploadFile: UploadFile) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
      )
    );

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 20, 90) }
              : f
          )
        );
      }, 200);

      const result = await uploadDrawing(uploadFile.file, projectId);

      clearInterval(progressInterval);

      // Check if this is a duplicate
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { 
                ...f, 
                status: 'success', 
                progress: 100, 
                drawingId: result.id,
                isDuplicate: result.is_duplicate,
                error: result.is_duplicate ? 'Duplicate file - existing drawing returned' : undefined
              }
            : f
        )
      );
    } catch (error: any) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: 'error',
                progress: 0,
                error: error.response?.data?.detail || error.message || 'Upload failed',
              }
            : f
        )
      );
    }
  };

  const uploadAll = () => {
    files
      .filter((f) => f.status === 'pending')
      .forEach((f) => uploadFile(f));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== 'success'));
  };

  const getFileIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <FileIcon color="action" />;
    }
  };

  const getStatusChip = (file: UploadFile) => {
    switch (file.status) {
      case 'pending':
        return <Chip label="Pending" size="small" />;
      case 'uploading':
        return <Chip label="Uploading" size="small" color="primary" />;
      case 'success':
        return file.isDuplicate 
          ? <Chip label="Duplicate" size="small" color="warning" />
          : <Chip label="Success" size="small" color="success" />;
      case 'error':
        return <Chip label="Failed" size="small" color="error" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive
            ? 'action.hover'
            : isDragReject
            ? 'error.light'
            : 'background.paper',
          border: '2px dashed',
          borderColor: isDragActive
            ? 'primary.main'
            : isDragReject
            ? 'error.main'
            : 'divider',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, color: 'action.active', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? 'Drop files here'
            : isDragReject
            ? 'File type not supported'
            : 'Drag & drop drawings here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          or click to select files
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Supported formats: PDF, JPEG, PNG (Max 50MB)
        </Typography>
      </Paper>

      {files.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Upload Queue ({files.length})</Typography>
            <Stack direction="row" spacing={1}>
              {pendingCount > 0 && (
                <Button
                  variant="contained"
                  size="small"
                  onClick={uploadAll}
                  disabled={uploadingCount > 0}
                  startIcon={<CloudUploadIcon />}
                >
                  Upload All ({pendingCount})
                </Button>
              )}
              {files.some((f) => f.status === 'success') && (
                <Button size="small" onClick={clearCompleted} color="secondary">
                  Clear Completed
                </Button>
              )}
            </Stack>
          </Stack>

          <List>
            {files.map((file) => (
              <ListItem key={file.id} divider>
                <Box sx={{ mr: 2 }}>{getFileIcon(file.status)}</Box>
                <ListItemText
                  primary={file.file.name}
                  secondary={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="caption">
                        {formatFileSize(file.file.size)}
                      </Typography>
                      {getStatusChip(file)}
                      {file.error && (
                        <Typography variant="caption" color="error">
                          {file.error}
                        </Typography>
                      )}
                    </Stack>
                  }
                />
                {file.status === 'uploading' && (
                  <Box sx={{ width: 100, mr: 2 }}>
                    <LinearProgress variant="determinate" value={file.progress} />
                  </Box>
                )}
                <ListItemSecondaryAction>
                  {file.status === 'pending' && (
                    <Button
                      size="small"
                      onClick={() => uploadFile(file)}
                      disabled={uploadingCount > 0}
                    >
                      Upload
                    </Button>
                  )}
                  <IconButton
                    edge="end"
                    onClick={() => removeFile(file.id)}
                    disabled={file.status === 'uploading'}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {files.length === 0 && (
        <Alert severity="info">
          No files selected. Drag and drop drawing files or click the area above to select.
        </Alert>
      )}
    </Box>
  );
};

export default DrawingUpload;