import { useState } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button } from '@mui/material';
import { colorPalette } from '../../styles/theme';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const CustomSection = ({
  sectionKey,
  sectionName,
  customSection,
  isEditing,
  tempData,
  updateTempField,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!customSection) return null;

  // Render text type editor
  const renderTextEditor = () => (
    <TextField
      label="Content"
      value={tempData.content || ''}
      onChange={(e) => updateTempField(null, 'content', e.target.value)}
      fullWidth
      multiline
      rows={6}
      variant="standard"
      InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
      InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
      sx={{
        '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
        '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
      }}
    />
  );

  // Render text type view
  const renderTextView = () => (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: '#fff', fontSize: isMobile ? '14px' : '13px' }}>
      {customSection.content}
    </Typography>
  );

  // Render list type editor
  const renderListEditor = () => (
    <>
      {tempData.items.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: '8px',
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}
        >
          {/* Delete button */}
          <IconButton
            size="small"
            onClick={() => {
              const newItems = [...tempData.items];
              newItems.splice(idx, 1);
              updateTempField(null, 'items', newItems);
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: '#e74c3c',
              bgcolor: 'rgba(0, 0, 0, 0.2)',
              '&:hover': {
                bgcolor: 'rgba(231, 76, 60, 0.2)'
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pr: 5 }}>
            <TextField
              label="Title"
              value={item.title || ''}
              onChange={(e) => {
                const newItems = [...tempData.items];
                newItems[idx] = { ...newItems[idx], title: e.target.value };
                updateTempField(null, 'items', newItems);
              }}
              fullWidth
              variant="standard"
              InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
              InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
              sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
            />
            <TextField
              label="Subtitle"
              value={item.subtitle || ''}
              onChange={(e) => {
                const newItems = [...tempData.items];
                newItems[idx] = { ...newItems[idx], subtitle: e.target.value };
                updateTempField(null, 'items', newItems);
              }}
              fullWidth
              variant="standard"
              InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
              InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
              sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
            />
            <TextField
              label="Description (optional)"
              value={item.description || ''}
              onChange={(e) => {
                const newItems = [...tempData.items];
                newItems[idx] = { ...newItems[idx], description: e.target.value };
                updateTempField(null, 'items', newItems);
              }}
              fullWidth
              multiline
              rows={2}
              variant="standard"
              InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
              InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
              sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
            />
            {/* Bullet Points - Individual inputs */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" sx={{ color: colorPalette.secondary.mediumGreen, fontSize: isMobile ? '13px' : '12px', mb: 1, display: 'block' }}>
                Bullet Points
              </Typography>
              {item.bullets && item.bullets.map((bullet, bulletIdx) => (
                <Box key={bulletIdx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                  <TextField
                    value={bullet}
                    onChange={(e) => {
                      const newItems = [...tempData.items];
                      const newBullets = [...newItems[idx].bullets];
                      newBullets[bulletIdx] = e.target.value;
                      newItems[idx] = { ...newItems[idx], bullets: newBullets };
                      updateTempField(null, 'items', newItems);
                    }}
                    fullWidth
                    placeholder={`Bullet point ${bulletIdx + 1}`}
                    variant="standard"
                    InputProps={{ style: { color: '#fff', fontSize: isMobile ? '13px' : '12px' } }}
                    sx={{
                      '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                      '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
                    }}
                  />
                  {/* Only show delete button if more than 1 bullet */}
                  {item.bullets.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newItems = [...tempData.items];
                        const newBullets = [...newItems[idx].bullets];
                        newBullets.splice(bulletIdx, 1);
                        newItems[idx] = { ...newItems[idx], bullets: newBullets };
                        updateTempField(null, 'items', newItems);
                      }}
                      sx={{
                        color: '#e74c3c',
                        bgcolor: 'rgba(0, 0, 0, 0.2)',
                        mt: 0.5,
                        '&:hover': {
                          bgcolor: 'rgba(231, 76, 60, 0.2)'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
              {/* Add Bullet Button */}
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  const newItems = [...tempData.items];
                  newItems[idx] = {
                    ...newItems[idx],
                    bullets: [...(newItems[idx].bullets || []), '']
                  };
                  updateTempField(null, 'items', newItems);
                }}
                sx={{ color: '#fff', textTransform: 'none', fontSize: '0.75rem', mt: 1 }}
                size="small"
              >
                Add Bullet
              </Button>
            </Box>
          </Box>
        </Box>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={() => {
          const newItems = [
            ...tempData.items,
            { title: '', subtitle: '', description: '', bullets: [] }
          ];
          updateTempField(null, 'items', newItems);
        }}
        sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
      >
        Add Item
      </Button>
    </>
  );

  // Render list type view
  const renderListView = () => (
    <>
      {customSection.items.map((item, idx) => (
        <Box key={idx} sx={{ mb: 2.5, pb: 2, borderBottom: idx < customSection.items.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', fontSize: isMobile ? '15px' : '14px' }}>
              {item.title}
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', fontSize: isMobile ? '13px' : '12px' }}>
              {item.subtitle}
            </Typography>
          </Box>
          {item.description && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1, fontSize: isMobile ? '14px' : '13px' }}>
              {item.description}
            </Typography>
          )}
          {item.bullets && item.bullets.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {item.bullets.map((bullet, bulletIndex) => (
                <Typography component="li" key={bulletIndex} variant="body2" sx={{ mb: 0.5, color: '#fff', fontSize: isMobile ? '13px' : '12px' }}>
                  {bullet}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      ))}
    </>
  );

  // Render simple_list type editor
  const renderSimpleListEditor = () => (
    <>
      {tempData.items.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            mb: 2,
            p: 2,
            borderRadius: '8px',
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative'
          }}
        >
          {/* Delete button - only show if more than 1 item */}
          {tempData.items.length > 1 && (
            <IconButton
              size="small"
              onClick={() => {
                const newItems = [...tempData.items];
                newItems.splice(idx, 1);
                updateTempField(null, 'items', newItems);
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#e74c3c',
                bgcolor: 'rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  bgcolor: 'rgba(231, 76, 60, 0.2)'
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}

          <TextField
            label={`Item ${idx + 1}`}
            value={item}
            onChange={(e) => {
              const newItems = [...tempData.items];
              newItems[idx] = e.target.value;
              updateTempField(null, 'items', newItems);
            }}
            fullWidth
            variant="standard"
            InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
            InputProps={{ style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' } }}
            sx={{
              pr: tempData.items.length > 1 ? 5 : 0,
              '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
              '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
            }}
          />
        </Box>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={() => {
          const newItems = [...tempData.items, ''];
          updateTempField(null, 'items', newItems);
        }}
        sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
      >
        Add Item
      </Button>
    </>
  );

  // Render simple_list type view
  const renderSimpleListView = () => (
    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
      {customSection.items.map((item, idx) => (
        <Typography component="li" key={idx} variant="body2" sx={{ mb: 0.5, color: '#fff', fontSize: isMobile ? '14px' : '13px' }}>
          {item}
        </Typography>
      ))}
    </Box>
  );

  return (
    <Box>
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
        {isEditing ? (
          // EDITING MODE
          <>
            {customSection.type === 'text' && renderTextEditor()}
            {customSection.type === 'list' && renderListEditor()}
            {customSection.type === 'simple_list' && renderSimpleListEditor()}
          </>
        ) : (
          // VIEW MODE
          <>
            {customSection.type === 'text' && renderTextView()}
            {customSection.type === 'list' && renderListView()}
            {customSection.type === 'simple_list' && renderSimpleListView()}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default CustomSection;
