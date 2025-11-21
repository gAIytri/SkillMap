import { Box, Typography, Paper, TextField, Accordion, AccordionSummary, AccordionDetails, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SortableSection from './SortableSection';

const PersonalInfoSection = ({
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
          <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, bgcolor: '#2c3e50', color: '#fff' }}>
            {isEditing ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Name"
                  value={tempData?.name || ''}
                  onChange={(e) => updateTempField(null, 'name', e.target.value)}
                  fullWidth
                  variant="standard"
                  InputLabelProps={{ style: { color: '#bdc3c7' } }}
                  InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                  sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                />
                <TextField
                  label="Email"
                  value={tempData?.email || ''}
                  onChange={(e) => updateTempField(null, 'email', e.target.value)}
                  fullWidth
                  variant="standard"
                  InputLabelProps={{ style: { color: '#bdc3c7' } }}
                  InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                  sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                />
                <TextField
                  label="Phone"
                  value={tempData?.phone || ''}
                  onChange={(e) => updateTempField(null, 'phone', e.target.value)}
                  fullWidth
                  variant="standard"
                  InputLabelProps={{ style: { color: '#bdc3c7' } }}
                  InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                  sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                />
                <TextField
                  label="Location"
                  value={tempData?.location || ''}
                  onChange={(e) => updateTempField(null, 'location', e.target.value)}
                  fullWidth
                  variant="standard"
                  InputLabelProps={{ style: { color: '#bdc3c7' } }}
                  InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                  sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                />
                <Box>
                  <Typography variant="caption" sx={{ color: '#bdc3c7', mb: 1, display: 'block' }}>
                    Links
                  </Typography>
                  {(tempData?.header_links || []).map((link, idx) => (
                    <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <TextField
                          placeholder="Link text"
                          value={link.text || ''}
                          onChange={(e) => {
                            const newLinks = [...(tempData?.header_links || [])];
                            newLinks[idx] = { ...newLinks[idx], text: e.target.value };
                            updateTempField(null, 'header_links', newLinks);
                          }}
                          fullWidth
                          variant="standard"
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                        <TextField
                          placeholder="URL"
                          value={link.url || ''}
                          onChange={(e) => {
                            const newLinks = [...(tempData?.header_links || [])];
                            newLinks[idx] = { ...newLinks[idx], url: e.target.value };
                            updateTempField(null, 'header_links', newLinks);
                          }}
                          fullWidth
                          variant="standard"
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: '#566573' }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const newLinks = [...(tempData?.header_links || [])];
                          newLinks.splice(idx, 1);
                          updateTempField(null, 'header_links', newLinks);
                        }}
                        sx={{ color: '#e74c3c', mt: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newLinks = [...(tempData?.header_links || []), { text: '', url: '' }];
                      updateTempField(null, 'header_links', newLinks);
                    }}
                    sx={{ color: '#fff', textTransform: 'none', mt: 1 }}
                  >
                    Add Link
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ fontSize: isMobile ? '14px' : '13px' }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1, color: '#fff' }}>
                  {data.name}
                </Typography>
                {data.email && (
                  <Typography variant="body2" display="block" sx={{ mb: 0.5, color: '#ecf0f1' }}>
                    {data.email}
                  </Typography>
                )}
                {data.phone && (
                  <Typography variant="body2" display="block" sx={{ mb: 0.5, color: '#ecf0f1' }}>
                    {data.phone}
                  </Typography>
                )}
                {data.location && (
                  <Typography variant="body2" display="block" sx={{ mb: 0.5, color: '#ecf0f1' }}>
                    {data.location}
                  </Typography>
                )}
                {data.header_links && data.header_links.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    {data.header_links.map((link, idx) => (
                      <Typography key={idx} variant="body2" display="block" sx={{ ml: 0, color: '#ecf0f1', mb: 0.3 }}>
                        {link.text} {link.url && `(${link.url})`}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  );
};

export default PersonalInfoSection;
