import { Dialog, DialogTitle, DialogContent, Box, Typography, Card, CardContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ArticleIcon from '@mui/icons-material/Article';
import { colorPalette } from '../../styles/theme';

const SECTION_TEMPLATES = [
  {
    id: 'text',
    name: 'Simple Text',
    description: 'Plain text content (like Professional Summary)',
    icon: TextFieldsIcon,
    preview: (
      <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1, color: colorPalette.primary.darkGreen }}>
          SECTION NAME
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>
          This is a simple text section where you can write a paragraph or two. Perfect for summaries, objectives, or any free-form content.
        </Typography>
      </Box>
    ),
    structure: {
      type: 'text',
      content: 'Enter your text content here. You can write multiple paragraphs to describe this section.'
    }
  },
  {
    id: 'list',
    name: 'List with Headers',
    description: 'Items with titles, subtitles, and bullet points (like Experience or Projects)',
    icon: FormatListBulletedIcon,
    preview: (
      <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1, color: colorPalette.primary.darkGreen }}>
          SECTION NAME
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.75rem' }}>Item Title</Typography>
            <Typography sx={{ fontSize: '0.7rem', fontStyle: 'italic', color: '#666' }}>Subtitle/Date</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.65rem', color: '#888', mb: 0.5 }}>Optional description line</Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.65rem', color: '#666' }}>
            <li>Bullet point detail 1</li>
            <li>Bullet point detail 2</li>
          </Box>
        </Box>
      </Box>
    ),
    structure: {
      type: 'list',
      items: [
        {
          title: 'Example Item',
          subtitle: 'Sample Subtitle',
          description: 'Brief description of this item',
          bullets: [
            'Detail point 1 - describe your achievement or responsibility',
            'Detail point 2 - add specific metrics or outcomes if possible'
          ]
        }
      ]
    }
  },
  {
    id: 'simple_list',
    name: 'Simple Bullets',
    description: 'Just bullet points without headers (like Skills or Certifications)',
    icon: ArticleIcon,
    preview: (
      <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1, fontSize: '0.75rem', fontFamily: 'monospace' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1, color: colorPalette.primary.darkGreen }}>
          SECTION NAME
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: '0.7rem', color: '#666' }}>
          <li>Item one</li>
          <li>Item two</li>
          <li>Item three</li>
          <li>Item four</li>
        </Box>
      </Box>
    ),
    structure: {
      type: 'simple_list',
      items: [
        'Example item 1',
        'Example item 2',
        'Example item 3'
      ]
    }
  }
];

const SectionTemplateModal = ({ open, onClose, onSelectTemplate }) => {
  const handleTemplateSelect = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh'
        }
      }}
    >
      <DialogTitle sx={{
        bgcolor: colorPalette.primary.darkGreen,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 2
      }}>
        <Box>
          <Typography variant="h6" fontWeight={700} color='#f4f4f4' fontFamily="Poppins, sans-serif">
            Choose Section Template
          </Typography>
          <Typography variant="body2" color='#f4f4f4' sx={{ opacity: 0.9, mt: 0.5 }}>
            Select a template that best fits your content
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#f5f7fa' }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
          mt: 1
        }}>
          {SECTION_TEMPLATES.map((template) => {
            const IconComponent = template.icon;
            return (
              <Card
                key={template.id}
                sx={{
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid',
                  borderColor: 'transparent',
                  '&:hover': {
                    borderColor: colorPalette.primary.brightGreen,
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(76, 175, 80, 0.2)'
                  }
                }}
                onClick={() => handleTemplateSelect(template)}
              >
                <CardContent sx={{ p: 2.5 }}>
                  {/* Icon and Title */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Box
                      sx={{
                        bgcolor: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: 1.5,
                        p: 1,
                        mr: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <IconComponent sx={{ fontSize: 28, color: colorPalette.primary.darkGreen }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700} fontFamily="Poppins, sans-serif">
                        {template.name}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.85rem', minHeight: '40px' }}>
                    {template.description}
                  </Typography>

                  {/* Preview */}
                  <Box sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    overflow: 'hidden',
                    bgcolor: 'white'
                  }}>
                    {template.preview}
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Help Text */}
        <Box sx={{
          mt: 3,
          p: 2,
          bgcolor: 'rgba(76, 175, 80, 0.08)',
          borderRadius: 2,
          border: '1px solid rgba(76, 175, 80, 0.2)'
        }}>
          <Typography variant="body2" color="text.secondary" textAlign={'center'} sx={{ fontSize: '0.85rem' }}>
            <strong> After creating a section, you can customize its name and add your content.
            </strong>
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SectionTemplateModal;
