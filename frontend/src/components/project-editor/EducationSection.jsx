import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { colorPalette } from '../../styles/theme';

const EducationSection = ({
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
              <>
                {tempData.map((edu, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      mb: 3,
                      p: 2.5,
                      borderRadius: '8px',
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      position: 'relative'
                    }}
                  >
                    {/* Delete button - positioned at top right */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: '#e74c3c',
                        bgcolor: 'rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(231, 76, 60, 0.2)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pr: 5 }}>
                      <TextField
                        label="Degree"
                        value={edu.degree || ''}
                        onChange={(e) => updateTempField(idx, 'degree', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Institution"
                        value={edu.institution || ''}
                        onChange={(e) => updateTempField(idx, 'institution', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Graduation Date"
                        value={edu.graduation_date || ''}
                        onChange={(e) => updateTempField(idx, 'graduation_date', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row' }}>
                        <TextField
                          label="GPA"
                          value={edu.gpa || ''}
                               onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              updateTempField(idx, 'gpa', value);
                            }
                          }}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen }, shrink: true }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                        <TextField
                          label="Out of"
                          value={edu.gpa_out_of || ''}
                          onChange={(e) => {
                            // Only allow numbers
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              updateTempField(idx, 'gpa_out_of', value);
                            }
                          }}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen }, shrink: true }}
                          InputProps={{
                            style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' },
                            inputProps: { inputMode: 'decimal' }
                          }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, { degree: '', institution: '', graduation_date: '', gpa: '', gpa_out_of: '' }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Education
                </Button>
              </>
            ) : (
              data.map((edu, idx) => (
                <Box key={idx} sx={{ mb: 2, fontSize: isMobile ? '14px' : '13px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>{edu.degree}</Typography>
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen }}>
                    {edu.institution}
                    {edu.graduation_date && ` | ${edu.graduation_date}`}
                    {edu.gpa && ` | GPA: ${edu.gpa}${edu.gpa_out_of ? `/${edu.gpa_out_of}` : ''}`}
                  </Typography>
                </Box>
              ))
            )}
      </Paper>
    </Box>
  );
};

export default EducationSection;
