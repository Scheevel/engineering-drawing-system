/**
 * Virtual Field List Component
 *
 * High-performance virtual scrolling component for rendering large lists
 * of schema fields with smooth scrolling and memory optimization.
 */

import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { Box, List, ListItem, Typography, Skeleton } from '@mui/material';
import { FixedSizeList as WindowedList } from 'react-window';
import { ComponentSchemaField } from '../../types/schema';
import { useVirtualScroll, usePerformanceMonitor } from '../../hooks/schema/usePerformanceOptimizations';
import { useSchemaConfig } from '../../config/schemaConfig';

// ========================================
// INTERFACES
// ========================================

export interface VirtualFieldListProps {
  fields: ComponentSchemaField[];
  onFieldSelect: (field: ComponentSchemaField) => void;
  onFieldEdit: (field: ComponentSchemaField) => void;
  onFieldDelete: (field: ComponentSchemaField) => void;
  selectedFieldIds: Set<string>;
  height: number;
  itemHeight?: number;
  renderField?: (field: ComponentSchemaField, index: number) => React.ReactNode;
  loading?: boolean;
  empty?: React.ReactNode;
  overscanCount?: number;
  enableDynamicHeight?: boolean;
  onScroll?: (scrollTop: number) => void;
}

interface FieldItemProps {
  field: ComponentSchemaField;
  index: number;
  isSelected: boolean;
  onSelect: (field: ComponentSchemaField) => void;
  onEdit: (field: ComponentSchemaField) => void;
  onDelete: (field: ComponentSchemaField) => void;
  style?: React.CSSProperties;
  renderCustom?: (field: ComponentSchemaField, index: number) => React.ReactNode;
}

// ========================================
// MEMOIZED FIELD ITEM COMPONENT
// ========================================

const FieldItem: React.FC<FieldItemProps> = React.memo(({
  field,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  style,
  renderCustom,
}) => {
  const performanceMonitor = usePerformanceMonitor(`FieldItem-${field.id}`);

  useEffect(() => {
    performanceMonitor.start();
    return () => {
      performanceMonitor.end();
    };
  }, [performanceMonitor]);

  const handleClick = useCallback(() => {
    onSelect(field);
  }, [field, onSelect]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(field);
  }, [field, onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(field);
  }, [field, onDelete]);

  // Custom renderer override
  if (renderCustom) {
    return (
      <div style={style}>
        {renderCustom(field, index)}
      </div>
    );
  }

  return (
    <ListItem
      style={style}
      onClick={handleClick}
      selected={isSelected}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        '&.Mui-selected': {
          backgroundColor: 'primary.light',
          '&:hover': {
            backgroundColor: 'primary.main',
          },
        },
      }}
    >
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" component="div">
            {field.field_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {field.field_type} • Order: {field.display_order}
            {field.is_required && ' • Required'}
          </Typography>
          {field.help_text && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {field.help_text}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <button
            onClick={handleEdit}
            style={{
              padding: '4px 8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: '4px 8px',
              border: '1px solid #f44336',
              borderRadius: '4px',
              backgroundColor: 'transparent',
              color: '#f44336',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Delete
          </button>
        </Box>
      </Box>
    </ListItem>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.field.id === nextProps.field.id &&
    prevProps.field.field_name === nextProps.field.field_name &&
    prevProps.field.field_type === nextProps.field.field_type &&
    prevProps.field.display_order === nextProps.field.display_order &&
    prevProps.field.is_required === nextProps.field.is_required &&
    prevProps.field.help_text === nextProps.field.help_text &&
    prevProps.field.updated_at === nextProps.field.updated_at &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.index === nextProps.index
  );
});

FieldItem.displayName = 'FieldItem';

// ========================================
// LOADING SKELETON COMPONENT
// ========================================

const FieldItemSkeleton: React.FC<{ style?: React.CSSProperties }> = React.memo(({ style }) => (
  <ListItem style={style}>
    <Box sx={{ width: '100%' }}>
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="text" width="40%" height={16} />
      <Skeleton variant="text" width="80%" height={14} />
    </Box>
  </ListItem>
));

FieldItemSkeleton.displayName = 'FieldItemSkeleton';

// ========================================
// VIRTUAL FIELD LIST COMPONENT
// ========================================

const VirtualFieldList: React.FC<VirtualFieldListProps> = ({
  fields,
  onFieldSelect,
  onFieldEdit,
  onFieldDelete,
  selectedFieldIds,
  height,
  itemHeight = 80,
  renderField,
  loading = false,
  empty,
  overscanCount = 5,
  enableDynamicHeight = false,
  onScroll,
}) => {
  const { config } = useSchemaConfig();
  const listRef = useRef<WindowedList>(null);
  const performanceMonitor = usePerformanceMonitor('VirtualFieldList');
  const [isScrolling, setIsScrolling] = useState(false);

  // Check if virtual scrolling should be enabled
  const shouldUseVirtualScrolling = useMemo(() => {
    return config.performance.enableVirtualScrolling &&
           fields.length >= config.performance.virtualScrollThreshold;
  }, [config.performance.enableVirtualScrolling, config.performance.virtualScrollThreshold, fields.length]);

  // Performance monitoring
  useEffect(() => {
    performanceMonitor.start();
    return () => {
      performanceMonitor.end();
    };
  }, [performanceMonitor, fields.length]);

  // Memoized row renderer for react-window
  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      if (loading) {
        return <FieldItemSkeleton style={style} />;
      }

      const field = fields[index];
      if (!field) {
        return <div style={style} />;
      }

      const isSelected = selectedFieldIds.has(field.id);

      return (
        <FieldItem
          key={field.id}
          field={field}
          index={index}
          isSelected={isSelected}
          onSelect={onFieldSelect}
          onEdit={onFieldEdit}
          onDelete={onFieldDelete}
          style={style}
          renderCustom={renderField}
        />
      );
    },
    [fields, selectedFieldIds, onFieldSelect, onFieldEdit, onFieldDelete, renderField, loading]
  );

  // Handle scroll events
  const handleScroll = useCallback(
    ({ scrollTop }: { scrollTop: number }) => {
      onScroll?.(scrollTop);
    },
    [onScroll]
  );

  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const handleScrollStop = useCallback(() => {
    setIsScrolling(false);
  }, []);

  // Scroll to field helper
  const scrollToField = useCallback(
    (fieldId: string) => {
      const index = fields.findIndex(field => field.id === fieldId);
      if (index !== -1 && listRef.current) {
        listRef.current.scrollToItem(index, 'center');
      }
    },
    [fields]
  );

  // Expose scroll function
  useEffect(() => {
    if (listRef.current && (window as any).scrollToField !== scrollToField) {
      (window as any).scrollToField = scrollToField;
    }
  }, [scrollToField]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ height, overflow: 'hidden' }}>
        <List>
          {Array.from({ length: 10 }).map((_, index) => (
            <FieldItemSkeleton key={index} />
          ))}
        </List>
      </Box>
    );
  }

  // Empty state
  if (fields.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        {empty || (
          <Typography variant="body2">
            No fields available. Add fields to get started.
          </Typography>
        )}
      </Box>
    );
  }

  // Use virtual scrolling for large lists
  if (shouldUseVirtualScrolling) {
    return (
      <Box
        sx={{
          height,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {isScrolling && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1,
              py: 0.5,
            }}
          >
            <Typography variant="caption">Scrolling...</Typography>
          </Box>
        )}

        <WindowedList
          ref={listRef}
          height={height}
          itemCount={fields.length}
          itemSize={itemHeight}
          overscanCount={overscanCount}
          onScroll={handleScroll}
          onItemsRendered={() => {
            // Could implement additional optimizations here
          }}
        >
          {renderRow}
        </WindowedList>
      </Box>
    );
  }

  // Regular list for smaller datasets
  return (
    <Box
      sx={{
        height,
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <List>
        {fields.map((field, index) => {
          const isSelected = selectedFieldIds.has(field.id);
          return (
            <FieldItem
              key={field.id}
              field={field}
              index={index}
              isSelected={isSelected}
              onSelect={onFieldSelect}
              onEdit={onFieldEdit}
              onDelete={onFieldDelete}
              renderCustom={renderField}
            />
          );
        })}
      </List>
    </Box>
  );
};

// ========================================
// EXPORTS
// ========================================

export default React.memo(VirtualFieldList);
export { FieldItem, FieldItemSkeleton };