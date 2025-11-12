import { createTheme } from '@mui/material/styles';

// Color Palette based on design inspiration
const colorPalette = {
  primary: {
    darkGreen: '#072D1F',
    brightGreen: '#29B770',
    black: '#111111',
  },
  secondary: {
    lightGreen: '#E0E9CC',
    mediumGreen: '#98C7AC',
    gray: '#F4F4F4',
  },
  text: {
    primary: '#111111',
    secondary: '#072D1F',
    white: '#FFFFFF',
  },
  background: {
    default: '#FFFFFF',
    paper: '#F4F4F4',
    light: '#E0E9CC',
  },
};

// Create MUI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colorPalette.primary.brightGreen,
      dark: colorPalette.primary.darkGreen,
      light: colorPalette.secondary.mediumGreen,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: colorPalette.primary.darkGreen,
      light: colorPalette.secondary.lightGreen,
      dark: colorPalette.primary.black,
      contrastText: '#FFFFFF',
    },
    text: {
      primary: colorPalette.text.primary,
      secondary: colorPalette.text.secondary,
    },
    background: {
      default: colorPalette.background.default,
      paper: colorPalette.background.paper,
    },
    success: {
      main: colorPalette.primary.brightGreen,
    },
    grey: {
      50: '#F4F4F4',
      100: '#E0E9CC',
      200: '#98C7AC',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      color: colorPalette.primary.darkGreen,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      color: colorPalette.primary.darkGreen,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      color: colorPalette.primary.darkGreen,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      color: colorPalette.text.primary,
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
      color: colorPalette.text.primary,
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      color: colorPalette.text.primary,
    },
    body1: {
      fontSize: '1rem',
      color: colorPalette.text.primary,
    },
    body2: {
      fontSize: '0.875rem',
      color: colorPalette.text.secondary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 24px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
            transition: 'transform 0.2s ease',
          },
        },
        containedPrimary: {
          backgroundColor: colorPalette.primary.brightGreen,
          '&:hover': {
            backgroundColor: colorPalette.secondary.mediumGreen,
          },
        },
        containedSecondary: {
          backgroundColor: colorPalette.primary.darkGreen,
          '&:hover': {
            backgroundColor: colorPalette.primary.black,
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'box-shadow 0.3s ease, transform 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: colorPalette.secondary.mediumGreen,
            },
            '&.Mui-focused fieldset': {
              borderColor: colorPalette.primary.brightGreen,
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colorPalette.background.default,
          color: colorPalette.text.primary,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colorPalette.background.paper,
        },
      },
    },
  },
});

export default theme;
export { colorPalette };
