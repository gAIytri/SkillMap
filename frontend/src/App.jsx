import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';

// Theme and Context
import theme from './styles/theme';
import GlobalStyles from './styles/globalStyles';
import { AuthProvider } from './context/AuthContext';

// Components
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UploadResume from './pages/UploadResume';
import ProjectEditor from './pages/ProjectEditor';

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#4caf50',
                secondary: '#fff',
              },
              style: {
                border: '1px solid #4caf50',
              },
            },
            error: {
              iconTheme: {
                primary: '#f44336',
                secondary: '#fff',
              },
              style: {
                border: '1px solid #f44336',
              },
            },
            loading: {
              iconTheme: {
                primary: '#2196f3',
                secondary: '#fff',
              },
            },
          }}
        />
        <Router>
          <AuthProvider>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '100vh',
              }}
            >
              <Navbar />
              <Box component="main" sx={{ flexGrow: 1 }}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/upload-resume"
                    element={
                      <ProtectedRoute>
                        <UploadResume />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/project/:projectId"
                    element={
                      <ProtectedRoute>
                        <ProjectEditor />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Box>
            </Box>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;