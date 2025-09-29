/**
 * Batch Field Operations Demo Component
 *
 * Demonstrates efficient batch processing for multiple field operations
 * with progress tracking, rollback capabilities, and performance optimization.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  LinearProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  PlayArrow as ProcessIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapVert as ReorderIcon,
  Undo as UndoIcon,
  Speed as SpeedIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';

import { useBatchOperations, BatchOperationResult, BatchOperationType } from '../../services/batchOperationsService';
import { ComponentSchemaFieldCreate, ComponentSchemaFieldUpdate } from '../../services/api';

// ========================================
// INTERFACES
// ========================================

interface BatchFieldOperationsDemoProps {
  schemaId: string;
  onOperationsComplete?: (results: BatchOperationResult[]) => void;
  disabled?: boolean;
}

interface OperationPreview {
  id: string;
  type: BatchOperationType;
  description: string;
  fieldName?: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

// ========================================
// MAIN COMPONENT
// ========================================

const BatchFieldOperationsDemo: React.FC<BatchFieldOperationsDemoProps> = ({
  schemaId,
  onOperationsComplete,
  disabled = false,
}) => {
  const {
    addCreateOperation,
    addUpdateOperation,
    addDeleteOperation,
    addReorderOperation,
    removeOperation,
    processBatch,
    clearOperations,
    flushBatch,
    queueStatus,
    isProcessing,
    results,
    canProcess,
    hasOperations,
  } = useBatchOperations(schemaId);

  const [showResults, setShowResults] = useState(false);
  const [processingOptions, setProcessingOptions] = useState({
    batchSize: 5,
    delayMs: 100,
    validateBefore: true,
    optimisticUpdates: true,
    rollbackOnFailure: true,
  });

  // Create operation previews for display
  const operationPreviews: OperationPreview[] = useMemo(() => {
    return queueStatus.operations.map(op => {
      let description = '';
      let icon: React.ReactNode;
      let color: OperationPreview['color'] = 'primary';

      switch (op.type) {
        case 'create':
          description = `Create field: ${(op.data as any)?.field_name || 'New Field'}`;
          icon = <AddIcon />;
          color = 'success';
          break;
        case 'update':
          description = `Update field: ${(op.data as any)?.field_name || 'Field'}`;
          icon = <EditIcon />;
          color = 'primary';
          break;
        case 'delete':
          description = `Delete field: ${op.fieldId}`;
          icon = <DeleteIcon />;
          color = 'error';
          break;
        case 'reorder':
          description = `Reorder field to position ${op.displayOrder}`;
          icon = <ReorderIcon />;
          color = 'secondary';
          break;
      }

      return {
        id: op.id,
        type: op.type,
        description,
        fieldName: (op.data as any)?.field_name,
        icon,
        color,
      };
    });
  }, [queueStatus.operations]);

  // Demo operations
  const addDemoOperations = useCallback(() => {
    // Add some demo create operations
    addCreateOperation({
      field_name: 'Demo Text Field',
      field_type: 'text',
      is_required: false,
      field_config: { placeholder: 'Enter text here' },
    }, 1);

    addCreateOperation({
      field_name: 'Demo Number Field',
      field_type: 'number',
      is_required: true,
      field_config: { min: 0, max: 100 },
    }, 2);

    // Add update operation
    addUpdateOperation('existing-field-1', {
      field_name: 'Updated Field Name',
      help_text: 'This field has been updated via batch operation',
    });

    // Add reorder operation
    addReorderOperation('existing-field-2', 3);

    // Add delete operation
    addDeleteOperation('existing-field-3');
  }, [addCreateOperation, addUpdateOperation, addReorderOperation, addDeleteOperation]);

  const handleProcessBatch = useCallback(async () => {
    try {
      const batchResults = await processBatch(processingOptions);
      setShowResults(true);
      onOperationsComplete?.(batchResults);
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  }, [processBatch, processingOptions, onOperationsComplete]);

  const getOperationStatusIcon = (type: BatchOperationType, success?: boolean) => {
    if (success === undefined) {
      return <PendingIcon color="action" />;
    }
    return success ? <SuccessIcon color="success" /> : <ErrorIcon color="error" />;
  };

  const getResultStats = () => {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    return { successful, failed, total: results.length };
  };

  const stats = getResultStats();

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <SpeedIcon color="primary" />
          <Typography variant="h6">
            Batch Field Operations Demo
          </Typography>
          <Badge badgeContent={queueStatus.pendingCount} color="primary">
            <PendingIcon />
          </Badge>
        </Box>

        {/* Status Overview */}
        <Card sx={{ mb: 3, bgcolor: 'background.default' }}>
          <CardContent sx={{ pb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Queue Status
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip
                label={`Pending: ${queueStatus.pendingCount}`}
                color="warning"
                size="small"
              />
              <Chip
                label={`Processed: ${queueStatus.processedCount}`}
                color="success"
                size="small"
              />
              <Chip
                label={`Status: ${queueStatus.status}`}
                color={queueStatus.status === 'processing' ? 'info' : 'default'}
                size="small"
              />
            </Stack>

            {isProcessing && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Processing batch operations...
                </Typography>
                <LinearProgress sx={{ mt: 1 }} />
              </Box>
            )}

            {results.length > 0 && (
              <Alert
                severity={stats.failed > 0 ? 'warning' : 'success'}
                sx={{ mt: 2 }}
              >
                Batch completed: {stats.successful} successful, {stats.failed} failed
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Operations Queue */}
        <Typography variant="subtitle1" gutterBottom>
          Queued Operations ({operationPreviews.length})
        </Typography>

        {operationPreviews.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No operations queued. Click "Add Demo Operations" to see batch processing in action.
          </Alert>
        ) : (
          <Box sx={{ mb: 3, maxHeight: 300, overflow: 'auto' }}>
            {operationPreviews.map((preview, index) => {
              const result = results.find(r => r.operationId === preview.id);

              return (
                <Card key={preview.id} sx={{ mb: 1, opacity: disabled ? 0.6 : 1 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {preview.icon}
                        {getOperationStatusIcon(preview.type, result?.success)}
                      </Box>

                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2">
                          {preview.description}
                        </Typography>
                        {result?.error && (
                          <Typography variant="caption" color="error">
                            Error: {result.error}
                          </Typography>
                        )}
                      </Box>

                      <Chip
                        label={preview.type}
                        color={preview.color}
                        size="small"
                      />

                      {!isProcessing && !result && (
                        <IconButton
                          size="small"
                          onClick={() => removeOperation(preview.id)}
                          disabled={disabled}
                        >
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addDemoOperations}
            disabled={disabled || isProcessing}
          >
            Add Demo Operations
          </Button>

          <Button
            variant="contained"
            startIcon={<ProcessIcon />}
            onClick={handleProcessBatch}
            disabled={!canProcess || disabled}
            color="primary"
          >
            Process Batch ({queueStatus.pendingCount})
          </Button>

          <Button
            variant="outlined"
            startIcon={<SpeedIcon />}
            onClick={flushBatch}
            disabled={!canProcess || disabled}
            color="secondary"
          >
            Flush & Process
          </Button>

          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={clearOperations}
            disabled={disabled || isProcessing || !hasOperations}
          >
            Clear Queue
          </Button>

          {results.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<SuccessIcon />}
              onClick={() => setShowResults(true)}
            >
              View Results
            </Button>
          )}
        </Box>

        {/* Performance Configuration */}
        <Card sx={{ mt: 3, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Performance Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Batch Size: {processingOptions.batchSize} operations •
              Delay: {processingOptions.delayMs}ms •
              Validation: {processingOptions.validateBefore ? 'Enabled' : 'Disabled'} •
              Rollback: {processingOptions.rollbackOnFailure ? 'Enabled' : 'Disabled'}
            </Typography>
          </CardContent>
        </Card>
      </Paper>

      {/* Results Dialog */}
      <Dialog
        open={showResults}
        onClose={() => setShowResults(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Batch Operation Results
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2}>
              <Chip
                label={`${stats.successful} Successful`}
                color="success"
                icon={<SuccessIcon />}
              />
              <Chip
                label={`${stats.failed} Failed`}
                color="error"
                icon={<ErrorIcon />}
              />
              <Chip
                label={`${stats.total} Total`}
                color="default"
              />
            </Stack>
          </Box>

          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {results.map((result, index) => (
              <Card key={result.operationId} sx={{ mb: 1 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {result.success ? (
                      <SuccessIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2">
                        Operation {index + 1}: {result.success ? 'Success' : 'Failed'}
                      </Typography>
                      {result.error && (
                        <Typography variant="caption" color="error">
                          {result.error}
                        </Typography>
                      )}
                      {result.field && (
                        <Typography variant="caption" color="text.secondary">
                          Field: {result.field.field_name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResults(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BatchFieldOperationsDemo;