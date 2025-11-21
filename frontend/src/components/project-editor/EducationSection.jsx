import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortableSection from './SortableSection';

const EducationSection = ({
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
              tempData.map((edu, idx) => (
                <Box key={idx} sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <TextField
                    label="Degree"
                    value={edu.degree || ''}
                    onChange={(e) => updateTempField(idx, 'degree', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: '#bdc3c7' } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                  <TextField
                    label="Institution"
                    value={edu.institution || ''}
                    onChange={(e) => updateTempField(idx, 'institution', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: '#bdc3c7' } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                  <TextField
                    label="Graduation Date"
                    value={edu.graduation_date || ''}
                    onChange={(e) => updateTempField(idx, 'graduation_date', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: '#bdc3c7' } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                  <TextField
                    label="GPA"
                    value={edu.gpa || ''}
                    onChange={(e) => updateTempField(idx, 'gpa', e.target.value)}
                    fullWidth
                    variant="standard"
                    InputLabelProps={{ style: { color: '#bdc3c7' } }}
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                    sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                  />
                </Box>
              ))
            ) : (
              data.map((edu, idx) => (
                <Box key={idx} sx={{ mb: 2, fontSize: isMobile ? '14px' : '13px' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff' }}>{edu.degree}</Typography>
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: '#bdc3c7' }}>
                    {edu.institution}
                    {edu.graduation_date && ` | ${edu.graduation_date}`}
                    {edu.gpa && ` | GPA: ${edu.gpa}`}
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default EducationSection;
