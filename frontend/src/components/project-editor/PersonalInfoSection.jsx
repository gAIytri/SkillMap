import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SortableSection from './SortableSection';

const PersonalInfoSection = ({
  sectionKey,
  data,
  expanded,
  onToggle,
  renderSectionTitle
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
          {renderSectionTitle(sectionKey)}
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0.5, pb: 1.5, px: isMobile ? 1.5 : 2 }}>
          <Paper elevation={10} sx={{ p: isMobile ? 1 : 1.5, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
            <Box sx={{ fontSize: isMobile ? '13px' : '12px' }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {data.name}
              </Typography>
              {data.email && (
                <Typography variant="caption" display="block">
                  Email: {data.email}
                </Typography>
              )}
              {data.phone && (
                <Typography variant="caption" display="block">
                  Phone: {data.phone}
                </Typography>
              )}
              {data.location && (
                <Typography variant="caption" display="block">
                  Location: {data.location}
                </Typography>
              )}
              {data.header_links && data.header_links.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" fontWeight={600} display="block">
                    Links:
                  </Typography>
                  {data.header_links.map((link, idx) => (
                    <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                      • {link.text} {link.url && `(${link.url})`}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default PersonalInfoSection;
