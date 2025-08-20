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
  review_status?: string;
}

export interface ComponentCreateRequest {
  drawing_id: string;
  piece_mark: string;
  component_type: string;
  description?: string;
  quantity: number;
  material_type?: string;
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

export default api;