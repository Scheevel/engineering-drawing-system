/**
 * Proof-of-Concept: Field Reordering with @dnd-kit
 *
 * Demonstrates drag-and-drop functionality for schema field reordering
 * with React 18.2.0 and Material-UI v5.14.0 compatibility.
 */

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Stack,
} from '@mui/material';
import {
  DragIndicator as DragIndicatorIcon,
  TextFields as TextFieldsIcon,
  Numbers as NumbersIcon,
  CheckBox as CheckBoxIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

// Mock field data for demonstration
interface SchemaField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  required: boolean;
}

const mockFields: SchemaField[] = [
  { id: '1', name: 'Component Name', type: 'text', required: true },
  { id: '2', name: 'Quantity', type: 'number', required: true },
  { id: '3', name: 'Material Type', type: 'text', required: false },
  { id: '4', name: 'Is Active', type: 'boolean', required: false },
  { id: '5', name: 'Created Date', type: 'date', required: true },
];

// Individual sortable field item component
interface SortableFieldItemProps {
  field: SchemaField;
}

const SortableFieldItem: React.FC<SortableFieldItemProps> = ({ field }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS?.Transform?.toString(transform) || undefined,
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return <TextFieldsIcon />;
      case 'number': return <NumbersIcon />;
      case 'boolean': return <CheckBoxIcon />;
      case 'date': return <CalendarIcon />;
      default: return <TextFieldsIcon />;
    }
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: isDragging ? 'grabbing' : 'grab',
        border: isDragging ? '2px dashed #1976d2' : '1px solid #e0e0e0',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
      }}
      {...attributes}
    >
      <IconButton
        {...listeners}
        size="small"
        sx={{
          cursor: 'grab',
          '&:active': { cursor: 'grabbing' }
        }}
        aria-label="Drag to reorder field"
      >
        <DragIndicatorIcon />
      </IconButton>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getFieldIcon(field.type)}
        <Typography variant="body1" fontWeight={500}>
          {field.name}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ ml: 'auto' }}>
        <Chip
          label={field.type}
          size="small"
          color="primary"
          variant="outlined"
        />
        {field.required && (
          <Chip
            label="Required"
            size="small"
            color="error"
            variant="outlined"
          />
        )}
      </Stack>
    </Paper>
  );
};

// Main demo component
const FieldReorderingDemo: React.FC = () => {
  const [fields, setFields] = useState<SchemaField[]>(mockFields);

  // Configure sensors for accessibility and touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Field Reordering Demo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Drag fields to reorder them. Supports keyboard navigation (Tab + Space/Enter) and touch interactions.
      </Typography>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={fields.map(f => f.id)}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((field) => (
            <SortableFieldItem
              key={field.id}
              field={field}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Fields can be reordered by dragging the handle or using keyboard navigation.
        This demonstrates the foundation for schema field management.
      </Typography>
    </Box>
  );
};

export default FieldReorderingDemo;