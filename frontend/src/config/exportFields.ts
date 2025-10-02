import { FieldGroup } from '../types/export.types';

/**
 * Static field group definitions for CSV export
 *
 * Note: Some fields (project_name, component_count, created_at, updated_at) may not
 * exist in the Drawing interface but are defined here for future extensibility.
 * The export service will handle missing fields gracefully.
 */
export const EXPORT_FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'basic',
    label: 'Basic Drawing Info',
    defaultExpanded: true,
    fields: [
      {
        key: 'id',
        label: 'Drawing ID',
        type: 'string',
        group: 'basic'
      },
      {
        key: 'file_name',
        label: 'File Name',
        type: 'string',
        group: 'basic'
      },
      {
        key: 'processing_status',
        label: 'Status',
        type: 'string',
        group: 'basic'
      },
      {
        key: 'file_size',
        label: 'File Size (bytes)',
        type: 'number',
        group: 'basic'
      },
      {
        key: 'upload_date',
        label: 'Upload Date',
        type: 'date',
        group: 'basic'
      }
    ]
  },
  {
    id: 'project',
    label: 'Project Association',
    defaultExpanded: false,
    fields: [
      {
        key: 'project_id',
        label: 'Project ID',
        type: 'string',
        group: 'project'
      },
      {
        key: 'project_name',
        label: 'Project Name',
        type: 'string',
        group: 'project'
      }
    ]
  },
  {
    id: 'components',
    label: 'Component Data',
    defaultExpanded: false,
    fields: [
      {
        key: 'component_count',
        label: 'Component Count',
        type: 'number',
        group: 'components'
      },
      {
        key: 'component_view_link',
        label: 'View Component',
        type: 'url',
        group: 'components'
      }
      // Dynamic component fields will be added via getComponentDataFields()
    ]
  },
  {
    id: 'metadata',
    label: 'Metadata & Processing',
    defaultExpanded: false,
    fields: [
      {
        key: 'created_at',
        label: 'Created At',
        type: 'date',
        group: 'metadata'
      },
      {
        key: 'updated_at',
        label: 'Updated At',
        type: 'date',
        group: 'metadata'
      },
      {
        key: 'drawing_type',
        label: 'Drawing Type',
        type: 'string',
        group: 'metadata'
      },
      {
        key: 'sheet_number',
        label: 'Sheet Number',
        type: 'string',
        group: 'metadata'
      },
      {
        key: 'processing_progress',
        label: 'Processing Progress (%)',
        type: 'number',
        group: 'metadata'
      }
    ]
  }
];
