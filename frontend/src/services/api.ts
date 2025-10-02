import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface Drawing {
  id: string;
  file_name: string;
  drawing_type?: string;
  sheet_number?: string;
  processing_status: string;
  processing_progress: number;
  upload_date: string;
  file_size?: number;
  project_id?: string;
  is_duplicate?: boolean;
}

export type DrawingListResponse = {
  items: Drawing[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
};

export interface ProjectResponse {
  id: string;
  name: string;
  client?: string;
  location?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  drawing_count: number;
}

export interface ProjectCreate {
  name: string;
  client?: string;
  location?: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  client?: string;
  location?: string;
  description?: string;
}

export interface DrawingResponse {
  id: string;
  file_name: string;
  original_name?: string;
  file_size?: number;
  upload_date: string;
  processing_status: string;
  components_extracted: number;
}

export interface Component {
  id: string;
  piece_mark: string;
  component_type?: string;
  description?: string;
  quantity: number;
  material_type?: string;
  instance_identifier?: string; // Support multiple instances of same piece mark
  confidence_score?: number;
  drawing_id: string;
  drawing_file_name: string;
  drawing_type?: string;
  sheet_number?: string;
  project_name?: string;
  location_x?: number;
  location_y?: number;
  dimensions?: any[];
  specifications?: any[];
  created_at: string;
  updated_at: string;
}

export interface SearchRequest {
  query: string;
  scope?: string[];
  component_type?: string;
  project_id?: string;
  drawing_type?: string;
  page?: number;
  limit?: number;
}

export interface SearchResponse {
  query: string;
  scope?: string[];
  query_type?: string;
  results: Component[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
  search_time_ms: number;
  complexity_score?: number;
  filters_applied: any;
  warnings?: string[];
  scope_counts?: {
    piece_mark: number;
    component_type: number;
    description: number;
  }; // Story 1.2: Scope effectiveness metrics
}

// Export interfaces (Story 7.2)
export interface DrawingWithComponents {
  id: string;
  file_name: string;
  drawing_type?: string;
  sheet_number?: string;
  drawing_date?: string;
  project_id?: string;
  file_path: string;
  file_size?: number;
  processing_status: string;
  processing_progress: number;
  upload_date: string;
  error_message?: string;
  metadata?: Record<string, any>;
  is_duplicate?: boolean;
  components: Component[];
}

export interface ExportDrawingsResponse {
  drawings: DrawingWithComponents[];
  total_drawings: number;
  total_components: number;
  timestamp: string;
}

// Saved Search interfaces
export interface SavedSearch {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  query: string;
  scope: string[];
  component_type?: string;
  instance_identifier?: string;
  drawing_type?: string;
  sort_by: string;
  sort_order: string;
  display_order: number;
  last_executed?: string;
  execution_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  preview_query_type?: string;
}

export interface SavedSearchCreate {
  name: string;
  description?: string;
  query: string;
  scope: string[];
  component_type?: string;
  instance_identifier?: string;
  drawing_type?: string;
  sort_by: string;
  sort_order: string;
  project_id: string;
}

export interface SavedSearchUpdate {
  name?: string;
  description?: string;
  query?: string;
  scope?: string[];
  component_type?: string;
  instance_identifier?: string;
  drawing_type?: string;
  sort_by?: string;
  sort_order?: string;
  display_order?: number;
}

export interface SavedSearchListResponse {
  searches: SavedSearch[];
  total: number;
  project_id: string;
  max_searches_per_project: number;
}

// Drawing API
export const uploadDrawing = async (file: File, projectId?: string): Promise<Drawing> => {
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('project_id', projectId);
  }

  const response = await api.post('/drawings/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDrawing = async (id: string): Promise<Drawing> => {
  const response = await api.get(`/drawings/${id}`);
  return response.data;
};

export const listDrawings = async (params: {
  page?: number;
  limit?: number;
  project_id?: string;
  status?: string;
} = {}): Promise<{
  items: Drawing[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}> => {
  const response = await api.get('/drawings', { params });
  return response.data;
};

// Get drawings with components for export (Story 7.2)
export const getExportDrawings = async (params: {
  project_id?: string;
  status?: string;
} = {}): Promise<ExportDrawingsResponse> => {
  const response = await api.get('/export/drawings', { params });
  return response.data;
};

export const deleteDrawing = async (id: string): Promise<void> => {
  await api.delete(`/drawings/${id}`);
};

export const getProcessingStatus = async (id: string): Promise<any> => {
  const response = await api.get(`/drawings/${id}/status`);
  return response.data;
};

// Search API
export const searchComponents = async (request: SearchRequest): Promise<SearchResponse> => {
  const response = await api.get('/search/components', {
    params: request,
    paramsSerializer: (params) => {
      // Custom serialization to handle scope array properly
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          // Handle array parameters - append each value separately  
          value.forEach(item => searchParams.append(key, item));
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      return searchParams.toString();
    }
  });
  
  return response.data;
};

export const getComponentBasicInfo = async (id: string): Promise<Component> => {
  const response = await api.get(`/search/components/${id}`);
  return response.data;
};

export const getSearchSuggestions = async (prefix: string, limit: number = 10): Promise<string[]> => {
  const response = await api.get('/search/suggestions', {
    params: { prefix, limit },
  });
  return response.data.suggestions;
};

export const getRecentComponents = async (limit: number = 20): Promise<{
  recent_components: Component[];
  total_available: number;
}> => {
  const response = await api.get('/search/recent', {
    params: { limit },
  });
  return response.data;
};

// Export API
export const exportToExcel = async (componentIds: string[], options: any = {}): Promise<Blob> => {
  const response = await api.post('/export/excel', {
    component_ids: componentIds,
    ...options,
  }, {
    responseType: 'blob',
  });
  return response.data;
};

export const exportToCSV = async (componentIds: string[], options: any = {}): Promise<Blob> => {
  const response = await api.post('/export/csv', {
    component_ids: componentIds,
    ...options,
  }, {
    responseType: 'blob',
  });
  return response.data;
};

export const generatePDFReport = async (componentIds: string[], options: any = {}): Promise<Blob> => {
  const response = await api.post('/export/pdf-report', {
    component_ids: componentIds,
    ...options,
  }, {
    responseType: 'blob',
  });
  return response.data;
};

// Drawing Viewer API
export const getDrawingFile = (drawingId: string): string => {
  return `${API_BASE_URL}/drawings/${drawingId}/file`;
};

export const getDrawingComponents = async (drawingId: string): Promise<{
  drawing_id: string;
  components: ComponentMarker[];
  total_components: number;
}> => {
  const response = await api.get(`/drawings/${drawingId}/components`);
  return response.data;
};

export interface ComponentMarker {
  id: string;
  piece_mark: string;
  component_type?: string;
  description?: string;
  quantity: number;
  location_x?: number;
  location_y?: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence_score?: number;
  highlighted?: boolean;
}

// System API
export interface SystemStats {
  total_drawings: number;
  total_components: number;
  processing_queue: number;
  success_rate: number;
  completed_drawings: number;
  failed_drawings: number;
  pending_drawings: number;
}

export const getSystemStats = async (): Promise<SystemStats> => {
  const response = await api.get('/system/stats');
  return response.data;
};

export const getComponentTypes = async (): Promise<{component_types: string[]}> => {
  const response = await api.get('/system/component-types');
  return response.data;
};

// Component Editor API
export interface ComponentDetails extends Component {
  drawing_id: string;
  drawing_file_name: string;
  sheet_number?: string;
  drawing_type?: string;
  project_name?: string;
  location_x?: number;
  location_y?: number;
  bounding_box?: any;
  confidence_score?: number;
  review_status: string;
  created_at: string;
  updated_at: string;
  dimensions: Dimension[];
  specifications: Specification[];
}

export interface Dimension {
  id: string;
  component_id: string;
  dimension_type: string;
  nominal_value: number;
  tolerance?: string;
  unit: string;
  confidence_score?: number;
  location_x?: number;
  location_y?: number;
  extracted_text?: string;
}

export interface Specification {
  id: string;
  component_id: string;
  specification_type: string;
  value: string;
  description?: string;
  confidence_score?: number;
}

export interface ComponentUpdateRequest {
  piece_mark?: string;
  component_type?: string;
  description?: string;
  quantity?: number;
  material_type?: string;
  instance_identifier?: string;
  review_status?: string;
}

export interface ComponentCreateRequest {
  drawing_id: string;
  piece_mark: string;
  component_type: string;
  description?: string;
  quantity: number;
  material_type?: string;
  instance_identifier?: string;
  location_x: number;
  location_y: number;
  manual_creation?: boolean;
  confidence_score?: number;
  review_status?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DimensionCreateRequest {
  dimension_type: string;
  nominal_value: number;
  tolerance?: string;
  unit: string;
  location_x?: number;
  location_y?: number;
  extracted_text?: string;
  confidence_score?: number;
}

export interface SpecificationCreateRequest {
  specification_type: string;
  value: string;
  description?: string;
  confidence_score?: number;
}

// Component CRUD operations
export const getComponentDetails = async (componentId: string): Promise<ComponentDetails> => {
  const response = await api.get(`/components/${componentId}`);
  return response.data;
};

export const updateComponent = async (
  componentId: string, 
  updateData: ComponentUpdateRequest
): Promise<ComponentDetails> => {
  const response = await api.put(`/components/${componentId}`, updateData);
  return response.data;
};

export const validateComponent = async (
  componentId: string, 
  updateData: ComponentUpdateRequest
): Promise<ValidationResult> => {
  const response = await api.post(`/components/${componentId}/validate`, updateData);
  return response.data;
};

export const getComponentHistory = async (componentId: string): Promise<any[]> => {
  const response = await api.get(`/components/${componentId}/history`);
  return response.data;
};

// Dimension management
export const getComponentDimensions = async (componentId: string): Promise<Dimension[]> => {
  const response = await api.get(`/components/${componentId}/dimensions`);
  return response.data;
};

export const createDimension = async (
  componentId: string, 
  dimensionData: DimensionCreateRequest
): Promise<Dimension> => {
  const response = await api.post(`/components/${componentId}/dimensions`, dimensionData);
  return response.data;
};

export const updateDimension = async (
  dimensionId: string, 
  dimensionData: Partial<DimensionCreateRequest>
): Promise<Dimension> => {
  const response = await api.put(`/components/dimensions/${dimensionId}`, dimensionData);
  return response.data;
};

export const deleteDimension = async (dimensionId: string): Promise<void> => {
  await api.delete(`/components/dimensions/${dimensionId}`);
};

// Specification management
export const getComponentSpecifications = async (componentId: string): Promise<Specification[]> => {
  const response = await api.get(`/components/${componentId}/specifications`);
  return response.data;
};

export const createSpecification = async (
  componentId: string, 
  specData: SpecificationCreateRequest
): Promise<Specification> => {
  const response = await api.post(`/components/${componentId}/specifications`, specData);
  return response.data;
};

export const updateSpecification = async (
  specId: string, 
  specData: Partial<SpecificationCreateRequest>
): Promise<Specification> => {
  const response = await api.put(`/components/specifications/${specId}`, specData);
  return response.data;
};

export const deleteSpecification = async (specId: string): Promise<void> => {
  await api.delete(`/components/specifications/${specId}`);
};

// Create component
export const createComponent = async (componentData: ComponentCreateRequest): Promise<ComponentDetails> => {
  const response = await api.post('/components', componentData);
  return response.data;
};

// Delete component
export const deleteComponent = async (componentId: string): Promise<void> => {
  await api.delete(`/components/${componentId}`);
};

// Project API functions
export const getProjects = async (): Promise<ProjectResponse[]> => {
  const response = await api.get('/projects');
  return response.data;
};

export const getProject = async (projectId: string): Promise<ProjectResponse> => {
  const response = await api.get(`/projects/${projectId}`);
  return response.data;
};

export const createProject = async (projectData: ProjectCreate): Promise<ProjectResponse> => {
  const response = await api.post('/projects', projectData);
  return response.data;
};

export const updateProject = async (projectId: string, projectData: ProjectUpdate): Promise<ProjectResponse> => {
  const response = await api.put(`/projects/${projectId}`, projectData);
  return response.data;
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await api.delete(`/projects/${projectId}`);
};

export const assignDrawingsToProject = async (drawingIds: string[], projectId?: string): Promise<any> => {
  const response = await api.post('/projects/assign-drawings', {
    drawing_ids: drawingIds,
    project_id: projectId
  });
  return response.data;
};

// Saved Search API functions
export const createSavedSearch = async (searchData: SavedSearchCreate): Promise<SavedSearch> => {
  const response = await api.post('/saved-searches', searchData);
  return response.data;
};

export const getSavedSearchesForProject = async (projectId: string): Promise<SavedSearchListResponse> => {
  const response = await api.get(`/saved-searches/project/${projectId}`);
  return response.data;
};

export const getSavedSearch = async (searchId: string): Promise<SavedSearch> => {
  const response = await api.get(`/saved-searches/${searchId}`);
  return response.data;
};

export const updateSavedSearch = async (searchId: string, updateData: SavedSearchUpdate): Promise<SavedSearch> => {
  const response = await api.put(`/saved-searches/${searchId}`, updateData);
  return response.data;
};

export const deleteSavedSearch = async (searchId: string): Promise<void> => {
  await api.delete(`/saved-searches/${searchId}`);
};

export const executeSavedSearch = async (searchId: string, page: number = 1, limit: number = 20): Promise<SearchResponse> => {
  const response = await api.post(`/saved-searches/${searchId}/execute`, { page, limit });
  return response.data;
};

export const reorderSavedSearches = async (projectId: string, searchOrder: string[]): Promise<void> => {
  await api.put(`/saved-searches/project/${projectId}/reorder`, searchOrder);
};

export const getSavedSearchCount = async (projectId: string): Promise<{count: number, max_allowed: number, remaining: number}> => {
  const response = await api.get(`/saved-searches/project/${projectId}/count`);
  return response.data;
};

// ========================================
// FLEXIBLE COMPONENT SCHEMA SYSTEM
// ========================================

// Schema Types (must match backend SchemaFieldType enum)
export type SchemaFieldType = 'text' | 'number' | 'checkbox' | 'textarea' | 'date';

// Default Schema Constant
export const DEFAULT_SCHEMA: ComponentSchema = {
  id: 'default-schema-001',
  name: 'Default Schema',
  description: 'Default schema for immediate use when no custom schemas exist',
  version: 1,
  is_default: true,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  fields: [{
    id: 'default-notes-field',
    field_name: 'notes',
    field_type: 'textarea',
    field_config: {
      rows: 4,
      placeholder: 'Enter notes and observations...'
    },
    help_text: 'General notes and observations for this component',
    display_order: 1,
    is_required: false,
    is_active: true
  }]
};

// Utility functions for schema type checking and management
export const isSystemGeneratedSchema = (schema: ComponentSchema): boolean => {
  return schema.is_default === true && schema.id === DEFAULT_SCHEMA.id;
};

export const isDefaultSchema = (schemaId: string): boolean => {
  return schemaId === DEFAULT_SCHEMA.id;
};

export const getUserSchemaCount = (schemas: ComponentSchema[]): number => {
  return schemas.filter(schema => !isSystemGeneratedSchema(schema)).length;
};

export const getUserSchemas = (schemas: ComponentSchema[]): ComponentSchema[] => {
  return schemas.filter(schema => !isSystemGeneratedSchema(schema));
};

export interface ComponentSchemaField {
  id?: string;
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text?: string;
  display_order: number;
  is_required: boolean;
  is_active?: boolean;
}

export interface ComponentSchemaFieldCreate {
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text?: string;
  display_order: number;
  is_required: boolean;
}

export interface ComponentSchemaFieldUpdate {
  field_name?: string;
  field_type?: SchemaFieldType;
  field_config?: Record<string, any>;
  help_text?: string;
  display_order?: number;
  is_required?: boolean;
}

export interface ComponentSchema {
  id: string;
  project_id?: string;
  name: string;
  description?: string;
  version: number;
  is_default: boolean;
  is_active: boolean;
  fields: ComponentSchemaField[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ComponentSchemaCreate {
  project_id?: string;
  name: string;
  description?: string;
  fields: ComponentSchemaFieldCreate[];
  is_default?: boolean;
}

export interface ComponentSchemaUpdate {
  name?: string;
  description?: string;
  is_default?: boolean;
}

export interface ComponentSchemaListResponse {
  schemas: ComponentSchema[];
  total: number;
  project_id?: string;
}

// Dynamic data structure matching backend DynamicComponentData model
export interface DynamicComponentData {
  field_values: Record<string, any>;
}

export interface FlexibleComponent extends Component {
  schema_id?: string;
  schema_info?: ComponentSchema;
  dynamic_data: DynamicComponentData | Record<string, any>; // Allow both formats for backward compatibility
  is_type_locked: boolean;
}

export interface FlexibleComponentCreate {
  piece_mark: string;
  drawing_id: string;
  schema_id?: string;
  dynamic_data?: DynamicComponentData | Record<string, any>; // Allow both formats
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface FlexibleComponentUpdate {
  piece_mark?: string;
  schema_id?: string;
  dynamic_data?: DynamicComponentData | Record<string, any>; // Allow both formats
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TypeLockStatus {
  is_locked: boolean;
  lock_reason?: string;
  locked_fields: string[];
  can_unlock: boolean;
}

export interface SchemaValidationResult {
  is_valid: boolean;
  errors: string[];
  validated_data: Record<string, any>;
}

// Schema Management API
const getProjectSchemasFromAPI = async (projectId: string, includeGlobal: boolean = true): Promise<ComponentSchemaListResponse> => {
  const response = await api.get(`/schemas/projects/${projectId}?include_global=${includeGlobal}`);
  return response.data;
};

export const getProjectSchemas = async (projectId: string, includeGlobal: boolean = true): Promise<ComponentSchemaListResponse> => {
  try {
    // First, try to get user schemas from API
    const result = await getProjectSchemasFromAPI(projectId, includeGlobal);

    // If user schemas exist, return them (custom schemas take precedence)
    if (result.schemas && result.schemas.length > 0) {
      return result;
    }

    // No user schemas found - return default schema for immediate use
    return {
      schemas: [DEFAULT_SCHEMA],
      total: 1,
      project_id: projectId
    };
  } catch (error) {
    // If API fails (backend unavailable), return default schema as fallback
    console.warn('Schema API unavailable, using default schema:', error);
    return {
      schemas: [DEFAULT_SCHEMA],
      total: 1,
      project_id: projectId
    };
  }
};

export const getSchema = async (schemaId: string): Promise<ComponentSchema> => {
  const response = await api.get(`/schemas/${schemaId}`);
  return response.data;
};

export const createSchema = async (schemaData: ComponentSchemaCreate): Promise<ComponentSchema> => {
  const response = await api.post('/schemas/', schemaData);
  return response.data;
};

export const updateSchema = async (schemaId: string, updates: ComponentSchemaUpdate): Promise<ComponentSchema> => {
  // Prevent updating the default schema
  if (schemaId === DEFAULT_SCHEMA.id) {
    throw new Error('Cannot modify the default schema. Create a custom schema instead.');
  }

  const response = await api.put(`/schemas/${schemaId}`, updates);
  return response.data;
};

export const duplicateSchema = async (schemaId: string, newName?: string, projectId?: string): Promise<ComponentSchema> => {
  const params: Record<string, string> = {};
  if (newName) params.new_name = newName;
  if (projectId) params.project_id = projectId;

  const response = await api.post(`/schemas/${schemaId}/duplicate`, null, { params });
  return response.data;
};

export const getSchemaUsage = async (schemaId: string): Promise<{ schema_id: string; components_using_schema: number; component_ids: string[]; truncated: boolean }> => {
  const response = await api.get(`/schemas/${schemaId}/usage`);
  return response.data;
};

export const deleteSchema = async (schemaId: string): Promise<void> => {
  await api.delete(`/schemas/${schemaId}`);
};

export const deactivateSchema = async (schemaId: string): Promise<void> => {
  // Prevent deleting the default schema
  if (schemaId === DEFAULT_SCHEMA.id) {
    throw new Error('Cannot delete the default schema. It is required for system operation.');
  }

  await api.delete(`/schemas/${schemaId}`);
};

export const getDefaultSchema = async (projectId: string): Promise<ComponentSchema> => {
  const response = await api.get(`/schemas/projects/${projectId}/default`);
  return response.data;
};

export const getGlobalDefaultSchema = async (): Promise<ComponentSchema> => {
  const response = await api.get('/schemas/global/default');
  return response.data;
};

export const setDefaultSchema = async (projectId: string, schemaId: string): Promise<ComponentSchema> => {
  const response = await api.post(`/schemas/projects/${projectId}/default`, null, {
    params: { schema_id: schemaId }
  });
  return response.data;
};

export const unsetDefaultSchema = async (projectId: string, schemaId: string): Promise<void> => {
  await api.delete(`/schemas/projects/${projectId}/default`, {
    params: { schema_id: schemaId }
  });
};

// Schema Field Management API
export const addSchemaField = async (schemaId: string, fieldData: ComponentSchemaFieldCreate): Promise<ComponentSchemaField> => {
  const response = await api.post(`/schemas/${schemaId}/fields`, fieldData);
  return response.data;
};

export const updateSchemaField = async (fieldId: string, updates: ComponentSchemaFieldUpdate): Promise<ComponentSchemaField> => {
  const response = await api.put(`/schemas/fields/${fieldId}`, updates);
  return response.data;
};

export const removeSchemaField = async (fieldId: string): Promise<void> => {
  await api.delete(`/schemas/fields/${fieldId}`);
};

export const validateDataAgainstSchema = async (schemaId: string, data: Record<string, any>): Promise<SchemaValidationResult> => {
  const response = await api.post(`/schemas/${schemaId}/validate`, data);
  return response.data;
};

// Field-specific validation
export const validateFieldData = async (schemaId: string, fieldId: string, fieldData: Record<string, any>): Promise<SchemaValidationResult> => {
  const response = await api.put(`/schemas/${schemaId}/fields/${fieldId}/validation`, fieldData);
  return response.data;
};

// Field duplication
export const duplicateSchemaField = async (schemaId: string, fieldId: string, nameSuffix: string = ' Copy'): Promise<ComponentSchemaField> => {
  const response = await api.post(`/schemas/${schemaId}/fields/${fieldId}/duplicate`, null, {
    params: { name_suffix: nameSuffix }
  });
  return response.data;
};

// Flexible Components API
export const createFlexibleComponent = async (componentData: FlexibleComponentCreate): Promise<FlexibleComponent> => {
  const response = await api.post('/flexible-components/', componentData);
  return response.data;
};

export const getFlexibleComponent = async (componentId: string): Promise<FlexibleComponent> => {
  const response = await api.get(`/flexible-components/${componentId}`);
  return response.data;
};

export const updateFlexibleComponent = async (componentId: string, updateData: FlexibleComponentUpdate): Promise<FlexibleComponent> => {
  const response = await api.put(`/flexible-components/${componentId}`, updateData);
  return response.data;
};

export const getComponentTypeLockInfo = async (componentId: string): Promise<TypeLockStatus> => {
  const response = await api.get(`/flexible-components/${componentId}/type-lock`);
  return response.data;
};

export const unlockComponentType = async (componentId: string): Promise<FlexibleComponent> => {
  const response = await api.post(`/flexible-components/${componentId}/unlock`);
  return response.data;
};

export const migrateComponentSchema = async (componentId: string, targetSchemaId: string, force: boolean = false): Promise<FlexibleComponent> => {
  const response = await api.post(`/flexible-components/${componentId}/migrate-schema`, null, {
    params: { target_schema_id: targetSchemaId, force }
  });
  return response.data;
};

export const validateComponentAgainstSchema = async (componentId: string, schemaId?: string): Promise<SchemaValidationResult> => {
  const response = await api.post(`/flexible-components/${componentId}/validate`, null, {
    params: schemaId ? { schema_id: schemaId } : {}
  });
  return response.data;
};

export const getComponentsBySchema = async (schemaId: string, limit: number = 100): Promise<FlexibleComponent[]> => {
  const response = await api.get(`/flexible-components/by-schema/${schemaId}?limit=${limit}`);
  return response.data;
};

export const getAvailableSchemas = async (componentId: string): Promise<{
  current_schema_id?: string;
  is_type_locked: boolean;
  lock_reason?: string;
  available_schemas: Array<{
    id: string;
    name: string;
    description?: string;
    is_default: boolean;
    field_count: number;
  }>;
}> => {
  const response = await api.get(`/flexible-components/${componentId}/available-schemas`);
  return response.data;
};

export const searchComponentsByFieldValue = async (
  fieldName: string,
  fieldValue: string,
  schemaId?: string,
  projectId?: string,
  limit: number = 50
): Promise<{
  field_name: string;
  field_value: string;
  total_found: number;
  components: FlexibleComponent[];
}> => {
  const params = new URLSearchParams({
    field_name: fieldName,
    field_value: fieldValue,
    limit: limit.toString()
  });

  if (schemaId) params.append('schema_id', schemaId);
  if (projectId) params.append('project_id', projectId);

  const response = await api.get(`/flexible-components/search/by-field-value?${params}`);
  return response.data;
};

export const validateComponentData = async (schemaId: string, componentData: Record<string, any>): Promise<SchemaValidationResult> => {
  const response = await api.post('/flexible-components/validate-data', componentData, {
    params: { schema_id: schemaId }
  });
  return response.data;
};

// ========================================
// SCHEMA MANAGEMENT EXTENSIONS
// ========================================

// Enhanced management interfaces
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

// Schema template interfaces
export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'engineering' | 'construction' | 'manufacturing' | 'general';
  fields: ComponentSchemaFieldCreate[];
  preview_component?: Record<string, any>;
  is_system_template: boolean;
  usage_count: number;
}

export interface SchemaTemplateListResponse {
  templates: SchemaTemplate[];
  categories: string[];
  total: number;
}

// Schema import/export interfaces
export interface SchemaExportData {
  schema: Omit<ComponentSchema, 'id' | 'created_at' | 'updated_at'>;
  metadata: {
    exported_at: string;
    exported_by?: string;
    export_version: string;
    component_count?: number;
  };
}

export interface SchemaImportResult {
  success: boolean;
  imported_schema?: ComponentSchema;
  errors: string[];
  warnings: string[];
  field_mapping?: Record<string, string>;
}

// Schema comparison interfaces
export interface SchemaFieldDiff {
  field_name: string;
  change_type: 'added' | 'removed' | 'modified' | 'unchanged';
  old_value?: ComponentSchemaField;
  new_value?: ComponentSchemaField;
  impact_level: 'none' | 'low' | 'medium' | 'high';
}

export interface SchemaDiff {
  schema_info: {
    old_name: string;
    new_name: string;
    old_version: number;
    new_version: number;
  };
  field_changes: SchemaFieldDiff[];
  summary: {
    fields_added: number;
    fields_removed: number;
    fields_modified: number;
    breaking_changes: number;
  };
}

// Field configuration validation
export interface FieldConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

// ========================================
// ENHANCED ERROR HANDLING FOR SCHEMA OPERATIONS
// ========================================

// Schema-specific error types
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public validationErrors: string[],
    public field?: string
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export class SchemaMigrationError extends Error {
  constructor(
    message: string,
    public sourceSchemaId: string,
    public targetSchemaId: string,
    public affectedComponents: number
  ) {
    super(message);
    this.name = 'SchemaMigrationError';
  }
}

// Enhanced API response wrapper for schema operations
export interface SchemaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  metadata?: {
    operation: string;
    timestamp: string;
    affected_resources?: string[];
  };
}

// Retry configuration for schema operations
export const SCHEMA_RETRY_CONFIG = {
  retries: 3,
  retryDelay: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000),
  retryCondition: (error: any) => {
    // Retry on network errors and 5xx server errors, but not on validation errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  },
};

// Schema operation helper functions
export const withSchemaErrorHandling = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.validation_errors) {
      throw new SchemaValidationError(
        `Schema validation failed for ${operationName}`,
        error.response.data.validation_errors,
        error.response.data.field
      );
    }

    if (error.response?.status === 409 && operationName.includes('migration')) {
      throw new SchemaMigrationError(
        error.response.data.message || `Schema migration failed`,
        error.response.data.source_schema_id,
        error.response.data.target_schema_id,
        error.response.data.affected_components || 0
      );
    }

    // Re-throw other errors as-is
    throw error;
  }
};

// Batch operation helpers
export const batchSchemaOperation = async <T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<Array<{ success: boolean; data?: R; error?: string; item: T }>> => {
  const results: Array<{ success: boolean; data?: R; error?: string; item: T }> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map(async (item) => {
      try {
        const data = await operation(item);
        return { success: true, data, item };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Unknown error',
          item,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
};

export default api;