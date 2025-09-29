/**
 * Schema Management Service
 *
 * Enhanced service layer for schema management operations,
 * building on the existing flexible component schema API.
 * Provides administrative operations, bulk management, and advanced features.
 */

import {
  ComponentSchema,
  ComponentSchemaCreate,
  ComponentSchemaUpdate,
  ComponentSchemaField,
  ComponentSchemaFieldCreate,
  ComponentSchemaFieldUpdate,
  FlexibleComponent,
  SchemaValidationResult,
  getProjectSchemas,
  getSchema,
  createSchema,
  updateSchema,
  deactivateSchema,
  getDefaultSchema,
  getGlobalDefaultSchema,
  addSchemaField,
  updateSchemaField,
  removeSchemaField,
  validateDataAgainstSchema,
  getComponentsBySchema,
  validateComponentData,
} from './api.ts';

// Enhanced interfaces for management operations
export interface SchemaUsageStats {
  schema_id: string;
  schema_name: string;
  component_count: number;
  last_used: string | null;
  created_at: string;
  is_active: boolean;
  is_default: boolean;
}

export interface SchemaMigrationPlan {
  source_schema_id: string;
  target_schema_id: string;
  affected_components: number;
  field_mapping: Record<string, string>;
  potential_data_loss: string[];
  migration_warnings: string[];
}

export interface BulkValidationResult {
  total_validated: number;
  valid_count: number;
  invalid_count: number;
  validation_results: Array<{
    component_id: string;
    piece_mark: string;
    is_valid: boolean;
    errors: string[];
  }>;
}

export interface SchemaMetrics {
  total_schemas: number;
  active_schemas: number;
  default_schemas: number;
  field_usage_stats: Array<{
    field_type: string;
    usage_count: number;
    average_per_schema: number;
  }>;
  most_used_schemas: SchemaUsageStats[];
}

export interface BulkDeleteImpactAnalysis {
  totalFields: number;
  totalComponentsAffected: number;
  fieldsWithData: number;
  requiredFields: number;
  fieldImpacts: Array<{
    fieldId: string;
    fieldName: string;
    componentsUsingField: Array<{
      componentId: string;
      pieceMark: string;
      hasData: boolean;
      lastModified: string;
    }>;
    isRequired: boolean;
    dependentFields: string[];
  }>;
  hasSignificantImpact: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

export interface BulkOperationResult {
  succeeded: string[];
  failed: Array<{ fieldId: string; error: string }>;
  totalProcessed: number;
}

class SchemaManagementService {
  /**
   * Get comprehensive schema usage statistics for a project
   */
  async getSchemaUsageStats(projectId: string): Promise<SchemaUsageStats[]> {
    const schemas = await getProjectSchemas(projectId, true);

    const stats: SchemaUsageStats[] = await Promise.all(
      schemas.schemas.map(async (schema) => {
        const components = await getComponentsBySchema(schema.id);

        return {
          schema_id: schema.id,
          schema_name: schema.name,
          component_count: components.length,
          last_used: components.length > 0 ?
            Math.max(...components.map(c => new Date(c.updated_at).getTime())).toString() :
            null,
          created_at: schema.created_at,
          is_active: schema.is_active,
          is_default: schema.is_default,
        };
      })
    );

    return stats.sort((a, b) => b.component_count - a.component_count);
  }

  /**
   * Create a duplicate/copy of an existing schema
   */
  async duplicateSchema(
    sourceSchemaId: string,
    newName: string,
    projectId?: string
  ): Promise<ComponentSchema> {
    const sourceSchema = await getSchema(sourceSchemaId);

    const duplicateData: ComponentSchemaCreate = {
      name: newName,
      description: `Copy of ${sourceSchema.name}`,
      project_id: projectId || sourceSchema.project_id,
      fields: sourceSchema.fields.map(field => ({
        field_name: field.field_name,
        field_type: field.field_type,
        field_config: { ...field.field_config },
        help_text: field.help_text,
        display_order: field.display_order,
        is_required: field.is_required,
      })),
      is_default: false,
    };

    return await createSchema(duplicateData);
  }

  /**
   * Bulk validation of components against their schemas
   */
  async bulkValidateComponents(componentIds: string[]): Promise<BulkValidationResult> {
    const validationPromises = componentIds.map(async (componentId) => {
      try {
        // Note: This function may need to be implemented in the API
        // For now, using a placeholder that validates against component's current schema
        const result = await validateDataAgainstSchema(componentId, {});
        return {
          component_id: componentId,
          piece_mark: '', // Will be populated from component data
          is_valid: result.is_valid,
          errors: result.errors,
        };
      } catch (error) {
        return {
          component_id: componentId,
          piece_mark: '',
          is_valid: false,
          errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        };
      }
    });

    const results = await Promise.all(validationPromises);

    return {
      total_validated: results.length,
      valid_count: results.filter(r => r.is_valid).length,
      invalid_count: results.filter(r => !r.is_valid).length,
      validation_results: results,
    };
  }

  /**
   * Generate schema migration plan
   */
  async generateMigrationPlan(
    sourceSchemaId: string,
    targetSchemaId: string
  ): Promise<SchemaMigrationPlan> {
    const [sourceSchema, targetSchema, affectedComponents] = await Promise.all([
      getSchema(sourceSchemaId),
      getSchema(targetSchemaId),
      getComponentsBySchema(sourceSchemaId),
    ]);

    const sourceFields = sourceSchema.fields.map(f => f.field_name);
    const targetFields = targetSchema.fields.map(f => f.field_name);

    const fieldMapping: Record<string, string> = {};
    const potentialDataLoss: string[] = [];
    const migrationWarnings: string[] = [];

    // Auto-map matching field names
    sourceFields.forEach(sourceField => {
      if (targetFields.includes(sourceField)) {
        fieldMapping[sourceField] = sourceField;
      } else {
        potentialDataLoss.push(sourceField);
      }
    });

    // Check for type mismatches
    Object.entries(fieldMapping).forEach(([sourceField, targetField]) => {
      const sourceFieldDef = sourceSchema.fields.find(f => f.field_name === sourceField);
      const targetFieldDef = targetSchema.fields.find(f => f.field_name === targetField);

      if (sourceFieldDef && targetFieldDef && sourceFieldDef.field_type !== targetFieldDef.field_type) {
        migrationWarnings.push(
          `Field '${sourceField}' type mismatch: ${sourceFieldDef.field_type} → ${targetFieldDef.field_type}`
        );
      }
    });

    return {
      source_schema_id: sourceSchemaId,
      target_schema_id: targetSchemaId,
      affected_components: affectedComponents.length,
      field_mapping: fieldMapping,
      potential_data_loss: potentialDataLoss,
      migration_warnings: migrationWarnings,
    };
  }

  /**
   * Reorder schema fields by field order array with batching and conflict resolution
   */
  async reorderSchemaFields(
    schemaId: string,
    fieldOrder: string[],
    options?: {
      batchSize?: number;
      expectedVersion?: string;
      forceUpdate?: boolean;
    }
  ): Promise<{
    fields: ComponentSchemaField[];
    version?: string;
    conflicts?: Array<{ fieldId: string; conflict: string }>;
  }> {
    const { batchSize = 10, expectedVersion, forceUpdate = false } = options || {};

    // Get current schema to check for conflicts
    const currentSchema = await getSchema(schemaId);

    // Conflict detection based on schema updated_at timestamp
    if (expectedVersion && !forceUpdate) {
      if (currentSchema.updated_at !== expectedVersion) {
        throw new Error('Schema has been modified by another user. Please refresh and try again.');
      }
    }

    // Convert field order array to field order objects
    const fieldOrders = fieldOrder.map((fieldId, index) => ({
      fieldId,
      newOrder: index,
    }));

    // Validate that all field IDs exist in the schema
    const currentFieldIds = new Set(currentSchema.fields.map(f => f.id));
    const conflicts: Array<{ fieldId: string; conflict: string }> = [];

    fieldOrders.forEach(({ fieldId }) => {
      if (!currentFieldIds.has(fieldId)) {
        conflicts.push({
          fieldId,
          conflict: 'Field no longer exists in schema'
        });
      }
    });

    if (conflicts.length > 0 && !forceUpdate) {
      return {
        fields: currentSchema.fields,
        version: currentSchema.updated_at,
        conflicts,
      };
    }

    // Filter out conflicted fields if force update is disabled
    const validFieldOrders = forceUpdate ?
      fieldOrders :
      fieldOrders.filter(({ fieldId }) => currentFieldIds.has(fieldId));

    // Batch the field updates to reduce API calls and improve performance
    const batches = [];
    for (let i = 0; i < validFieldOrders.length; i += batchSize) {
      batches.push(validFieldOrders.slice(i, i + batchSize));
    }

    // Process batches sequentially to maintain order consistency
    for (const batch of batches) {
      await Promise.all(
        batch.map(({ fieldId, newOrder }) =>
          updateSchemaField(fieldId, { display_order: newOrder })
        )
      );
    }

    // Return updated schema with version for future conflict detection
    const updatedSchema = await getSchema(schemaId);
    return {
      fields: updatedSchema.fields,
      version: updatedSchema.updated_at,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  /**
   * Reorder schema fields with explicit field order configuration
   */
  async reorderSchemaFieldsExplicit(
    schemaId: string,
    fieldOrders: Array<{ fieldId: string; newOrder: number }>
  ): Promise<ComponentSchema> {
    // Update each field's display order
    await Promise.all(
      fieldOrders.map(({ fieldId, newOrder }) =>
        updateSchemaField(fieldId, { display_order: newOrder })
      )
    );

    // Return updated schema
    return await getSchema(schemaId);
  }

  /**
   * Get schema metrics and analytics
   */
  async getSchemaMetrics(projectId?: string): Promise<SchemaMetrics> {
    const schemas = projectId ?
      await getProjectSchemas(projectId, true) :
      { schemas: [], total: 0 }; // Would need global endpoint for all schemas

    const fieldTypeStats = new Map<string, number>();

    schemas.schemas.forEach(schema => {
      schema.fields.forEach(field => {
        const count = fieldTypeStats.get(field.field_type) || 0;
        fieldTypeStats.set(field.field_type, count + 1);
      });
    });

    const usageStats = projectId ? await this.getSchemaUsageStats(projectId) : [];

    return {
      total_schemas: schemas.total,
      active_schemas: schemas.schemas.filter(s => s.is_active).length,
      default_schemas: schemas.schemas.filter(s => s.is_default).length,
      field_usage_stats: Array.from(fieldTypeStats.entries()).map(([field_type, usage_count]) => ({
        field_type,
        usage_count,
        average_per_schema: usage_count / schemas.schemas.length,
      })),
      most_used_schemas: usageStats.slice(0, 5),
    };
  }

  /**
   * Validate schema field configuration
   */
  validateFieldConfiguration(
    fieldType: string,
    fieldConfig: Record<string, any>
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (fieldType) {
      case 'select':
        if (!fieldConfig.options || !Array.isArray(fieldConfig.options)) {
          errors.push('Select field must have an options array');
        } else if (fieldConfig.options.length === 0) {
          errors.push('Select field must have at least one option');
        }
        break;

      case 'number':
        if (fieldConfig.min !== undefined && fieldConfig.max !== undefined) {
          if (fieldConfig.min >= fieldConfig.max) {
            errors.push('Number field min value must be less than max value');
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (fieldConfig.maxLength !== undefined && fieldConfig.maxLength <= 0) {
          errors.push('Text field maxLength must be positive');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Analyze the impact of bulk field deletion
   */
  async analyzeBulkDeleteImpact(
    schemaId: string,
    fieldIds: string[]
  ): Promise<BulkDeleteImpactAnalysis> {
    const schema = await getSchema(schemaId);
    const selectedFields = schema.fields.filter(field => fieldIds.includes(field.id));

    // Get components using this schema
    const components = await getComponentsBySchema(schemaId);

    let totalComponentsAffected = 0;
    let fieldsWithData = 0;
    const requiredFields = selectedFields.filter(field => field.is_required).length;

    const fieldImpacts = await Promise.all(
      selectedFields.map(async (field) => {
        const componentsUsingField = components.filter(component => {
          // Check if component has data for this field
          return component.dynamic_data && field.field_name in component.dynamic_data;
        }).map(component => ({
          componentId: component.id,
          pieceMark: component.piece_mark,
          hasData: component.dynamic_data[field.field_name] != null,
          lastModified: component.updated_at,
        }));

        const hasData = componentsUsingField.some(comp => comp.hasData);
        if (hasData) fieldsWithData++;

        totalComponentsAffected = Math.max(totalComponentsAffected, componentsUsingField.length);

        return {
          fieldId: field.id,
          fieldName: field.field_name,
          componentsUsingField,
          isRequired: field.is_required,
          dependentFields: [], // Would analyze field dependencies in real implementation
        };
      })
    );

    // Calculate risk level
    const hasSignificantImpact = fieldsWithData > 0 || requiredFields > 0 || totalComponentsAffected > 10;
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (requiredFields > 0 && totalComponentsAffected > 5) {
      riskLevel = 'high';
    } else if (fieldsWithData > 0 || requiredFields > 0 || totalComponentsAffected > 3) {
      riskLevel = 'medium';
    }

    // Generate warnings
    const warnings: string[] = [];
    if (requiredFields > 0) {
      warnings.push(`${requiredFields} required fields will be deleted, potentially breaking form validation`);
    }
    if (fieldsWithData > 0) {
      warnings.push(`${fieldsWithData} fields contain existing data that will be permanently lost`);
    }
    if (totalComponentsAffected > 10) {
      warnings.push(`Large number of components (${totalComponentsAffected}) will be affected`);
    }
    if (fieldIds.length > 5) {
      warnings.push('Deleting many fields at once increases risk of unintended consequences');
    }

    return {
      totalFields: fieldIds.length,
      totalComponentsAffected,
      fieldsWithData,
      requiredFields,
      fieldImpacts,
      hasSignificantImpact,
      riskLevel,
      warnings,
    };
  }

  /**
   * Perform bulk deletion of fields with batching
   */
  async bulkDeleteFields(
    fieldIds: string[],
    options: { batchSize?: number } = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 5 } = options;
    const succeeded: string[] = [];
    const failed: Array<{ fieldId: string; error: string }> = [];

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < fieldIds.length; i += batchSize) {
      const batch = fieldIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (fieldId) => {
        try {
          await removeSchemaField(fieldId);
          succeeded.push(fieldId);
          return { fieldId, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ fieldId, error: errorMessage });
          return { fieldId, success: false, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      succeeded,
      failed,
      totalProcessed: fieldIds.length,
    };
  }

  /**
   * Perform bulk status updates (activate/deactivate)
   */
  async bulkUpdateFieldStatus(
    fieldIds: string[],
    isActive: boolean,
    options: { batchSize?: number } = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 5 } = options;
    const succeeded: string[] = [];
    const failed: Array<{ fieldId: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < fieldIds.length; i += batchSize) {
      const batch = fieldIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (fieldId) => {
        try {
          await updateSchemaField(fieldId, { is_active: isActive });
          succeeded.push(fieldId);
          return { fieldId, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ fieldId, error: errorMessage });
          return { fieldId, success: false, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      succeeded,
      failed,
      totalProcessed: fieldIds.length,
    };
  }

  /**
   * Perform bulk required status updates
   */
  async bulkUpdateFieldRequired(
    fieldIds: string[],
    isRequired: boolean,
    options: { batchSize?: number } = {}
  ): Promise<BulkOperationResult> {
    const { batchSize = 5 } = options;
    const succeeded: string[] = [];
    const failed: Array<{ fieldId: string; error: string }> = [];

    // Process in batches
    for (let i = 0; i < fieldIds.length; i += batchSize) {
      const batch = fieldIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (fieldId) => {
        try {
          await updateSchemaField(fieldId, { is_required: isRequired });
          succeeded.push(fieldId);
          return { fieldId, success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failed.push({ fieldId, error: errorMessage });
          return { fieldId, success: false, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);
    }

    return {
      succeeded,
      failed,
      totalProcessed: fieldIds.length,
    };
  }
}

// Export singleton instance
export const schemaManagementService = new SchemaManagementService();
export default schemaManagementService;