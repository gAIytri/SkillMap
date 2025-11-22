import { Box, Button, Typography, TextField, Drawer } from '@mui/material';
import { colorPalette } from '../../styles/theme';

const JobDescriptionDrawer = ({
  open,
  onClose,
  jobDescription,
  onJobDescriptionChange,
  tailoring,
  extractedData,
  onTailorResume,
}) => {
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '450px',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: '#ffffff',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 2,
            borderBottom: '2px solid',
            borderColor: colorPalette.primary.darkGreen,
            bgcolor: 'rgba(76, 175, 80, 0.04)',
          }}
        >
          <Typography variant="h6" fontWeight={700} color="colorPalette.primary.darkGreen" gutterBottom>
            Job Description
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Paste the job description below and click "Tailor" to optimize your resume
          </Typography>
        </Box>

        {/* Job Description TextField */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: colorPalette.secondary.gray }}>
          <TextField
            fullWidth
            multiline
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
            placeholder="Paste the job description here..."
            sx={{
              '& .MuiInputBase-root': {
                fontSize: '14px',
                lineHeight: '1.6',
                bgcolor: '#ffffff',
                borderRadius: '8px',
              },
              '& fieldset': {
                borderColor: '#d1d9e0',
              },
              '& .MuiInputBase-root:hover fieldset': {
                borderColor: colorPalette.primary.darkGreen,
              },
              '& .MuiInputBase-root.Mui-focused fieldset': {
                borderColor: colorPalette.primary.darkGreen,
                borderWidth: '2px',
              },
            }}
            rows={20}
          />
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e1e8ed',
            display: 'flex',
            gap: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              textTransform: 'none',
              color: '#666',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onTailorResume();
              onClose();
            }}
            disabled={tailoring || !jobDescription || !extractedData}
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              color: '#ffffff',
              textTransform: 'none',
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            {tailoring ? 'Tailoring...' : 'Tailor Resume'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default JobDescriptionDrawer;
