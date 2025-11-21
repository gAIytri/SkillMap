import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortableSection from './SortableSection';
import { formatTimestamp } from '../../utils/dateUtils';

const ProfessionalSummarySection = ({
  sectionKey,
  data,
  expanded,
  onToggle,
  renderSectionTitle,
  isEditing,
  tempData,
  onTempDataChange,
  history
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!data) return null;

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
              <TextField
                value={tempData}
                onChange={(e) => onTempDataChange(e.target.value)}
                multiline
                rows={8}
                fullWidth
                variant="standard"
                autoFocus
                placeholder="Enter professional summary..."
                InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px', lineHeight: 1.6 } }}
                InputLabelProps={{ style: { color: '#bdc3c7' } }}
                sx={{
                  '& .MuiInput-underline:before': { borderBottomColor: '#566573' },
                  '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
                }}
              />
            ) : (
              <Typography variant="body2" sx={{ fontSize: isMobile ? '14px' : '13px', lineHeight: 1.7, color: '#ecf0f1' }}>
                {data}
              </Typography>
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
                <Typography variant="body2" sx={{ fontSize: '11px', color: '#666' }}>
                  {version.resume_json?.professional_summary || 'No summary available'}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default ProfessionalSummarySection;
