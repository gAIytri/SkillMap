import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortableSection from './SortableSection';

const ProjectsSection = ({
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
          <Paper elevation={0} sx={{ p: isMobile ? 1 : 1.5, mb: 1, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
            {isEditing ? (
              // EDITING MODE - All projects editable
              tempData.map((proj, idx) => (
                <Box key={idx} sx={{ mb: 2, p: isMobile ? 1 : 1.5, bgcolor: '#fff', borderRadius: 1, border: '1px solid #ddd' }}>
                  <TextField
                    label="Project Name"
                    value={proj.name || ''}
                    onChange={(e) => updateTempField(idx, 'name', e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: isMobile ? '14px' : '12px' } }}
                  />
                  <TextField
                    label="Description"
                    value={proj.description || ''}
                    onChange={(e) => updateTempField(idx, 'description', e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    size="small"
                    sx={{ mb: 1, '& .MuiInputBase-root': { fontSize: isMobile ? '13px' : '11px' } }}
                  />
                  <TextField
                    label="Technologies (comma-separated)"
                    value={proj.technologies ? proj.technologies.join(', ') : ''}
                    onChange={(e) => updateTempField(idx, 'technologies', e.target.value.split(',').map(t => t.trim()))}
                    fullWidth
                    size="small"
                    sx={{ '& .MuiInputBase-root': { fontSize: isMobile ? '13px' : '11px' } }}
                  />
                </Box>
              ))
            ) : (
              // VIEW MODE - Display only
              data.map((proj, idx) => (
                <Box key={idx} sx={{ mb: 1.5, fontSize: isMobile ? '13px' : '12px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '14px' : 'inherit' }}>{proj.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>{proj.description}</Typography>
                  {proj.technologies && proj.technologies.length > 0 && (
                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mt: 0.5, fontSize: isMobile ? '12px' : 'inherit' }}>
                      Tech: {proj.technologies.join(', ')}
                    </Typography>
                  )}
                </Box>
              ))
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default ProjectsSection;
