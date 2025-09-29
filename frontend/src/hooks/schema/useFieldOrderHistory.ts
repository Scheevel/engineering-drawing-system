/**
 * Field Order History Hook
 *
 * Manages field order history for undo/redo functionality.
 * Provides stack-based history management with configurable limits.
 */

import { useState, useCallback, useRef } from 'react';
import { ComponentSchemaField } from '../../types/schema';

interface FieldOrderHistoryState {
  history: ComponentSchemaField[][];
  currentIndex: number;
}

interface UseFieldOrderHistoryOptions {
  maxHistorySize?: number;
  enableRedo?: boolean;
}

export const useFieldOrderHistory = (
  initialFields: ComponentSchemaField[],
  options: UseFieldOrderHistoryOptions = {}
) => {
  const {
    maxHistorySize = 20,
    enableRedo = true,
  } = options;

  const [state, setState] = useState<FieldOrderHistoryState>({
    history: [initialFields],
    currentIndex: 0,
  });

  // Track if we're in the middle of an operation to prevent loops
  const isOperatingRef = useRef(false);

  const getCurrentFields = useCallback(() => {
    return state.history[state.currentIndex] || [];
  }, [state.history, state.currentIndex]);

  const pushToHistory = useCallback((newFields: ComponentSchemaField[]) => {
    if (isOperatingRef.current) return;

    setState(prevState => {
      // If we're not at the end of history, truncate everything after current position
      const newHistory = prevState.history.slice(0, prevState.currentIndex + 1);

      // Add new state
      newHistory.push([...newFields]);

      // Limit history size
      const trimmedHistory = newHistory.slice(-maxHistorySize);

      return {
        history: trimmedHistory,
        currentIndex: trimmedHistory.length - 1,
      };
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    if (state.currentIndex > 0) {
      isOperatingRef.current = true;
      setState(prevState => ({
        ...prevState,
        currentIndex: prevState.currentIndex - 1,
      }));
      // Reset the flag after state update
      setTimeout(() => {
        isOperatingRef.current = false;
      }, 0);
      return state.history[state.currentIndex - 1];
    }
    return null;
  }, [state.currentIndex, state.history]);

  const redo = useCallback(() => {
    if (enableRedo && state.currentIndex < state.history.length - 1) {
      isOperatingRef.current = true;
      setState(prevState => ({
        ...prevState,
        currentIndex: prevState.currentIndex + 1,
      }));
      // Reset the flag after state update
      setTimeout(() => {
        isOperatingRef.current = false;
      }, 0);
      return state.history[state.currentIndex + 1];
    }
    return null;
  }, [enableRedo, state.currentIndex, state.history]);

  const canUndo = state.currentIndex > 0;
  const canRedo = enableRedo && state.currentIndex < state.history.length - 1;

  const getHistoryInfo = useCallback(() => ({
    totalStates: state.history.length,
    currentIndex: state.currentIndex,
    canUndo,
    canRedo,
  }), [state.history.length, state.currentIndex, canUndo, canRedo]);

  const clearHistory = useCallback((newInitialFields?: ComponentSchemaField[]) => {
    const fieldsToUse = newInitialFields || initialFields;
    setState({
      history: [fieldsToUse],
      currentIndex: 0,
    });
  }, [initialFields]);

  return {
    currentFields: getCurrentFields(),
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryInfo,
    clearHistory,
  };
};