import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
        <AccordionDetails sx={{ pt: 0.5, pb: 1.5, px: isMobile ? 1.5 : 2 }}>
          <Paper elevation={0} sx={{ p: isMobile ? 1 : 1.5, mb: 1, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
            {isEditing ? (
              // EDITING MODE
              tempData.map((exp, idx) => (
                <Box key={idx} sx={{ mb: 2, p: isMobile ? 1 : 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #ddd' }}>
                  <TextField
                    label="Job Title"
                    value={exp.title || ''}
                    onChange={(e) => updateTempField(idx, 'title', e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: isMobile ? '14px' : '12px' } }}
                  />
                  <TextField
                    label="Company"
                    value={exp.company || ''}
                    onChange={(e) => updateTempField(idx, 'company', e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: isMobile ? '14px' : '12px' } }}
                  />
                  <TextField
                    label="Bullets (one per line)"
                    value={exp.bullets ? exp.bullets.join('\n') : ''}
                    onChange={(e) => updateTempField(idx, 'bullets', e.target.value.split('\n').filter(b => b.trim()))}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                    sx={{ '& .MuiInputBase-root': { fontSize: isMobile ? '13px' : '11px' } }}
                  />
                </Box>
              ))
            ) : (
              // VIEW MODE
              data.map((exp, idx) => (
                <Box key={idx} sx={{ mb: 1.5, fontSize: isMobile ? '13px' : '12px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '14px' : 'inherit' }}>
                    {exp.title} at {exp.company}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>
                    {exp.start_date} - {exp.end_date}
                    {exp.location && ` | ${exp.location}`}
                  </Typography>
                  {exp.bullets && exp.bullets.length > 0 && (
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {exp.bullets.map((bullet, bidx) => (
                        <li key={bidx} style={{ fontSize: isMobile ? '12px' : '11px' }}>{bullet}</li>
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
