import { Box, Typography, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortableSection from './SortableSection';

const SkillsSection = ({
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
            tempData.map((skillCat, idx) => (
              <Box key={idx} sx={{ mb: 1.5, p: isMobile ? 1 : 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #ddd' }}>
                <TextField
                  label="Category"
                  value={skillCat.category || ''}
                  onChange={(e) => updateTempField(idx, 'category', e.target.value)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: isMobile ? '14px' : '12px' } }}
                />
                <TextField
                  label="Skills (comma-separated)"
                  value={skillCat.skills ? skillCat.skills.join(', ') : ''}
                  onChange={(e) => updateTempField(idx, 'skills', e.target.value.split(',').map(s => s.trim()))}
                  fullWidth
                  size="small"
                  sx={{ '& .MuiInputBase-root': { fontSize: isMobile ? '13px' : '11px' } }}
                />
              </Box>
            ))
          ) : (
            // VIEW MODE
            data.map((skillCat, idx) => (
              <Box key={idx} sx={{ mb: 1, fontSize: isMobile ? '13px' : '12px' }}>
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: isMobile ? '13px' : 'inherit' }}>{skillCat.category}:</Typography>
                <Typography variant="caption" sx={{ ml: 1, fontSize: isMobile ? '12px' : 'inherit' }}>{skillCat.skills.join(', ')}</Typography>
              </Box>
            ))
          )}
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default SkillsSection;
