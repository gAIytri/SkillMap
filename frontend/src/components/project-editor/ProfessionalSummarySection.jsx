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
        <AccordionDetails sx={{ pt: 0.5, pb: 1.5, px: isMobile ? 1.5 : 2 }}>
          <Paper elevation={0} sx={{ p: isMobile ? 1 : 1.5, mb: 1, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
            {isEditing ? (
              <TextField
                value={tempData}
                onChange={(e) => onTempDataChange(e.target.value)}
                multiline
                rows={4}
                fullWidth
                size="small"
                autoFocus
                sx={{ '& .MuiInputBase-root': { fontSize: isMobile ? '14px' : '12px' } }}
              />
            ) : (
              <Typography variant="body2" sx={{ fontSize: isMobile ? '13px' : '12px' }}>
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
