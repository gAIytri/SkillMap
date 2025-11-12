import React from 'react';
import { AppBar, Toolbar, Typography, Box } from '@mui/material';
import logo from '../assets/logo.png'; // 👈 adjust path if needed

const styles = {
  appBar: {
    background: 'rgba(17,17,17,0.4)',
    backdropFilter: 'blur(8px)',
    boxShadow: 'none',

  },
  toolbar: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: '0.5rem 1.5rem',
    minHeight:'10px'

  },
  logo: {
    height: '36px',
    width: 'auto',
    marginRight: '0.75rem',
  },
  title: {
    fontFamily: 'Poppins, sans-serif',
    fontWeight: 600,
    color: '#F4F4F4',
    fontSize: '1.25rem',
    letterSpacing: '0.5px',
  },
};

export default function Navbar() {
  return (
    <AppBar position="fixed" style={styles.appBar}>
      <Toolbar style={styles.toolbar}>
        {/* Logo image */}
        <Box component="img" src={logo} alt="SkillMap Logo" style={styles.logo} />

        {/* Title */}
        <Typography variant="h6" style={styles.title}>
          SkillMap
        </Typography>
      </Toolbar>
    </AppBar>
  );
}