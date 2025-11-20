import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortableSection from './SortableSection';

const EducationSection = ({
  sectionKey,
  data,
  expanded,
  onToggle,
  renderSectionTitle
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
          <Box display="flex" alignItems="center" gap={0.5}>
            {renderSectionTitle(sectionKey)}
            <Typography variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
              ({data.length})
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0.5, pb: 1.5, px: isMobile ? 1.5 : 2 }}>
          {data.map((edu, idx) => (
            <Box key={idx} sx={{ mb: 1, fontSize: isMobile ? '13px' : '12px' }}>
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '14px' : 'inherit' }}>{edu.degree}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>
                {edu.institution}
                {edu.graduation_date && ` | ${edu.graduation_date}`}
                {edu.gpa && ` | GPA: ${edu.gpa}`}
              </Typography>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default EducationSection;
