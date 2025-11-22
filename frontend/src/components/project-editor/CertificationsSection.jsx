import { Box, Paper, TextField, useTheme, useMediaQuery, Typography, IconButton, Button } from '@mui/material';
import { colorPalette } from '../../styles/theme';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const CertificationsSection = ({
  sectionKey,
  data,
  isEditing,
  tempData,
  updateTempField
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!data || data.length === 0) return null;

  return (
    <Box>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
            {isEditing ? (
              // EDITING MODE
              <>
                {tempData.map((cert, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                    <TextField
                      value={cert}
                      onChange={(e) => updateTempField(idx, null, e.target.value)}
                      fullWidth
                      variant="standard"
                      placeholder={`Certification ${idx + 1}`}
                      InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                      InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                      sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
                      }}
                      sx={{ color: '#e74c3c', alignSelf: 'flex-start' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, ''];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 1 }}
                >
                  Add Certification
                </Button>
              </>
            ) : (
              // VIEW MODE
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: isMobile ? '14px' : '13px', lineHeight: 1.8 }}>
                {data.map((cert, idx) => (
                  <li key={idx} style={{ color: '#fff', marginBottom: '8px' }}>{cert}</li>
                ))}
              </ul>
            )}
      </Paper>
    </Box>
  );
};

export default CertificationsSection;
