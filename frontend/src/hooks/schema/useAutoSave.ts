/**
 * Auto-save Hook for Schema Editing
 *
 * Provides auto-save functionality with conflict detection,
 * recovery mechanisms, and user activity monitoring.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSchemaEditing } from '../../contexts/SchemaEditingContext';
import { ComponentSchema, ComponentSchemaUpdate } from '../../types/schema';
import { updateSchema } from '../../services/api';

// ========================================
// INTERFACES
// ========================================

export interface AutoSaveOptions {
  enabled?: boolean;
  interval?: number;
  pauseOnUserActivity?: boolean;
  activityTimeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
}

export interface AutoSaveStatus {
  isEnabled: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaveTime: Date | null;
  lastAttemptTime: Date | null;
  error: string | null;
  nextSaveTime: Date | null;
  canManualSave: boolean;
}

export interface ConflictData {
  conflictType: 'concurrent_edit' | 'version_mismatch' | 'network_error';
  serverVersion?: ComponentSchema;
  localChanges: Record<string, any>;
  conflictFields: string[];
  timestamp: Date;
}

export interface AutoSaveHookReturn {
  status: AutoSaveStatus;
  manualSave: () => Promise<boolean>;
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  setInterval: (intervalMs: number) => void;
  resolveConflict: (resolution: 'keep_local' | 'keep_server' | 'merge') => Promise<boolean>;
  conflict: ConflictData | null;
  recoverAutoSavedData: () => ComponentSchema | null;
  clearRecoveryData: () => void;
}

// ========================================
// AUTO-SAVE HOOK IMPLEMENTATION
// ========================================

export const useAutoSave = (
  schemaId: string | null,
  options: AutoSaveOptions = {}
): AutoSaveHookReturn => {
  const {
    enabled = true,
    interval = 30000, // 30 seconds
    pauseOnUserActivity = true,
    activityTimeoutMs = 2000, // 2 seconds
    retryAttempts = 3,
    retryDelayMs = 5000, // 5 seconds
  } = options;

  const { state, dispatch } = useSchemaEditing();
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [recoveryData, setRecoveryData] = useState<ComponentSchema | null>(null);

  // Refs for stable timer management
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // ========================================
  // AUTO-SAVE LOGIC
  // ========================================

  const saveSchema = useCallback(async (retryCount = 0): Promise<boolean> => {
    if (!schemaId || !state.activeSchema || !state.isDirty) {
      return false;
    }

    try {
      dispatch({ type: 'AUTO_SAVE_START' });

      // Prepare schema update data
      const updateData: ComponentSchemaUpdate = {
        name: state.activeSchema.name,
        description: state.activeSchema.description,
        is_default: state.activeSchema.is_default,
        // Include field changes from editing state
        fields: state.activeSchema.fields,
      };

      // Save to local storage for recovery before API call
      localStorage.setItem(
        `schema_recovery_${schemaId}`,
        JSON.stringify({
          timestamp: Date.now(),
          schema: state.activeSchema,
          editingFields: state.editingFields,
        })
      );

      const updatedSchema = await updateSchema(schemaId, updateData);

      // Clear recovery data on successful save
      localStorage.removeItem(`schema_recovery_${schemaId}`);

      dispatch({ type: 'AUTO_SAVE_SUCCESS' });
      dispatch({ type: 'MARK_CLEAN', payload: {} });
      dispatch({ type: 'SET_LAST_SAVE_TIMESTAMP', payload: { timestamp: Date.now() } });

      // Clear retry count on success
      retryCountRef.current = 0;
      setConflict(null);

      return true;
    } catch (error: any) {
      console.error('Auto-save failed:', error);

      // Handle different types of errors
      if (error.status === 409) {
        // Conflict detected - handle concurrent edits
        const conflictData: ConflictData = {
          conflictType: 'concurrent_edit',
          serverVersion: error.data?.schema,
          localChanges: state.editingFields,
          conflictFields: error.data?.conflictFields || [],
          timestamp: new Date(),
        };
        setConflict(conflictData);
        dispatch({ type: 'AUTO_SAVE_ERROR', payload: { error: 'Concurrent edit detected' } });
        return false;
      }

      if (error.status === 412) {
        // Version mismatch
        const conflictData: ConflictData = {
          conflictType: 'version_mismatch',
          serverVersion: error.data?.schema,
          localChanges: state.editingFields,
          conflictFields: [],
          timestamp: new Date(),
        };
        setConflict(conflictData);
        dispatch({ type: 'AUTO_SAVE_ERROR', payload: { error: 'Version mismatch' } });
        return false;
      }

      // Network or other errors - attempt retry
      if (retryCount < retryAttempts) {
        retryCountRef.current = retryCount + 1;

        const delay = retryDelayMs * Math.pow(2, retryCount); // Exponential backoff
        retryTimerRef.current = setTimeout(() => {
          saveSchema(retryCount + 1);
        }, delay);

        dispatch({
          type: 'AUTO_SAVE_ERROR',
          payload: { error: `Save failed, retrying in ${delay / 1000}s (${retryCount + 1}/${retryAttempts})` }
        });
        return false;
      }

      // Max retries exceeded
      retryCountRef.current = 0;
      dispatch({ type: 'AUTO_SAVE_ERROR', payload: { error: error.message || 'Auto-save failed' } });
      return false;
    }
  }, [schemaId, state.activeSchema, state.isDirty, state.editingFields, dispatch, retryAttempts, retryDelayMs]);

  // ========================================
  // AUTO-SAVE TIMER MANAGEMENT
  // ========================================

  useEffect(() => {
    if (!enabled || !state.autoSaveEnabled || !state.isDirty || state.autoSaveStatus === 'saving') {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Check if we should pause due to user activity
    if (pauseOnUserActivity) {
      const timeSinceActivity = Date.now() - state.lastUserActivity;
      if (timeSinceActivity < activityTimeoutMs) {
        // User is still active, defer auto-save
        autoSaveTimerRef.current = setTimeout(() => {
          saveSchema();
        }, activityTimeoutMs - timeSinceActivity + interval);
        return;
      }
    }

    // Set up auto-save timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveSchema();
    }, interval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    enabled,
    state.autoSaveEnabled,
    state.isDirty,
    state.autoSaveStatus,
    state.lastUserActivity,
    interval,
    pauseOnUserActivity,
    activityTimeoutMs,
    saveSchema,
  ]);

  // ========================================
  // RECOVERY DATA MANAGEMENT
  // ========================================

  useEffect(() => {
    if (!schemaId) return;

    // Check for recovery data on mount
    const recoveryKey = `schema_recovery_${schemaId}`;
    const recoveryDataStr = localStorage.getItem(recoveryKey);

    if (recoveryDataStr) {
      try {
        const recovered = JSON.parse(recoveryDataStr);
        const recoveryAge = Date.now() - recovered.timestamp;

        // Only offer recovery if data is less than 1 hour old
        if (recoveryAge < 60 * 60 * 1000) {
          setRecoveryData(recovered.schema);
        } else {
          // Clean up old recovery data
          localStorage.removeItem(recoveryKey);
        }
      } catch (error) {
        console.error('Failed to parse recovery data:', error);
        localStorage.removeItem(recoveryKey);
      }
    }
  }, [schemaId]);

  // ========================================
  // CLEANUP EFFECTS
  // ========================================

  useEffect(() => {
    return () => {
      // Cleanup timers on unmount
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // ========================================
  // PUBLIC API FUNCTIONS
  // ========================================

  const manualSave = useCallback(async (): Promise<boolean> => {
    // Cancel auto-save timer for manual save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    return await saveSchema();
  }, [saveSchema]);

  const enableAutoSave = useCallback(() => {
    dispatch({ type: 'SET_AUTO_SAVE_ENABLED', payload: { enabled: true } });
  }, [dispatch]);

  const disableAutoSave = useCallback(() => {
    dispatch({ type: 'SET_AUTO_SAVE_ENABLED', payload: { enabled: false } });

    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, [dispatch]);

  const setAutoSaveInterval = useCallback((intervalMs: number) => {
    dispatch({ type: 'SET_AUTO_SAVE_INTERVAL', payload: { interval: intervalMs } });
  }, [dispatch]);

  const resolveConflict = useCallback(async (
    resolution: 'keep_local' | 'keep_server' | 'merge'
  ): Promise<boolean> => {
    if (!conflict || !schemaId) return false;

    try {
      switch (resolution) {
        case 'keep_local':
          // Force save local changes
          const success = await saveSchema();
          if (success) {
            setConflict(null);
          }
          return success;

        case 'keep_server':
          if (conflict.serverVersion) {
            // Replace local state with server version
            dispatch({ type: 'SET_ACTIVE_SCHEMA', payload: { schema: conflict.serverVersion } });
            dispatch({ type: 'MARK_CLEAN', payload: {} });
            setConflict(null);
            return true;
          }
          return false;

        case 'merge':
          // Implement merge logic - this would need to be more sophisticated
          // For now, present both versions to user for manual resolution
          console.warn('Merge resolution not fully implemented');
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return false;
    }
  }, [conflict, schemaId, saveSchema, dispatch]);

  const recoverAutoSavedData = useCallback((): ComponentSchema | null => {
    return recoveryData;
  }, [recoveryData]);

  const clearRecoveryData = useCallback(() => {
    if (schemaId) {
      localStorage.removeItem(`schema_recovery_${schemaId}`);
    }
    setRecoveryData(null);
  }, [schemaId]);

  // ========================================
  // STATUS CALCULATION
  // ========================================

  const status: AutoSaveStatus = {
    isEnabled: enabled && state.autoSaveEnabled,
    status: state.autoSaveStatus,
    lastSaveTime: state.lastSaveTimestamp ? new Date(state.lastSaveTimestamp) : null,
    lastAttemptTime: state.autoSaveLastAttempt ? new Date(state.autoSaveLastAttempt) : null,
    error: state.autoSaveError,
    nextSaveTime:
      state.isDirty && enabled && state.autoSaveEnabled && state.autoSaveStatus !== 'saving'
        ? new Date(Date.now() + interval)
        : null,
    canManualSave: state.isDirty && state.autoSaveStatus !== 'saving',
  };

  return {
    status,
    manualSave,
    enableAutoSave,
    disableAutoSave,
    setInterval: setAutoSaveInterval,
    resolveConflict,
    conflict,
    recoverAutoSavedData,
    clearRecoveryData,
  };
};

export default useAutoSave;