/**
 * exportService.test.ts - Component-centric CSV export tests
 *
 * Tests validate the component-centric data model (Story 7.1.1):
 * - formatValue: URL generation with both component and drawing IDs
 * - generateCSV: Each component = 1 row (not each drawing)
 * - getComponentDataFields: Dynamic field discovery from component data
 * - safeExportDrawingsToCSV: Validation checks component count (not drawing count)
 *
 * Key Test Assertions:
 * - CSV row count = total component count across all drawings
 * - Drawing context fields populated correctly for each component
 * - Drawings with 0 components excluded from export
 */
import {
  formatValue,
  generateCSV,
  getComponentDataFields,
  safeExportDrawingsToCSV,
} from '../exportService';
import { ExportField } from '../../types/export.types';

describe('exportService', () => {
  describe('formatValue', () => {
    it('should handle URL type with HYPERLINK formula (component-centric)', () => {
      const context = {
        component: {
          id: 'comp456',
          piece_mark: 'C63',
        },
        drawing: {
          id: 'draw123',
          file_name: 'test.jpg',
        },
      };
      const result = formatValue('dummy_value', 'url', context);
      expect(result).toMatch(/^=HYPERLINK\(/);
      expect(result).toContain('C63'); // Component piece_mark as link text
      expect(result).toContain('draw123'); // Drawing ID in URL
      expect(result).toContain('comp456'); // Component ID in URL
    });

    it('should format dates to locale string', () => {
      const date = '2025-01-15T10:30:00Z';
      const result = formatValue(date, 'date');
      expect(result).toContain('2025');
      expect(result).toContain('01');
      expect(result).toContain('15');
    });

    it('should handle null/undefined as empty string', () => {
      expect(formatValue(null, 'string')).toBe('');
      expect(formatValue(undefined, 'string')).toBe('');
    });

    it('should convert numbers to strings', () => {
      const result = formatValue(123.45, 'number');
      expect(result).toBe('123.45');
    });

    it('should handle string values', () => {
      const result = formatValue('test value', 'string');
      expect(result).toBe('test value');
    });
  });

  describe('getComponentDataFields', () => {
    it('should discover fields from actual component data', () => {
      const drawings = [
        {
          components: [
            {
              id: 'comp1',
              drawing_id: 'draw1',
              piece_mark: 'C63',
              dimension_length: 120.5,
              custom_field: 'value',
              created_at: '2025-01-01',
            },
          ],
        },
      ];

      const fields = getComponentDataFields(drawings);

      // Should exclude id, drawing_id, created_at
      expect(fields.length).toBe(3);
      expect(fields.some(f => f.key === 'component_piece_mark')).toBe(true);
      expect(fields.some(f => f.key === 'component_dimension_length')).toBe(true);
      expect(fields.some(f => f.key === 'component_custom_field')).toBe(true);
    });

    it('should handle drawings with no components', () => {
      const drawings = [{ id: '1', file_name: 'test.jpg' }];
      const fields = getComponentDataFields(drawings);
      expect(fields).toEqual([]);
    });

    it('should detect field types correctly', () => {
      const drawings = [
        {
          components: [
            {
              text_field: 'text',
              number_field: 123,
            },
          ],
        },
      ];

      const fields = getComponentDataFields(drawings);
      const textField = fields.find(f => f.key === 'component_text_field');
      const numberField = fields.find(f => f.key === 'component_number_field');

      expect(textField?.type).toBe('string');
      expect(numberField?.type).toBe('number');
    });

    it('should convert field keys to human-readable labels', () => {
      const drawings = [
        {
          components: [{ piece_mark: 'C63' }],
        },
      ];

      const fields = getComponentDataFields(drawings);
      const field = fields.find(f => f.key === 'component_piece_mark');

      expect(field?.label).toBe('Piece Mark'); // "piece_mark" → "Piece Mark"
    });

    it('should exclude fields that already exist in static config', () => {
      const drawings = [
        {
          components: [
            {
              piece_mark: 'C63', // This field exists in static config
              custom_field: 'value', // This field does not
            },
          ],
        },
      ];

      const existingFieldKeys = new Set(['component_piece_mark']);
      const fields = getComponentDataFields(drawings, existingFieldKeys);

      // Should only include custom_field, not piece_mark
      expect(fields.length).toBe(1);
      expect(fields.some(f => f.key === 'component_piece_mark')).toBe(false);
      expect(fields.some(f => f.key === 'component_custom_field')).toBe(true);
    });
  });

  describe('generateCSV', () => {
    it('should generate one row per component (component-centric)', () => {
      const drawings = [
        {
          id: 'draw1',
          file_name: 'test.jpg',
          components: [
            { id: 'comp1', piece_mark: 'C63', dimension_length: 120.5 },
            { id: 'comp2', piece_mark: 'G14', dimension_length: 85.3 },
            { id: 'comp3', piece_mark: 'B22', dimension_length: 200.0 },
          ],
        },
      ];

      const selectedFields: ExportField[] = [
        { key: 'component_piece_mark', label: 'Piece Mark', type: 'string', group: 'components' },
        { key: 'drawing_file_name', label: 'Drawing File Name', type: 'string', group: 'drawing_context' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      // Should have 3 component rows + 1 header row = 4 lines
      const lines = csv.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(4); // 1 header + 3 components

      // All components should appear
      expect(csv).toContain('C63');
      expect(csv).toContain('G14');
      expect(csv).toContain('B22');

      // Each component row should have drawing context
      expect(csv.match(/test\.jpg/g)?.length).toBe(3); // Drawing name appears 3 times (once per component)
    });

    it('should exclude drawings with zero components', () => {
      const drawings = [
        { id: 'draw1', file_name: 'with_components.jpg', components: [{ id: 'comp1', piece_mark: 'C63' }] },
        { id: 'draw2', file_name: 'no_components.jpg', components: [] },
      ];

      const selectedFields: ExportField[] = [
        { key: 'component_piece_mark', label: 'Piece Mark', type: 'string', group: 'components' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      // Should only have 1 component row + 1 header
      const lines = csv.split('\n').filter(line => line.trim());
      expect(lines.length).toBe(2);
      expect(csv).toContain('C63');
      expect(csv).not.toContain('no_components.jpg');
    });

    it('should use field labels for headers, not keys', () => {
      const drawings = [
        {
          id: '1',
          file_name: 'test.jpg',
          components: [{ id: 'comp1', piece_mark: 'C63' }],
        },
      ];
      const selectedFields: ExportField[] = [
        { key: 'component_piece_mark', label: 'Piece Mark', type: 'string', group: 'components' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      expect(csv).toContain('Piece Mark');
      expect(csv).not.toContain('"component_piece_mark"'); // Key should not appear as header
    });

    it('should handle drawing context fields with drawing_ prefix', () => {
      const drawings = [
        {
          id: 'draw1',
          file_name: 'test.jpg',
          project_name: 'Project A',
          components: [{ id: 'comp1', piece_mark: 'C63' }],
        },
      ];

      const selectedFields: ExportField[] = [
        { key: 'drawing_id', label: 'Drawing ID', type: 'string', group: 'drawing_context' },
        { key: 'drawing_file_name', label: 'Drawing File Name', type: 'string', group: 'drawing_context' },
        { key: 'drawing_project_name', label: 'Project Name', type: 'string', group: 'drawing_context' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      expect(csv).toContain('Drawing ID');
      expect(csv).toContain('Drawing File Name');
      expect(csv).toContain('Project Name');
      expect(csv).toContain('draw1');
      expect(csv).toContain('test.jpg');
      expect(csv).toContain('Project A');
    });
  });

  describe('safeExportDrawingsToCSV', () => {
    it('should call onError when no components available (component-centric)', () => {
      const onError = jest.fn();
      const selectedFields: ExportField[] = [
        { key: 'component_piece_mark', label: 'Piece Mark', type: 'string', group: 'components' },
      ];

      // Empty drawings array
      safeExportDrawingsToCSV([], selectedFields, undefined, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toContain('No components');
    });

    it('should call onError when drawings have zero components', () => {
      const onError = jest.fn();
      const selectedFields: ExportField[] = [
        { key: 'component_piece_mark', label: 'Piece Mark', type: 'string', group: 'components' },
      ];

      // Drawings with empty components arrays
      const drawings = [
        { id: '1', file_name: 'test1.jpg', components: [] },
        { id: '2', file_name: 'test2.jpg', components: [] },
      ];

      safeExportDrawingsToCSV(drawings, selectedFields, undefined, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('No components');
    });

    it('should call onError when no fields selected', () => {
      const onError = jest.fn();
      const drawings = [
        {
          id: '1',
          file_name: 'test.jpg',
          components: [{ id: 'comp1', piece_mark: 'C63' }],
        },
      ];

      safeExportDrawingsToCSV(drawings, [], undefined, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('No fields');
    });
  });
});
