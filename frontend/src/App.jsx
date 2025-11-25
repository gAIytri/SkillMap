import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, IconButton } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster, toast } from 'react-hot-toast';
import CloseIcon from '@mui/icons-material/Close';

// Theme and Context
import theme from './styles/theme';
import GlobalStyles from './styles/globalStyles';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { ProjectProvider } from './context/ProjectContext';

// Components
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import ProtectedAdminRoute from './components/common/ProtectedAdminRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Landing from './pages/Landing';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import UploadResume from './pages/UploadResume';
import ProjectEditor from './pages/ProjectEditor';
import Profile from './pages/Profile';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

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
        >
          {(t) => (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                padding: '12px 16px',
                borderRadius: '8px',
              }}
            >
              {t.icon}
              <div style={{ flex: 1 }}>{t.message}</div>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.remove(t.id);
                }}
                sx={{
                  color: '#999',
                  padding: '4px',
                  marginLeft: '8px',
                  '&:hover': {
                    color: '#333',
                    bgcolor: 'rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </div>
          )}
        </Toaster>
        <ErrorBoundary>
          <Router>
            <AuthProvider>
              <ProjectProvider>
                <AdminProvider>
                  <Routes>
                  {/* Admin Routes (without Navbar) */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedAdminRoute>
                        <AdminDashboard />
                      </ProtectedAdminRoute>
                    }
                  />

                  {/* Regular User Routes (with Navbar) */}
                  <Route
                    path="/*"
                    element={
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100vh',
                          overflow: 'hidden',
                        }}
                      >
                        <Navbar />
                        <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
                          <Routes>
                            {/* Public Routes */}
                            <Route path="/" element={<Landing />} />
                            <Route path="/verify-email" element={<VerifyEmail />} />
                            <Route path="/verify-email/:token" element={<VerifyEmail />} />

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
                            <Route
                              path="/profile"
                              element={
                                <ProtectedRoute>
                                  <Profile />
                                </ProtectedRoute>
                              }
                            />
                          </Routes>
                        </Box>
                      </Box>
                    }
                  />
                </Routes>
                </AdminProvider>
              </ProjectProvider>
            </AuthProvider>
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;