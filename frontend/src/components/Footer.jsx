import React from 'react';
import { Typography } from '@mui/material';

const styles = {
  footer: {
    position: 'fixed',
    bottom: 0,
    width: '100%',
    background: 'rgba(17,17,17,0.4)',
    backdropFilter: 'blur(8px)',
    textAlign: 'center',
    padding: '0.75rem',
    color: '#F4F4F4',
    fontFamily: 'Poppins, sans-serif',
    fontSize: '0.9rem',
  },
};

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <Typography variant="body2">
        © {new Date().getFullYear()} Gaiytri LLC. All rights reserved.
      </Typography>
    </footer>
  );
}