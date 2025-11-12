import React from 'react';
import { Box } from '@mui/material';
import LoginBox from '../components/LoginBox';

const styles = {
  page: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default function AuthPage() {
  return (
    <Box style={styles.page}>
      <LoginBox />
    </Box>
  );
}