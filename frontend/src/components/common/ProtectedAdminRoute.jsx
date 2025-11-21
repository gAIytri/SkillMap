import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedAdminRoute = ({ children }) => {
  const { admin, loading } = useAdmin();

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

  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
