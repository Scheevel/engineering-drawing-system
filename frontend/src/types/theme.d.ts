/**
 * Material-UI Theme Type Extensions for Schema Management
 *
 * Extends the default Material-UI theme interface to include
 * schema-specific color schemes and design tokens.
 */

import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    schema: {
      default: string;
      active: string;
      inactive: string;
      editing: string;
      global: string;
      draft: string;
    };
  }

  interface PaletteOptions {
    schema?: {
      default?: string;
      active?: string;
      inactive?: string;
      editing?: string;
      global?: string;
      draft?: string;
    };
  }

  interface TypeBackground {
    schemaDefault: string;
    schemaActive: string;
    schemaInactive: string;
    schemaEditing: string;
    schemaGlobal: string;
  }
}

// Extend the default theme
declare module '@mui/material/styles/createTheme' {
  interface Theme {
    palette: {
      mode: 'light' | 'dark';
      primary: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      secondary: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      error: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      warning: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      info: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      success: {
        main: string;
        light: string;
        dark: string;
        contrastText: string;
      };
      schema: {
        default: string;
        active: string;
        inactive: string;
        editing: string;
        global: string;
        draft: string;
      };
      grey: {
        50: string;
        100: string;
        200: string;
        300: string;
        400: string;
        500: string;
        600: string;
        700: string;
        800: string;
        900: string;
      };
      text: {
        primary: string;
        secondary: string;
        disabled: string;
      };
      background: {
        default: string;
        paper: string;
        schemaDefault: string;
        schemaActive: string;
        schemaInactive: string;
        schemaEditing: string;
        schemaGlobal: string;
      };
      divider: string;
      action: {
        active: string;
        hover: string;
        selected: string;
        disabled: string;
        disabledBackground: string;
      };
    };
  }
}

// Helper types for schema state management
export type SchemaState = 'default' | 'active' | 'inactive' | 'editing' | 'global' | 'draft';

export interface SchemaColorScheme {
  primary: string;
  background: string;
  border: string;
  text: string;
}

// Utility function type for getting schema colors
export type GetSchemaColors = (state: SchemaState) => SchemaColorScheme;