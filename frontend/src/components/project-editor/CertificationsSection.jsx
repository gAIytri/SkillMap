import { Box, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
        <AccordionDetails sx={{ pt: 0.5, pb: 1.5, px: isMobile ? 1.5 : 2 }}>
          {isEditing ? (
            // EDITING MODE
            <Box>
              {tempData.map((cert, idx) => (
                <TextField
                  key={idx}
                  value={cert}
                  onChange={(e) => updateTempField(idx, null, e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: isMobile ? '14px' : '12px' } }}
                />
              ))}
            </Box>
          ) : (
            // VIEW MODE
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: isMobile ? '13px' : '12px' }}>
              {data.map((cert, idx) => (
                <li key={idx}>{cert}</li>
              ))}
            </ul>
          )}
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default CertificationsSection;
