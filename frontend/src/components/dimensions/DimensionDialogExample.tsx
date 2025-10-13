/**
 * Example Usage of DimensionFormDialog
 *
 * Story 6.1: Integration example showing how to use dimension dialogs
 * This file demonstrates the integration pattern for ComponentDimensions.tsx
 */

import React, { useState } from 'react';
import { Button, Box } from '@mui/material';
import { DimensionFormDialog } from './DimensionFormDialog';

interface DimensionData {
  id?: string;
  dimension_type: string;
  nominal_value: number;
  display_format?: 'decimal' | 'fraction';
  unit: string;
  tolerance?: string;
}

/**
 * Example component showing dimension dialog integration
 */
export const DimensionDialogExample: React.FC<{ componentId: string }> = ({
  componentId,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDimension, setEditDimension] = useState<DimensionData | null>(null);

  // Example dimension data for edit mode
  const exampleDimension: DimensionData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    dimension_type: 'length',
    nominal_value: 15.75,
    display_format: 'fraction',
    unit: 'in',
    tolerance: '±0.01',
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant="contained"
        onClick={() => setAddDialogOpen(true)}
        sx={{ mr: 2 }}
      >
        Add Dimension
      </Button>

      <Button
        variant="outlined"
        onClick={() => setEditDimension(exampleDimension)}
      >
        Edit Example Dimension
      </Button>

      {/* Add Dimension Dialog */}
      <DimensionFormDialog
        open={addDialogOpen}
        mode="create"
        componentId={componentId}
        onClose={() => setAddDialogOpen(false)}
        onSuccess={(data) => {
          console.log('Dimension created:', data);
          setAddDialogOpen(false);
          // In real implementation: queryClient.invalidateQueries(['component-dimensions', componentId]);
        }}
        onError={(error) => {
          console.error('Error creating dimension:', error);
        }}
      />

      {/* Edit Dimension Dialog */}
      <DimensionFormDialog
        open={!!editDimension}
        mode="edit"
        componentId={componentId}
        initialData={editDimension || undefined}
        onClose={() => setEditDimension(null)}
        onSuccess={(data) => {
          console.log('Dimension updated:', data);
          setEditDimension(null);
          // In real implementation: queryClient.invalidateQueries(['component-dimensions', componentId]);
        }}
        onError={(error) => {
          console.error('Error updating dimension:', error);
        }}
      />
    </Box>
  );
};

/**
 * Integration Notes:
 *
 * To integrate these dialogs into ComponentDimensions.tsx:
 *
 * 1. Import the dialog:
 *    import { DimensionFormDialog } from './dimensions/DimensionFormDialog';
 *
 * 2. Add state management:
 *    const [addDialogOpen, setAddDialogOpen] = useState(false);
 *    const [editDimension, setEditDimension] = useState<Dimension | null>(null);
 *
 * 3. Wire up buttons:
 *    <Button onClick={() => setAddDialogOpen(true)}>Add Dimension</Button>
 *    <IconButton onClick={() => setEditDimension(dimension)}><EditIcon /></IconButton>
 *
 * 4. Add dialog components:
 *    <DimensionFormDialog
 *      open={addDialogOpen}
 *      mode="create"
 *      componentId={componentId}
 *      onClose={() => setAddDialogOpen(false)}
 *      onSuccess={() => {
 *        setAddDialogOpen(false);
 *        queryClient.invalidateQueries(['component-dimensions', componentId]);
 *      }}
 *    />
 *
 * 5. For deletion, use a ConfirmDialog component (not included here).
 */
