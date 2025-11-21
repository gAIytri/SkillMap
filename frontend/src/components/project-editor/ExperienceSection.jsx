import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SortableSection from './SortableSection';
import { formatTimestamp } from '../../utils/dateUtils';

const ExperienceSection = ({
  sectionKey,
  data,
  expanded,
  onToggle,
  renderSectionTitle,
  isEditing,
  tempData,
  updateTempField,
  history
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
                {tempData.map((exp, idx) => (
                  <Box key={idx} sx={{ mb: 4, display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        label="Job Title"
                        value={exp.title || ''}
                        onChange={(e) => updateTempField(idx, 'title', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Company"
                        value={exp.company || ''}
                        onChange={(e) => updateTempField(idx, 'company', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Bullets (one per line)"
                        value={exp.bullets ? exp.bullets.join('\n') : ''}
                        onChange={(e) => updateTempField(idx, 'bullets', e.target.value.split('\n').filter(b => b.trim()))}
                        fullWidth
                        multiline
                        rows={8}
                        variant="standard"
                        InputLabelProps={{ style: { color: '#bdc3c7' } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px', lineHeight: 1.6 } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                    </Box>
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
                    const newData = [...tempData, { title: '', company: '', bullets: [], start_date: '', end_date: '', location: '' }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Experience
                </Button>
              </>
            ) : (
              // VIEW MODE
              data.map((exp, idx) => (
                <Box key={idx} sx={{ mb: 2.5, fontSize: isMobile ? '14px' : '13px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>
                    {exp.title} at {exp.company}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: '#bdc3c7' }}>
                    {exp.start_date} - {exp.end_date}
                    {exp.location && ` | ${exp.location}`}
                  </Typography>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {exp.bullets.map((bullet, bidx) => (
                        <li key={bidx} style={{ fontSize: isMobile ? '13px' : '12px', color: '#ecf0f1', marginBottom: '6px' }}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </Box>
              ))
            )}
          </Paper>
          {history.map((version, idx) => (
            <Accordion key={idx} sx={{ mb: 0.5, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '36px', '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                  <Typography variant="caption" fontWeight={600}>
                    Version {idx + 1}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    {formatTimestamp(version.timestamp)}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ py: 1 }}>
                {version.resume_json?.experience?.map((exp, eidx) => (
                  <Box key={eidx} sx={{ mb: 1, fontSize: '11px' }}>
                    <Typography variant="caption" fontWeight={600}>
                      {exp.title} at {exp.company}
                    </Typography>
                    {exp.bullets && exp.bullets.length > 0 && (
                      <ul style={{ margin: '2px 0', paddingLeft: '18px', fontSize: '10px' }}>
                        {exp.bullets.map((bullet, bidx) => (
                          <li key={bidx}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default ExperienceSection;
