/**
 * Schema Navigation Hook
 *
 * React hook for schema navigation utilities and breadcrumb generation.
 * Handles routing, breadcrumb creation, and navigation state management.
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { getProject } from '../../services/api.ts';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  icon?: React.ReactNode;
}

interface NavigationState {
  scrollPosition?: number;
  formData?: Record<string, any>;
  filters?: Record<string, any>;
  selectedItems?: string[];
  timestamp: number;
}

interface UseSchemaNavigationResult {
  // Navigation functions
  navigateToSchemas: (projectId?: string) => void;
  navigateToSchema: (schemaId: string, projectId?: string) => void;
  navigateToSchemaEdit: (schemaId: string, projectId?: string) => void;
  navigateToSchemaCreate: (projectId?: string) => void;
  goBack: () => void;
  goBackWithContext: () => void;

  // Route state
  currentRoute: string;
  isSchemaRoute: boolean;
  isProjectSchemaRoute: boolean;
  projectId?: string;
  schemaId?: string;

  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];

  // URL generation
  getSchemaUrl: (schemaId?: string, projectId?: string) => string;
  getSchemasUrl: (projectId?: string) => string;

  // State preservation
  saveNavigationState: (state: Partial<NavigationState>) => void;
  restoreNavigationState: () => NavigationState | null;
  clearNavigationState: () => void;
  hasStoredState: boolean;
}

export const useSchemaNavigation = (): UseSchemaNavigationResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ projectId?: string; schemaId?: string }>();

  const { projectId, schemaId } = params;

  const STORAGE_KEY = 'schemaNavigationState';

  // Fetch project data for breadcrumbs if we have a projectId
  const { data: project } = useQuery(
    ['project', projectId],
    () => projectId ? getProject(projectId) : null,
    {
      enabled: !!projectId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Route analysis
  const routeInfo = useMemo(() => {
    const path = location.pathname;
    const isSchemaRoute = path.includes('/schemas');
    const isProjectSchemaRoute = path.includes('/projects/') && path.includes('/schemas');

    return {
      currentRoute: path,
      isSchemaRoute,
      isProjectSchemaRoute,
    };
  }, [location.pathname]);

  // Navigation functions
  const navigateToSchemas = (targetProjectId?: string) => {
    if (targetProjectId) {
      navigate(`/projects/${targetProjectId}/schemas`);
    } else {
      navigate('/schemas');
    }
  };

  const navigateToSchema = (targetSchemaId: string, targetProjectId?: string) => {
    if (targetProjectId) {
      navigate(`/projects/${targetProjectId}/schemas/${targetSchemaId}`);
    } else {
      navigate(`/schemas/${targetSchemaId}`);
    }
  };

  const navigateToSchemaEdit = (targetSchemaId: string, targetProjectId?: string) => {
    if (targetProjectId) {
      navigate(`/projects/${targetProjectId}/schemas/${targetSchemaId}/edit`);
    } else {
      navigate(`/schemas/${targetSchemaId}/edit`);
    }
  };

  const navigateToSchemaCreate = (targetProjectId?: string) => {
    if (targetProjectId) {
      navigate(`/projects/${targetProjectId}/schemas/create`);
    } else {
      navigate('/schemas/create');
    }
  };

  const goBack = () => {
    navigate(-1);
  };

  // URL generation functions
  const getSchemaUrl = (targetSchemaId?: string, targetProjectId?: string) => {
    if (targetProjectId) {
      return targetSchemaId
        ? `/projects/${targetProjectId}/schemas/${targetSchemaId}`
        : `/projects/${targetProjectId}/schemas`;
    } else {
      return targetSchemaId ? `/schemas/${targetSchemaId}` : '/schemas';
    }
  };

  const getSchemasUrl = (targetProjectId?: string) => {
    return targetProjectId ? `/projects/${targetProjectId}/schemas` : '/schemas';
  };

  // State preservation functions
  const restoreNavigationState = useCallback((): NavigationState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as NavigationState;
      // Check if state is not too old (1 hour)
      if (Date.now() - state.timestamp > 60 * 60 * 1000) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return state;
    } catch (error) {
      console.warn('Failed to restore navigation state:', error);
      return null;
    }
  }, []);

  const saveNavigationState = useCallback((state: Partial<NavigationState>) => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const currentState = stored ? JSON.parse(stored) : { timestamp: Date.now() };
      const newState = {
        ...currentState,
        ...state,
        timestamp: Date.now(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to save navigation state:', error);
    }
  }, []);

  const clearNavigationState = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear navigation state:', error);
    }
  }, []);

  const hasStoredState = useMemo(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored !== null;
    } catch {
      return false;
    }
  }, [location.pathname]);

  // Enhanced back navigation with context
  const goBackWithContext = useCallback(() => {
    const storedState = restoreNavigationState();
    if (storedState) {
      navigate(-1);
      // Optionally restore scroll position after navigation
      setTimeout(() => {
        if (storedState.scrollPosition !== undefined) {
          window.scrollTo(0, storedState.scrollPosition);
        }
      }, 100);
    } else {
      navigate(-1);
    }
  }, [navigate, restoreNavigationState]);

  // Auto-save scroll position on route changes
  useEffect(() => {
    const handleScroll = () => {
      saveNavigationState({ scrollPosition: window.scrollY });
    };

    if (routeInfo.isSchemaRoute) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [routeInfo.isSchemaRoute, saveNavigationState]);

  // Breadcrumb generation
  const breadcrumbs = useMemo((): BreadcrumbItem[] => {
    const crumbs: BreadcrumbItem[] = [];

    // Always start with dashboard
    crumbs.push({
      label: 'Dashboard',
      href: '/',
    });

    if (routeInfo.isProjectSchemaRoute && projectId) {
      // Project-specific schema route
      crumbs.push({
        label: 'Projects',
        href: '/projects',
      });

      if (project) {
        crumbs.push({
          label: project.name,
          href: `/projects/${projectId}`,
        });
      } else {
        crumbs.push({
          label: 'Project',
          href: `/projects/${projectId}`,
        });
      }

      if (schemaId) {
        // Schema detail/edit page
        crumbs.push({
          label: 'Schemas',
          href: `/projects/${projectId}/schemas`,
        });

        crumbs.push({
          label: 'Schema Details',
          current: true,
        });
      } else {
        // Schema list page
        crumbs.push({
          label: 'Schemas',
          current: true,
        });
      }
    } else if (routeInfo.isSchemaRoute) {
      // Global schema route
      if (schemaId) {
        // Schema detail/edit page
        crumbs.push({
          label: 'Schemas',
          href: '/schemas',
        });

        crumbs.push({
          label: 'Schema Details',
          current: true,
        });
      } else {
        // Schema list page
        crumbs.push({
          label: 'Schemas',
          current: true,
        });
      }
    }

    return crumbs;
  }, [routeInfo, projectId, schemaId, project]);

  return {
    // Navigation functions
    navigateToSchemas,
    navigateToSchema,
    navigateToSchemaEdit,
    navigateToSchemaCreate,
    goBack,
    goBackWithContext,

    // Route state
    currentRoute: routeInfo.currentRoute,
    isSchemaRoute: routeInfo.isSchemaRoute,
    isProjectSchemaRoute: routeInfo.isProjectSchemaRoute,
    projectId,
    schemaId,

    // Breadcrumbs
    breadcrumbs,

    // URL generation
    getSchemaUrl,
    getSchemasUrl,

    // State preservation
    saveNavigationState,
    restoreNavigationState,
    clearNavigationState,
    hasStoredState,
  };
};

// Helper hook for schema route detection
export const useIsSchemaRoute = () => {
  const { isSchemaRoute, isProjectSchemaRoute } = useSchemaNavigation();
  return { isSchemaRoute, isProjectSchemaRoute };
};

// Helper hook for active route highlighting
export const useSchemaRouteMatching = () => {
  const { currentRoute } = useSchemaNavigation();

  const isActiveRoute = (routePath: string): boolean => {
    return currentRoute.startsWith(routePath);
  };

  const getRouteMatchLevel = (routePath: string): 'exact' | 'partial' | 'none' => {
    if (currentRoute === routePath) return 'exact';
    if (currentRoute.startsWith(routePath)) return 'partial';
    return 'none';
  };

  return {
    currentRoute,
    isActiveRoute,
    getRouteMatchLevel,
  };
};

export default useSchemaNavigation;