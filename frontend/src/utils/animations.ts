/**
 * Animation Configuration and Utilities for Schema Management
 *
 * Provides consistent animation patterns, durations, and easing functions
 * throughout the schema management UI for professional micro-interactions.
 */

import { keyframes } from '@mui/material/styles';

// ========================================
// ANIMATION CONSTANTS
// ========================================

export const ANIMATION_DURATION = {
  fast: 150,      // Immediate feedback (hover states)
  standard: 300,  // Standard transitions (state changes)
  complex: 375,   // Complex transitions (form submissions, modals)
  slow: 500,      // Slow transitions (page transitions)
} as const;

export const EASING = {
  // Material Design easing curves
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  decelerate: 'cubic-bezier(0.0, 0, 0.2, 1)', // Ease out
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',   // Ease in
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',      // Sharp transitions

  // Engineering-specific easing for professional feel
  engineering: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Professional curve
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',           // Smooth curve
} as const;

// ========================================
// KEYFRAME ANIMATIONS
// ========================================

// Smooth fade in animation
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Smooth fade out animation
export const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-8px);
  }
`;

// Gentle shake animation for validation errors (accessibility-safe)
export const gentleShake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
`;

// Smooth slide in from right
export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

// Smooth slide in from left
export const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

// Scale in animation for modals
export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

// Pulse animation for loading states
export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

// Smooth expand animation
export const expand = keyframes`
  from {
    opacity: 0;
    max-height: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    max-height: 200px;
    transform: scaleY(1);
  }
`;

// Smooth collapse animation
export const collapse = keyframes`
  from {
    opacity: 1;
    max-height: 200px;
    transform: scaleY(1);
  }
  to {
    opacity: 0;
    max-height: 0;
    transform: scaleY(0);
  }
`;

// Smooth bounce in for success states
export const bounceIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

// ========================================
// ANIMATION UTILITIES
// ========================================

// Generate smooth transition CSS
export const createTransition = (
  properties: string | string[],
  duration: number = ANIMATION_DURATION.standard,
  easing: string = EASING.standard,
  delay: number = 0
) => {
  const props = Array.isArray(properties) ? properties : [properties];
  return props
    .map(prop => `${prop} ${duration}ms ${easing} ${delay}ms`)
    .join(', ');
};

// Create hover transition effects
export const createHoverTransition = (
  properties: string | string[] = ['transform', 'box-shadow', 'background-color']
) => createTransition(properties, ANIMATION_DURATION.fast, EASING.decelerate);

// Create state change transitions
export const createStateTransition = (
  properties: string | string[] = ['background-color', 'border-color', 'color']
) => createTransition(properties, ANIMATION_DURATION.standard, EASING.standard);

// Create loading animation
export const createLoadingAnimation = (
  duration: number = 1200,
  easing: string = EASING.standard
) => ({
  animation: `${pulse} ${duration}ms ${easing} infinite`,
});

// ========================================
// SCHEMA-SPECIFIC ANIMATIONS
// ========================================

// Schema card hover animation
export const schemaCardHover = {
  transform: 'translateY(-2px)',
  transition: createHoverTransition(['transform', 'box-shadow', 'border-color']),
};

// Schema state transition
export const schemaStateTransition = {
  transition: createStateTransition(['background-color', 'border-color', 'box-shadow']),
};

// Edit mode transition
export const editModeTransition = {
  animation: `${fadeIn} ${ANIMATION_DURATION.standard}ms ${EASING.engineering}`,
  transition: createTransition(
    ['background-color', 'border-color', 'box-shadow'],
    ANIMATION_DURATION.standard,
    EASING.engineering
  ),
};

// Form field focus animation
export const fieldFocusAnimation = {
  transition: createTransition(
    ['border-color', 'box-shadow'],
    ANIMATION_DURATION.fast,
    EASING.sharp
  ),
};

// Validation error animation
export const validationErrorAnimation = {
  animation: `${gentleShake} 300ms ${EASING.sharp}`,
};

// Success feedback animation
export const successAnimation = {
  animation: `${bounceIn} ${ANIMATION_DURATION.complex}ms ${EASING.decelerate}`,
};

// Modal enter animation
export const modalEnterAnimation = {
  animation: `${scaleIn} ${ANIMATION_DURATION.complex}ms ${EASING.decelerate}`,
};

// Panel expand animation
export const panelExpandAnimation = {
  animation: `${expand} ${ANIMATION_DURATION.complex}ms ${EASING.engineering}`,
};

// Panel collapse animation
export const panelCollapseAnimation = {
  animation: `${collapse} ${ANIMATION_DURATION.standard}ms ${EASING.engineering}`,
};

// ========================================
// DRAG & DROP ANIMATIONS
// ========================================

// Drag start animation
export const dragStartAnimation = {
  transform: 'scale(1.02) rotate(2deg)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
  zIndex: 1000,
  transition: createTransition(
    ['transform', 'box-shadow'],
    ANIMATION_DURATION.fast,
    EASING.sharp
  ),
};

// Drop zone highlight animation
export const dropZoneHighlight = {
  background: 'rgba(25, 118, 210, 0.08)',
  borderColor: 'primary.main',
  transition: createTransition(
    ['background-color', 'border-color'],
    ANIMATION_DURATION.fast,
    EASING.standard
  ),
};

// Snap to position animation
export const snapToPositionAnimation = {
  transition: createTransition(
    ['transform'],
    ANIMATION_DURATION.standard,
    EASING.decelerate
  ),
};

// ========================================
// RESPONSIVE ANIMATION UTILITIES
// ========================================

// Disable animations for users who prefer reduced motion
export const respectReducedMotion = (animationStyles: any) => ({
  ...animationStyles,
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    transition: 'none',
    transform: 'none',
  },
});

// Create responsive animation that scales with screen size
export const createResponsiveAnimation = (
  mobileScale: number = 0.8,
  desktopScale: number = 1
) => ({
  '@media (max-width: 600px)': {
    animationDuration: `${ANIMATION_DURATION.standard * mobileScale}ms`,
  },
  '@media (min-width: 1200px)': {
    animationDuration: `${ANIMATION_DURATION.standard * desktopScale}ms`,
  },
});

// ========================================
// PERFORMANCE-OPTIMIZED ANIMATIONS
// ========================================

// Enable hardware acceleration for smooth animations
export const enableHardwareAcceleration = {
  willChange: 'transform, opacity',
  transform: 'translateZ(0)', // Force GPU acceleration
  backfaceVisibility: 'hidden',
};

// Optimize for 60fps animations
export const optimizeForPerformance = {
  ...enableHardwareAcceleration,
  contain: 'layout style paint',
};

// ========================================
// ANIMATION HOOK UTILITIES
// ========================================

export interface AnimationState {
  isAnimating: boolean;
  animationType: 'enter' | 'exit' | 'hover' | 'focus' | 'error' | 'success' | null;
}

export const getAnimationConfig = (state: AnimationState['animationType']) => {
  switch (state) {
    case 'enter':
      return { animation: `${fadeIn} ${ANIMATION_DURATION.standard}ms ${EASING.decelerate}` };
    case 'exit':
      return { animation: `${fadeOut} ${ANIMATION_DURATION.standard}ms ${EASING.accelerate}` };
    case 'hover':
      return schemaCardHover;
    case 'focus':
      return fieldFocusAnimation;
    case 'error':
      return validationErrorAnimation;
    case 'success':
      return successAnimation;
    default:
      return {};
  }
};

export default {
  ANIMATION_DURATION,
  EASING,
  keyframes: {
    fadeIn,
    fadeOut,
    gentleShake,
    slideInRight,
    slideInLeft,
    scaleIn,
    pulse,
    expand,
    collapse,
    bounceIn,
  },
  transitions: {
    createTransition,
    createHoverTransition,
    createStateTransition,
  },
  animations: {
    schemaCardHover,
    schemaStateTransition,
    editModeTransition,
    fieldFocusAnimation,
    validationErrorAnimation,
    successAnimation,
    modalEnterAnimation,
    panelExpandAnimation,
    panelCollapseAnimation,
  },
  dragDrop: {
    dragStartAnimation,
    dropZoneHighlight,
    snapToPositionAnimation,
  },
  utilities: {
    respectReducedMotion,
    createResponsiveAnimation,
    enableHardwareAcceleration,
    optimizeForPerformance,
    getAnimationConfig,
  },
};