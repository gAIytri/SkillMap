import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Box, TextField, Button, Typography, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    borderRadius: '14px',
    padding: '1.8rem 1.5rem',     // ⬇️ smaller padding
    width: '85%',
    maxWidth: '440px',            // ⬇️ narrower width
    minHeight: '320px',           // ⬇️ shorter height
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 20px rgba(0,0,0,0.2)',
  },

  title: {
    color: '#E0E9CC',
    fontFamily: 'Poppins, sans-serif',
    fontSize: '1.4rem',          // ⬇️ smaller text
    fontWeight: 600,
    marginBottom: '1rem',
    textAlign: 'center',
  },

  input: {
    marginBottom: '0.8rem',      // tighter spacing
    width: '100%',
    backgroundColor: 'rgba(244, 244, 244, 0.95)',
    borderRadius: '5px',
  },

  button: {
    backgroundColor: '#072D1F',
    color: '#E0E9CC',
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.65rem',          // ⬇️ slimmer button
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '0.85rem',         // ⬇️ slightly smaller text
    fontFamily: 'Poppins, sans-serif',
    letterSpacing: '0.4px',
  },

  googleButton: {
    marginTop: '0.8rem',
    backgroundColor: '#F4F4F4',
    color: '#111111',
    width: '100%',
    borderRadius: '8px',
    textTransform: 'none',
    padding: '0.65rem',
    fontWeight: 500,
    fontSize: '0.85rem',
  },

  divider: {
    width: '75%',
    margin: '1.2rem 0',
    borderColor: '#E0E9CC',
  },

  toggleText: {
    color: '#F4F4F4',
    marginTop: '0.6rem',
    cursor: 'pointer',
    fontSize: '0.8rem',          // smaller toggle text
    textAlign: 'center',
  },
};

export default function LoginBox() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (email && password) {
      navigate('/dashboard');
    } else {
      toast.error('Please enter both email and password.');
    }
  };

  return (
    <Box style={styles.container}>
      <Typography style={styles.title}>
        {isLogin ? 'Login' : 'Sign Up'}
      </Typography>

      <TextField
        label="Email"
        variant="outlined"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={styles.input}
      />
      <TextField
        label="Password"
        variant="outlined"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={styles.input}
      />

      {!isLogin && (
        <TextField
          label="Confirm Password"
          variant="outlined"
          type="password"
          style={styles.input}
        />
      )}

      <Button style={styles.button} onClick={handleSubmit}>
        {isLogin ? 'LOGIN' : 'SIGN UP'}
      </Button>

      <Divider style={styles.divider} />

      <Button startIcon={<GoogleIcon />} style={styles.googleButton}>
        Continue with Google
      </Button>

      <Typography
        onClick={() => setIsLogin(!isLogin)}
        style={styles.toggleText}
      >
        {isLogin
          ? "Don't have an account? Sign up"
          : 'Already have an account? Login'}
      </Typography>
    </Box>
  );
}