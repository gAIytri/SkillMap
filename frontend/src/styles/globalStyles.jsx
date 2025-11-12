import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => (
  <MuiGlobalStyles
    styles={{
      '*': {
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      },
      html: {
        width: '100%',
        height: '100%',
        WebkitOverflowScrolling: 'touch',
      },
      body: {
        width: '100%',
        height: '100%',
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
      },
      '#root': {
        width: '100%',
        height: '100%',
      },
      'input, textarea': {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
      },
      a: {
        textDecoration: 'none',
        color: 'inherit',
      },
      '.editor-container': {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      },
      '.viewer-container': {
        height: '100%',
        overflow: 'auto',
      },
      '.split-pane': {
        display: 'flex',
        height: 'calc(100vh - 64px)',
      },
      '.split-pane-left': {
        flex: 1,
        borderRight: '1px solid #E0E9CC',
      },
      '.split-pane-right': {
        flex: 1,
        backgroundColor: '#F4F4F4',
      },
    }}
  />
);

export default GlobalStyles;
