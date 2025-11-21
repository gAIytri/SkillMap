import { Box, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery, Typography, IconButton, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SortableSection from './SortableSection';

const CertificationsSection = ({
  sectionKey,
  data,
  expanded,
  onToggle,
  renderSectionTitle,
  isEditing,
  tempData,
  updateTempField
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!data || data.length === 0) return null;

  return (
    <SortableSection key={sectionKey} id={sectionKey}>
      <Accordion
        expanded={expanded || false}
        onChange={onToggle}
        sx={{ mb: 1 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {renderSectionTitle(sectionKey, true)}
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 3, px: isMobile ? 2 : 3 }}>
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: '#2c3e50', color: '#fff' }}>
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
                      InputLabelProps={{ style: { color: '#bdc3c7' } }}
                      InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                      sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
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
                  <li key={idx} style={{ color: '#ecf0f1', marginBottom: '8px' }}>{cert}</li>
                ))}
              </ul>
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default CertificationsSection;
