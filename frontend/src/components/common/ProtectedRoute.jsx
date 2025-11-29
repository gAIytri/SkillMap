import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not logged in - redirect to landing page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Logged in but email not verified - redirect to verification page
  if (!user.email_verified) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />;
  }

  // User is logged in AND verified - allow access
  return children;
};

export default ProtectedRoute;
