/**
 * Field Visibility Hook
 *
 * Manages field visibility logic with role-based controls, conditional display rules,
 * and dynamic visibility profiles for schema forms.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SchemaFieldType } from '../../services/api';

export interface FieldVisibilityRule {
  id: string;
  name: string;
  type: 'role_based' | 'conditional' | 'component_type' | 'user_preference' | 'custom';
  condition: VisibilityCondition;
  action: 'show' | 'hide';
  priority: number;
  isActive: boolean;
  metadata: {
    description: string;
    createdBy: string;
    createdAt: string;
    tags: string[];
  };
}

export interface VisibilityCondition {
  type: 'user_role' | 'field_value' | 'component_type' | 'form_state' | 'date_range' | 'custom_function';
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between';
  value: any;
  fieldId?: string;
  customFunction?: string;
}

export interface VisibilityProfile {
  id: string;
  name: string;
  description: string;
  rules: FieldVisibilityRule[];
  isDefault: boolean;
  isActive: boolean;
  targetRoles: string[];
  metadata: {
    category: string;
    author: string;
    version: string;
    lastModified: string;
  };
}

export interface ComponentSchemaField {
  id: string;
  field_name: string;
  field_type: SchemaFieldType;
  field_config: Record<string, any>;
  help_text?: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  groupId?: string;
}

export interface UserContext {
  userId: string;
  roles: string[];
  permissions: string[];
  preferences: Record<string, any>;
  organization?: string;
  department?: string;
}

export interface FormContext {
  componentType?: string;
  formMode: 'create' | 'edit' | 'view' | 'review';
  formData: Record<string, any>;
  currentStep?: number;
  totalSteps?: number;
  metadata?: Record<string, any>;
}

export interface FieldVisibilityState {
  fieldId: string;
  isVisible: boolean;
  reason: string;
  appliedRules: string[];
  lastEvaluated: string;
  canOverride: boolean;
  overrideReason?: string;
}

export interface UseFieldVisibilityOptions {
  userContext: UserContext;
  formContext: FormContext;
  visibilityProfiles?: VisibilityProfile[];
  enableCaching?: boolean;
  enableOverrides?: boolean;
  debugMode?: boolean;
  onVisibilityChange?: (fieldId: string, isVisible: boolean, reason: string) => void;
}

export interface UseFieldVisibilityReturn {
  // Visibility state
  getFieldVisibility: (fieldId: string) => FieldVisibilityState;
  getAllVisibility: () => Record<string, FieldVisibilityState>;
  isFieldVisible: (fieldId: string) => boolean;
  getVisibleFields: () => string[];
  getHiddenFields: () => string[];

  // Rule management
  addRule: (rule: FieldVisibilityRule) => void;
  removeRule: (ruleId: string) => void;
  updateRule: (ruleId: string, updates: Partial<FieldVisibilityRule>) => void;
  toggleRule: (ruleId: string) => void;

  // Profile management
  applyProfile: (profileId: string) => void;
  removeProfile: (profileId: string) => void;
  getActiveProfiles: () => VisibilityProfile[];

  // Overrides
  overrideFieldVisibility: (fieldId: string, isVisible: boolean, reason: string) => void;
  clearOverride: (fieldId: string) => void;
  clearAllOverrides: () => void;

  // Utilities
  refreshVisibility: () => void;
  exportVisibilityState: () => string;
  importVisibilityState: (state: string) => void;

  // State
  rules: FieldVisibilityRule[];
  profiles: VisibilityProfile[];
  overrides: Record<string, { isVisible: boolean; reason: string }>;
  isProcessing: boolean;
}

// Engineering-specific visibility profiles
const ENGINEERING_VISIBILITY_PROFILES: VisibilityProfile[] = [
  {
    id: 'basic_user',
    name: 'Basic User',
    description: 'Simplified view for basic users with essential fields only',
    isDefault: true,
    isActive: true,
    targetRoles: ['basic_user', 'viewer'],
    rules: [
      {
        id: 'hide_advanced_calcs',
        name: 'Hide Advanced Calculations',
        type: 'role_based',
        condition: {
          type: 'user_role',
          operator: 'in',
          value: ['basic_user', 'viewer'],
        },
        action: 'hide',
        priority: 1,
        isActive: true,
        metadata: {
          description: 'Hide complex calculation fields from basic users',
          createdBy: 'system',
          createdAt: '2024-01-01T00:00:00Z',
          tags: ['basic', 'simplified'],
        },
      },
    ],
    metadata: {
      category: 'User Experience',
      author: 'System',
      version: '1.0',
      lastModified: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'engineer_full',
    name: 'Engineer Full Access',
    description: 'Complete field visibility for engineers and advanced users',
    isDefault: false,
    isActive: true,
    targetRoles: ['engineer', 'senior_engineer', 'admin'],
    rules: [
      {
        id: 'show_all_engineering',
        name: 'Show All Engineering Fields',
        type: 'role_based',
        condition: {
          type: 'user_role',
          operator: 'in',
          value: ['engineer', 'senior_engineer', 'admin'],
        },
        action: 'show',
        priority: 10,
        isActive: true,
        metadata: {
          description: 'Show all engineering fields for qualified users',
          createdBy: 'system',
          createdAt: '2024-01-01T00:00:00Z',
          tags: ['engineering', 'advanced'],
        },
      },
    ],
    metadata: {
      category: 'Professional',
      author: 'System',
      version: '1.0',
      lastModified: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'inspection_mode',
    name: 'Inspection Mode',
    description: 'Visibility profile optimized for inspection workflows',
    isDefault: false,
    isActive: true,
    targetRoles: ['inspector', 'quality_control'],
    rules: [
      {
        id: 'show_inspection_fields',
        name: 'Show Inspection Fields',
        type: 'component_type',
        condition: {
          type: 'component_type',
          operator: 'equals',
          value: 'inspection',
        },
        action: 'show',
        priority: 5,
        isActive: true,
        metadata: {
          description: 'Show fields relevant to inspection processes',
          createdBy: 'system',
          createdAt: '2024-01-01T00:00:00Z',
          tags: ['inspection', 'quality'],
        },
      },
    ],
    metadata: {
      category: 'Quality Control',
      author: 'System',
      version: '1.0',
      lastModified: '2024-01-01T00:00:00Z',
    },
  },
];

// Field categorization for visibility rules
const FIELD_CATEGORIES = {
  'basic': ['drawing_number', 'project_name', 'description', 'status'],
  'dimensional': ['length', 'width', 'height', 'diameter', 'thickness'],
  'material': ['material_grade', 'material_type', 'coating', 'finish'],
  'structural': ['load_capacity', 'stress_analysis', 'deflection', 'buckling'],
  'safety': ['safety_factor', 'load_factor', 'inspection_date', 'certification'],
  'advanced': ['moment_distribution', 'fatigue_analysis', 'dynamic_response'],
  'documentation': ['notes', 'references', 'attachments', 'approval_status'],
};

/**
 * Hook for managing field visibility with role-based controls and conditional logic
 */
export function useFieldVisibility(
  fields: ComponentSchemaField[],
  options: UseFieldVisibilityOptions
): UseFieldVisibilityReturn {
  const {
    userContext,
    formContext,
    visibilityProfiles = ENGINEERING_VISIBILITY_PROFILES,
    enableCaching = true,
    enableOverrides = true,
    debugMode = false,
    onVisibilityChange,
  } = options;

  const [rules, setRules] = useState<FieldVisibilityRule[]>([]);
  const [profiles, setProfiles] = useState<VisibilityProfile[]>(visibilityProfiles);
  const [overrides, setOverrides] = useState<Record<string, { isVisible: boolean; reason: string }>>({});
  const [visibilityCache, setVisibilityCache] = useState<Record<string, FieldVisibilityState>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Get active profiles based on user context
  const activeProfiles = useMemo(() => {
    return profiles.filter(profile =>
      profile.isActive &&
      profile.targetRoles.some(role => userContext.roles.includes(role))
    );
  }, [profiles, userContext.roles]);

  // Get all active rules from active profiles and standalone rules
  const activeRules = useMemo(() => {
    const profileRules = activeProfiles.flatMap(profile => profile.rules);
    return [...profileRules, ...rules].filter(rule => rule.isActive);
  }, [activeProfiles, rules]);

  // Evaluate visibility condition
  const evaluateCondition = useCallback((condition: VisibilityCondition): boolean => {
    try {
      switch (condition.type) {
        case 'user_role':
          return evaluateArrayCondition(userContext.roles, condition);

        case 'field_value':
          if (!condition.fieldId) return false;
          const fieldValue = formContext.formData[condition.fieldId];
          return evaluateValueCondition(fieldValue, condition);

        case 'component_type':
          return evaluateValueCondition(formContext.componentType, condition);

        case 'form_state':
          return evaluateValueCondition(formContext.formMode, condition);

        case 'custom_function':
          if (condition.customFunction) {
            // Placeholder for custom function evaluation
            return evaluateCustomFunction(condition.customFunction, {
              userContext,
              formContext,
              condition,
            });
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      if (debugMode) {
        console.warn('Error evaluating visibility condition:', condition, error);
      }
      return false;
    }
  }, [userContext, formContext, debugMode]);

  // Evaluate array-based conditions (roles, permissions)
  const evaluateArrayCondition = (value: string[], condition: VisibilityCondition): boolean => {
    const conditionValue = Array.isArray(condition.value) ? condition.value : [condition.value];

    switch (condition.operator) {
      case 'in':
        return conditionValue.some(v => value.includes(v));
      case 'not_in':
        return !conditionValue.some(v => value.includes(v));
      case 'contains':
        return value.some(v => conditionValue.includes(v));
      default:
        return false;
    }
  };

  // Evaluate value-based conditions
  const evaluateValueCondition = (value: any, condition: VisibilityCondition): boolean => {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      case 'between':
        const [min, max] = Array.isArray(condition.value) ? condition.value : [0, 0];
        return Number(value) >= min && Number(value) <= max;
      default:
        return false;
    }
  };

  // Evaluate custom functions (placeholder implementation)
  const evaluateCustomFunction = (functionName: string, context: any): boolean => {
    // This would integrate with a custom function registry
    if (debugMode) {
      console.log('Evaluating custom function:', functionName, context);
    }
    return false;
  };

  // Calculate field visibility
  const calculateFieldVisibility = useCallback((fieldId: string): FieldVisibilityState => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) {
      return {
        fieldId,
        isVisible: false,
        reason: 'Field not found',
        appliedRules: [],
        lastEvaluated: new Date().toISOString(),
        canOverride: false,
      };
    }

    // Check for manual override first
    if (enableOverrides && overrides[fieldId]) {
      return {
        fieldId,
        isVisible: overrides[fieldId].isVisible,
        reason: `Manual override: ${overrides[fieldId].reason}`,
        appliedRules: ['override'],
        lastEvaluated: new Date().toISOString(),
        canOverride: true,
        overrideReason: overrides[fieldId].reason,
      };
    }

    // Start with default visibility (field.is_active)
    let isVisible = field.is_active;
    let appliedRules: string[] = [];
    let reason = 'Default field state';

    // Apply rules in priority order
    const sortedRules = [...activeRules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (evaluateCondition(rule.condition)) {
        isVisible = rule.action === 'show';
        appliedRules.push(rule.id);
        reason = `Applied rule: ${rule.name}`;

        // If this is a high-priority rule (priority >= 10), stop processing
        if (rule.priority >= 10) {
          break;
        }
      }
    }

    // Apply field categorization rules
    const fieldCategory = getFieldCategory(field.field_name);
    if (fieldCategory) {
      const categoryRules = getCategoryVisibilityRules(fieldCategory);
      for (const categoryRule of categoryRules) {
        if (evaluateCondition(categoryRule.condition)) {
          isVisible = categoryRule.action === 'show';
          appliedRules.push(`category:${fieldCategory}`);
          reason = `Category rule: ${fieldCategory}`;
        }
      }
    }

    const state: FieldVisibilityState = {
      fieldId,
      isVisible,
      reason,
      appliedRules,
      lastEvaluated: new Date().toISOString(),
      canOverride: enableOverrides,
    };

    // Trigger change callback if visibility changed
    if (onVisibilityChange && visibilityCache[fieldId]) {
      const previousState = visibilityCache[fieldId];
      if (previousState.isVisible !== isVisible) {
        onVisibilityChange(fieldId, isVisible, reason);
      }
    }

    return state;
  }, [fields, activeRules, overrides, enableOverrides, evaluateCondition, visibilityCache, onVisibilityChange]);

  // Get field category based on field name patterns
  const getFieldCategory = useCallback((fieldName: string): string | null => {
    const lowerName = fieldName.toLowerCase();

    for (const [category, patterns] of Object.entries(FIELD_CATEGORIES)) {
      if (patterns.some(pattern => lowerName.includes(pattern.toLowerCase()))) {
        return category;
      }
    }

    return null;
  }, []);

  // Get category-based visibility rules
  const getCategoryVisibilityRules = useCallback((category: string): FieldVisibilityRule[] => {
    // Return built-in category rules based on user context
    const categoryRules: FieldVisibilityRule[] = [];

    if (category === 'advanced' && !userContext.roles.includes('engineer')) {
      categoryRules.push({
        id: `hide_${category}`,
        name: `Hide ${category} fields`,
        type: 'role_based',
        condition: {
          type: 'user_role',
          operator: 'not_in',
          value: ['engineer', 'senior_engineer', 'admin'],
        },
        action: 'hide',
        priority: 5,
        isActive: true,
        metadata: {
          description: `Hide ${category} fields for non-engineers`,
          createdBy: 'system',
          createdAt: new Date().toISOString(),
          tags: ['category', 'automatic'],
        },
      });
    }

    return categoryRules;
  }, [userContext.roles]);

  // Recalculate all field visibility
  const refreshVisibility = useCallback(() => {
    setIsProcessing(true);

    const newCache: Record<string, FieldVisibilityState> = {};

    fields.forEach(field => {
      newCache[field.id] = calculateFieldVisibility(field.id);
    });

    setVisibilityCache(newCache);
    setIsProcessing(false);
  }, [fields, calculateFieldVisibility]);

  // Initialize and refresh on dependencies change
  useEffect(() => {
    refreshVisibility();
  }, [refreshVisibility]);

  // API methods
  const getFieldVisibility = useCallback((fieldId: string): FieldVisibilityState => {
    if (enableCaching && visibilityCache[fieldId]) {
      return visibilityCache[fieldId];
    }
    return calculateFieldVisibility(fieldId);
  }, [enableCaching, visibilityCache, calculateFieldVisibility]);

  const getAllVisibility = useCallback((): Record<string, FieldVisibilityState> => {
    const result: Record<string, FieldVisibilityState> = {};
    fields.forEach(field => {
      result[field.id] = getFieldVisibility(field.id);
    });
    return result;
  }, [fields, getFieldVisibility]);

  const isFieldVisible = useCallback((fieldId: string): boolean => {
    return getFieldVisibility(fieldId).isVisible;
  }, [getFieldVisibility]);

  const getVisibleFields = useCallback((): string[] => {
    return fields.filter(field => isFieldVisible(field.id)).map(field => field.id);
  }, [fields, isFieldVisible]);

  const getHiddenFields = useCallback((): string[] => {
    return fields.filter(field => !isFieldVisible(field.id)).map(field => field.id);
  }, [fields, isFieldVisible]);

  // Rule management
  const addRule = useCallback((rule: FieldVisibilityRule) => {
    setRules(prev => [...prev, rule]);
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<FieldVisibilityRule>) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  }, []);

  const toggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, isActive: !r.isActive } : r));
  }, []);

  // Profile management
  const applyProfile = useCallback((profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setRules(prev => [...prev, ...profile.rules]);
    }
  }, [profiles]);

  const removeProfile = useCallback((profileId: string) => {
    setProfiles(prev => prev.filter(p => p.id !== profileId));
  }, []);

  const getActiveProfiles = useCallback((): VisibilityProfile[] => {
    return activeProfiles;
  }, [activeProfiles]);

  // Override management
  const overrideFieldVisibility = useCallback((fieldId: string, isVisible: boolean, reason: string) => {
    if (!enableOverrides) return;
    setOverrides(prev => ({
      ...prev,
      [fieldId]: { isVisible, reason },
    }));
  }, [enableOverrides]);

  const clearOverride = useCallback((fieldId: string) => {
    setOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[fieldId];
      return newOverrides;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  // Utilities
  const exportVisibilityState = useCallback((): string => {
    return JSON.stringify({
      rules,
      profiles,
      overrides,
      timestamp: new Date().toISOString(),
    });
  }, [rules, profiles, overrides]);

  const importVisibilityState = useCallback((state: string) => {
    try {
      const parsed = JSON.parse(state);
      if (parsed.rules) setRules(parsed.rules);
      if (parsed.profiles) setProfiles(parsed.profiles);
      if (parsed.overrides) setOverrides(parsed.overrides);
    } catch (error) {
      console.error('Error importing visibility state:', error);
    }
  }, []);

  return {
    // Visibility state
    getFieldVisibility,
    getAllVisibility,
    isFieldVisible,
    getVisibleFields,
    getHiddenFields,

    // Rule management
    addRule,
    removeRule,
    updateRule,
    toggleRule,

    // Profile management
    applyProfile,
    removeProfile,
    getActiveProfiles,

    // Overrides
    overrideFieldVisibility,
    clearOverride,
    clearAllOverrides,

    // Utilities
    refreshVisibility,
    exportVisibilityState,
    importVisibilityState,

    // State
    rules,
    profiles,
    overrides,
    isProcessing,
  };
}

/**
 * Simplified hook for basic field visibility
 */
export function useSimpleFieldVisibility(
  fields: ComponentSchemaField[],
  userRoles: string[],
  formMode: 'create' | 'edit' | 'view' | 'review' = 'edit'
) {
  const userContext: UserContext = {
    userId: 'current_user',
    roles: userRoles,
    permissions: [],
    preferences: {},
  };

  const formContext: FormContext = {
    formMode,
    formData: {},
  };

  return useFieldVisibility(fields, {
    userContext,
    formContext,
    enableCaching: true,
    enableOverrides: false,
  });
}

export default useFieldVisibility;