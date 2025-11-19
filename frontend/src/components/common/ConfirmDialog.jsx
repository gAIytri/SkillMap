import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { colorPalette } from '../../styles/theme';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'error',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1.5}>
          <WarningAmberIcon
            sx={{
              color: confirmColor === 'error' ? 'error.main' : colorPalette.primary.darkGreen,
              fontSize: 28,
            }}
          />
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            color: 'text.secondary',
            borderColor: '#e0e0e0',
            '&:hover': {
              borderColor: '#bdbdbd',
              bgcolor: '#f5f5f5',
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          variant="contained"
          color={confirmColor}
          sx={{
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 2,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
