import { FieldGroup } from '../types/export.types';

/**
 * Field group definitions for component-centric CSV export
 *
 * COMPONENT-CENTRIC MODEL (Story 7.1.1):
 * - Primary entity: Components (each row = 1 component)
 * - Secondary entity: Drawing context (parent drawing reference)
 * - Component Data group is expanded by default
 * - Drawing Context group is collapsed by default
 *
 * Dynamic component fields are added via getComponentDataFields() based on actual data.
 */
export const EXPORT_FIELD_GROUPS: FieldGroup[] = [
  {
    id: 'components',
    label: 'Component Data',
    defaultExpanded: true,  // Primary data - expanded by default
    fields: [
      {
        key: 'component_id',
        label: 'Component ID',
        type: 'string',
        group: 'components'
      },
      {
        key: 'component_piece_mark',
        label: 'Piece Mark',
        type: 'string',
        group: 'components'
      },
      {
        key: 'component_view_link',
        label: 'View Component',
        type: 'url',
        group: 'components'
      }
      // Dynamic component fields (dimensions, material, etc.) added via getComponentDataFields()
    ]
  },
  {
    id: 'drawing_context',
    label: 'Drawing Context',
    defaultExpanded: false,  // Secondary data - collapsed by default
    fields: [
      {
        key: 'drawing_id',
        label: 'Drawing ID',
        type: 'string',
        group: 'drawing_context'
      },
      {
        key: 'drawing_file_name',
        label: 'Drawing File Name',
        type: 'string',
        group: 'drawing_context'
      },
      {
        key: 'drawing_project_name',
        label: 'Project Name',
        type: 'string',
        group: 'drawing_context'
      },
      {
        key: 'drawing_upload_date',
        label: 'Upload Date',
        type: 'date',
        group: 'drawing_context'
      },
      {
        key: 'drawing_processing_status',
        label: 'Drawing Status',
        type: 'string',
        group: 'drawing_context'
      }
    ]
  },
  {
    id: 'component_metadata',
    label: 'Component Metadata',
    defaultExpanded: false,
    fields: [
      {
        key: 'component_created_at',
        label: 'Component Created At',
        type: 'date',
        group: 'component_metadata'
      },
      {
        key: 'component_updated_at',
        label: 'Component Updated At',
        type: 'date',
        group: 'component_metadata'
      }
    ]
  }
];
