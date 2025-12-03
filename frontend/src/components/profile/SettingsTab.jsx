import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  TextField,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { colorPalette } from '../../styles/theme';
import ConfirmDialog from '../common/ConfirmDialog';

const SettingsTab = ({
  user,
  editingName,
  newName,
  setNewName,
  savingName,
  showDeleteConfirm,
  deleting,
  handleEditName,
  handleSaveName,
  handleCancelEditName,
  setShowDeleteConfirm,
  handleDeleteAccount,
}) => {
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Settings
      </Typography>

      {/* Edit Profile Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} mb={2} color={colorPalette.primary.darkGreen}>
          Profile Information
        </Typography>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Box flex={1} minWidth="200px">
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Full Name
            </Typography>
            {editingName ? (
              <TextField
                fullWidth
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                size="small"
                autoFocus
                sx={{ maxWidth: 400 }}
              />
            ) : (
              <Typography variant="body1" fontWeight={600}>
                {user?.full_name || 'N/A'}
              </Typography>
            )}
          </Box>
          <Box>
            {editingName ? (
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveName}
                  disabled={savingName}
                  sx={{
                    bgcolor: colorPalette.primary.darkGreen,
                    '&:hover': { bgcolor: '#1a8050' },
                  }}
                >
                  {savingName ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Save'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEditName}
                  disabled={savingName}
                  sx={{
                    borderColor: '#999',
                    color: '#666',
                    '&:hover': { borderColor: '#666', bgcolor: '#f5f5f5' },
                  }}
                >
                  Cancel
                </Button>
              </Box>
            ) : (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={handleEditName}
                sx={{
                  borderColor: colorPalette.primary.darkGreen,
                  color: colorPalette.primary.darkGreen,
                  '&:hover': {
                    borderColor: colorPalette.primary.darkGreen,
                    bgcolor: colorPalette.secondary.lightGreen,
                  },
                }}
              >
                Edit
              </Button>
            )}
          </Box>
        </Box>
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Email
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {user?.email}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Email cannot be changed
          </Typography>
        </Box>
      </Paper>

      {/* Delete Account Section */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          border: '2px solid #f44336',
          bgcolor: '#ffebee',
        }}
      >
        <Typography variant="h6" fontWeight={700} mb={2} color="#d32f2f">
          Danger Zone
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Once you delete your account, there is no going back. All your projects, resumes, and data will be permanently deleted.
        </Typography>
        <Button
          variant="contained"
          startIcon={<DeleteForeverIcon />}
          onClick={() => setShowDeleteConfirm(true)}
          sx={{
            bgcolor: '#d32f2f',
            color: '#fff',
            fontWeight: 600,
            '&:hover': {
              bgcolor: '#b71c1c',
            },
          }}
        >
          Delete Account
        </Button>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you absolutely sure you want to delete your account? This action cannot be undone. All your projects, resumes, and data will be permanently deleted."
        confirmText="Delete Forever"
        confirmColor="error"
        loading={deleting}
      />
    </Box>
  );
};

export default SettingsTab;
