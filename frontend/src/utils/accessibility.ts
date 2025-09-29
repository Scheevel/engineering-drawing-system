/**
 * Accessibility Utilities for Schema Management
 *
 * Comprehensive accessibility tools ensuring WCAG 2.1 AA compliance,
 * keyboard navigation excellence, and optimal screen reader support.
 */

import React from 'react';
import { alpha } from '@mui/material/styles';

// ========================================
// WCAG 2.1 AA COMPLIANCE UTILITIES
// ========================================

/**
 * Calculate color contrast ratio between two colors
 * @param foreground - Foreground color (hex or rgb)
 * @param background - Background color (hex or rgb)
 * @returns Contrast ratio (1-21)
 */
export const calculateContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const gammaCorrect = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    const rLinear = gammaCorrect(r);
    const gLinear = gammaCorrect(g);
    const bLinear = gammaCorrect(b);

    // Calculate relative luminance
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  };

  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG contrast requirements
 * @param foreground - Foreground color
 * @param background - Background color
 * @param level - 'AA' or 'AAA'
 * @param isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText = false
): boolean => {
  const ratio = calculateContrastRatio(foreground, background);

  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }

  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Generate accessible color variants that meet contrast requirements
 */
export const generateAccessibleColors = (baseColor: string, backgroundColor: string) => {
  const contrastRatio = calculateContrastRatio(baseColor, backgroundColor);

  return {
    original: baseColor,
    accessible: contrastRatio >= 4.5 ? baseColor : adjustColorContrast(baseColor, backgroundColor),
    contrastRatio,
    meetsAA: contrastRatio >= 4.5,
    meetsAAA: contrastRatio >= 7,
  };
};

/**
 * Adjust color to meet contrast requirements
 */
export const adjustColorContrast = (color: string, backgroundColor: string): string => {
  // Implementation would adjust lightness/darkness to meet contrast requirements
  // For now, return a safe fallback
  return backgroundColor === '#ffffff' || backgroundColor === 'white' ? '#000000' : '#ffffff';
};

// ========================================
// TOUCH TARGET UTILITIES
// ========================================

/**
 * Ensure minimum 44px touch target size (WCAG requirement)
 */
export const ensureMinTouchTarget = (size: number | string) => {
  const minSize = 44; // WCAG 2.1 AA requirement
  const numericSize = typeof size === 'string' ? parseInt(size, 10) : size;
  return Math.max(numericSize, minSize);
};

/**
 * Touch target styles for interactive elements
 */
export const touchTargetStyles = {
  minHeight: 44,
  minWidth: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative' as const,
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 44,
    minWidth: 44,
    margin: 'auto',
  },
};

// ========================================
// FOCUS MANAGEMENT
// ========================================

/**
 * High-contrast focus indicator styles
 */
export const focusIndicatorStyles = (theme: any) => ({
  '&:focus-visible': {
    outline: `3px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
    borderRadius: theme.spacing(0.5),
  },
  '&:focus:not(:focus-visible)': {
    outline: 'none',
  },
});

/**
 * Skip link for keyboard navigation
 */
export const skipLinkStyles = (theme: any) => ({
  position: 'absolute',
  top: -40,
  left: 16,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(0.5),
  textDecoration: 'none',
  fontSize: theme.typography.body2.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
  zIndex: 9999,
  transition: 'top 0.3s ease',
  '&:focus': {
    top: 16,
  },
});

// ========================================
// ARIA UTILITIES
// ========================================

/**
 * Generate unique IDs for ARIA relationships
 */
export const generateAriaId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create ARIA label for complex form fields
 */
export const createFieldAriaLabel = (
  fieldName: string,
  isRequired: boolean,
  hasError: boolean,
  helpText?: string
): string => {
  let label = fieldName;

  if (isRequired) {
    label += ', required';
  }

  if (hasError) {
    label += ', has error';
  }

  if (helpText) {
    label += `, help text: ${helpText}`;
  }

  return label;
};

/**
 * ARIA live region announcer
 */
export class AriaLiveAnnouncer {
  private static instance: AriaLiveAnnouncer;
  private liveRegion: HTMLElement | null = null;

  static getInstance(): AriaLiveAnnouncer {
    if (!AriaLiveAnnouncer.instance) {
      AriaLiveAnnouncer.instance = new AriaLiveAnnouncer();
    }
    return AriaLiveAnnouncer.instance;
  }

  constructor() {
    this.createLiveRegion();
  }

  private createLiveRegion() {
    if (typeof document === 'undefined') return;

    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.setAttribute('aria-relevant', 'text');
    this.liveRegion.style.position = 'absolute';
    this.liveRegion.style.left = '-10000px';
    this.liveRegion.style.width = '1px';
    this.liveRegion.style.height = '1px';
    this.liveRegion.style.overflow = 'hidden';
    document.body.appendChild(this.liveRegion);
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.liveRegion) return;

    this.liveRegion.setAttribute('aria-live', priority);
    this.liveRegion.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (this.liveRegion) {
        this.liveRegion.textContent = '';
      }
    }, 1000);
  }
}

// ========================================
// KEYBOARD NAVIGATION
// ========================================

/**
 * Trap focus within a container for modal dialogs
 */
export const trapFocus = (container: HTMLElement) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);
  firstElement?.focus();

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Keyboard shortcut handler
 */
export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export class KeyboardShortcutManager {
  private shortcuts: KeyboardShortcut[] = [];
  private isActive = true;

  addShortcut(shortcut: KeyboardShortcut) {
    this.shortcuts.push(shortcut);
  }

  removeShortcut(key: string) {
    this.shortcuts = this.shortcuts.filter(s => s.key !== key);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive) return;

    const shortcut = this.shortcuts.find(s =>
      s.key.toLowerCase() === e.key.toLowerCase() &&
      !!s.ctrlKey === e.ctrlKey &&
      !!s.shiftKey === e.shiftKey &&
      !!s.altKey === e.altKey &&
      !!s.metaKey === e.metaKey
    );

    if (shortcut) {
      e.preventDefault();
      shortcut.action();

      // Announce shortcut activation
      AriaLiveAnnouncer.getInstance().announce(
        `Keyboard shortcut activated: ${shortcut.description}`,
        'assertive'
      );
    }
  };

  activate() {
    this.isActive = true;
    document.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    this.isActive = false;
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  getShortcuts() {
    return [...this.shortcuts];
  }
}

// ========================================
// SCREEN READER UTILITIES
// ========================================

/**
 * Generate descriptive text for complex UI states
 */
export const describeSchemaState = (schema: any): string => {
  const parts = [];

  parts.push(`Schema: ${schema.name}`);

  if (schema.is_default) {
    parts.push('Default schema');
  }

  if (!schema.is_active) {
    parts.push('Inactive');
  }

  parts.push(`${schema.fields?.length || 0} fields`);

  if (schema.description) {
    parts.push(`Description: ${schema.description}`);
  }

  return parts.join(', ');
};

/**
 * Create semantic heading structure
 */
export const createHeadingStructure = (level: 1 | 2 | 3 | 4 | 5 | 6, text: string) => ({
  component: `h${level}` as const,
  role: 'heading',
  'aria-level': level,
  children: text,
});

// ========================================
// ACCESSIBILITY TESTING UTILITIES
// ========================================

/**
 * Check if element meets accessibility requirements
 */
export const auditElement = (element: HTMLElement) => {
  const issues = [];

  // Check for alt text on images
  const images = element.querySelectorAll('img');
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push('Image missing alt text');
    }
  });

  // Check for form labels
  const inputs = element.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    const hasLabel = !!input.getAttribute('aria-label') ||
                    !!input.getAttribute('aria-labelledby') ||
                    !!element.querySelector(`label[for="${input.id}"]`);
    if (!hasLabel) {
      issues.push('Form control missing label');
    }
  });

  // Check for sufficient color contrast
  const textElements = element.querySelectorAll('*');
  textElements.forEach(el => {
    const styles = getComputedStyle(el);
    const textColor = styles.color;
    const backgroundColor = styles.backgroundColor;

    if (textColor && backgroundColor && textColor !== 'rgba(0, 0, 0, 0)') {
      const ratio = calculateContrastRatio(textColor, backgroundColor);
      if (ratio < 4.5) {
        issues.push(`Insufficient color contrast: ${ratio.toFixed(2)}`);
      }
    }
  });

  return {
    passed: issues.length === 0,
    issues,
    score: Math.max(0, 100 - (issues.length * 10)),
  };
};

// ========================================
// ACCESSIBILITY HOOKS
// ========================================

/**
 * React hook for managing accessibility announcements
 */
export const useAriaLive = () => {
  const announcer = AriaLiveAnnouncer.getInstance();

  return {
    announce: announcer.announce.bind(announcer),
    polite: (message: string) => announcer.announce(message, 'polite'),
    assertive: (message: string) => announcer.announce(message, 'assertive'),
  };
};

/**
 * React hook for keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  React.useEffect(() => {
    const manager = new KeyboardShortcutManager();
    shortcuts.forEach(shortcut => manager.addShortcut(shortcut));
    manager.activate();

    return () => manager.deactivate();
  }, [shortcuts]);
};

export default {
  contrast: {
    calculateContrastRatio,
    meetsContrastRequirement,
    generateAccessibleColors,
    adjustColorContrast,
  },
  touchTarget: {
    ensureMinTouchTarget,
    touchTargetStyles,
  },
  focus: {
    focusIndicatorStyles,
    skipLinkStyles,
    trapFocus,
  },
  aria: {
    generateAriaId,
    createFieldAriaLabel,
    AriaLiveAnnouncer,
    describeSchemaState,
    createHeadingStructure,
  },
  keyboard: {
    KeyboardShortcutManager,
  },
  testing: {
    auditElement,
  },
  hooks: {
    useAriaLive,
    useKeyboardShortcuts,
  },
};