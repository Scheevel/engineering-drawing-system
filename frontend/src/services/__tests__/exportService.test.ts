import {
  formatValue,
  generateCSV,
  getComponentDataFields,
  safeExportDrawingsToCSV,
} from '../exportService';
import { ExportField } from '../../types/export.types';

describe('exportService', () => {
  describe('formatValue', () => {
    it('should handle URL type with HYPERLINK formula', () => {
      const drawing = {
        id: 'abc123',
        file_name: 'test.jpg',
        component_id: 'def456',
      };
      const result = formatValue('dummy_value', 'url', drawing);
      expect(result).toMatch(/^=HYPERLINK\(/);
      expect(result).toContain('test.jpg');
      expect(result).toContain('abc123');
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
  });

  describe('generateCSV', () => {
    it('should include actual component data fields in CSV', () => {
      const drawings = [
        {
          id: '1',
          file_name: 'test.jpg',
          components: [
            {
              piece_mark: 'C63',
              dimension_length: 120.5,
              custom_field: 'value',
            },
          ],
        },
      ];

      const selectedFields: ExportField[] = [
        { key: 'id', label: 'Drawing ID', type: 'string', group: 'basic' },
        { key: 'file_name', label: 'File Name', type: 'string', group: 'basic' },
        { key: 'component_piece_mark', label: 'Piece Mark', type: 'string', group: 'components' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      expect(csv).toContain('Drawing ID');
      expect(csv).toContain('File Name');
      expect(csv).toContain('Piece Mark');
      expect(csv).toContain('test.jpg');
      expect(csv).toContain('C63');
    });

    it('should use field labels for headers, not keys', () => {
      const drawings = [{ id: '1', file_name: 'test.jpg' }];
      const selectedFields: ExportField[] = [
        { key: 'id', label: 'Drawing ID', type: 'string', group: 'basic' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      expect(csv).toContain('Drawing ID');
      expect(csv).not.toContain('"id"'); // Key should not appear as header
    });

    it('should quote all fields', () => {
      const drawings = [{ id: '1', file_name: 'test, with, commas.jpg' }];
      const selectedFields: ExportField[] = [
        { key: 'file_name', label: 'File Name', type: 'string', group: 'basic' },
      ];

      const csv = generateCSV(drawings, selectedFields);

      // papaparse with quotes:true should quote fields
      expect(csv).toContain('"test, with, commas.jpg"');
    });
  });

  describe('safeExportDrawingsToCSV', () => {
    it('should call onError when no drawings provided', () => {
      const onError = jest.fn();
      const selectedFields: ExportField[] = [
        { key: 'id', label: 'ID', type: 'string', group: 'basic' },
      ];

      safeExportDrawingsToCSV([], selectedFields, undefined, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toContain('No drawings');
    });

    it('should call onError when no fields selected', () => {
      const onError = jest.fn();
      const drawings = [{ id: '1', file_name: 'test.jpg' }];

      safeExportDrawingsToCSV(drawings, [], undefined, onError);

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0].message).toContain('No fields');
    });
  });
});
