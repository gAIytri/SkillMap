import { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, useTheme, useMediaQuery, IconButton, Button, Chip, CircularProgress, Checkbox, FormControlLabel, Card, CardContent } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { colorPalette } from '../../styles/theme';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Experience Card Component
const SortableExperienceCard = ({ exp, idx, isMobile, showDragHandle = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `exp-${idx}`, disabled: !showDragHandle });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        bgcolor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Title row with drag handle on the right */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ fontSize: isMobile ? '15px' : '14px', color: '#fff', flex: 1 }}>
            {exp.title} at {exp.company}
          </Typography>
          {/* Drag Handle - only show for current version */}
          {showDragHandle && (
            <IconButton
              {...attributes}
              {...listeners}
              size="small"
              sx={{
                cursor: 'grab',
                color: colorPalette.secondary.mediumGreen,
                ml: 1,
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        {/* Rest of the content */}
        <Typography variant="caption" sx={{ fontSize: isMobile ? '13px' : '12px', color: colorPalette.secondary.mediumGreen, display: 'block' }}>
          {exp.start_date}{exp.end_date ? ` - ${exp.end_date}` : ''}
          {exp.location && ` | ${exp.location}`}
        </Typography>
        {exp.bullets && exp.bullets.length > 0 && (
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {exp.bullets.map((bullet, bidx) => (
              <li key={bidx} style={{ fontSize: isMobile ? '13px' : '12px', color: '#fff', marginBottom: '6px', textAlign: 'justify' }}>
                {bullet}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const ExperienceSection = ({
  sectionKey,
  data,
  isEditing,
  tempData,
  updateTempField,
  versionHistory,      // NEW: { "0": data, "1": data, ... }
  currentVersion,      // NEW: version number (e.g., 0, 1, 2)
  onRestoreVersion,    // NEW: (versionNumber) => void
  onViewingVersionChange,  // NEW: callback to notify parent of version change
  restoringVersion = false,  // NEW: loading state for version restoration
  onReorder,            // NEW: callback when items are reordered
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Track which version is being viewed (always a number)
  const [viewingVersion, setViewingVersion] = useState(currentVersion);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering
  const handleDragEnd = (event) => {
    const { active, over } = event;

    // Only allow reordering for current version
    if (viewingVersion !== currentVersion) {
      return;
    }

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.split('-')[1]);
      const newIndex = parseInt(over.id.split('-')[1]);

      // Use data (which is the current version data)
      const newData = arrayMove(data, oldIndex, newIndex);

      // Call onReorder callback to update parent and mark as edited
      if (onReorder) {
        onReorder(newData);
      }
    }
  };

  // Auto-switch to latest version when currentVersion updates (after tailoring)
  useEffect(() => {
    setViewingVersion(currentVersion);
    if (onViewingVersionChange) {
      onViewingVersionChange(currentVersion);
    }
  }, [currentVersion]); // FIXED: Removed onViewingVersionChange from deps to prevent infinite loop

  // Listen for external version changes (e.g., when switching to edit mode)
  useEffect(() => {
    // This effect runs when isEditing becomes true
    if (isEditing && viewingVersion !== currentVersion) {
      setViewingVersion(currentVersion);
      if (onViewingVersionChange) {
        onViewingVersionChange(currentVersion);
      }
    }
  }, [isEditing]); // Switch to current version when entering edit mode

  if (!data || data.length === 0) return null;

  // Check if we have version history
  const hasHistory = versionHistory && Object.keys(versionHistory).length > 0;

  // Get all version numbers sorted (0, 1, 2, ...)
  const versionNumbers = hasHistory
    ? Object.keys(versionHistory).map(Number).sort((a, b) => a - b)
    : [];

  // Get content based on selected version
  const getDisplayContent = () => {
    if (viewingVersion === currentVersion) {
      // Viewing the current version - show data from resume_json
      return data;
    }
    // Viewing an older version - show from version_history
    return versionHistory[viewingVersion] || [];
  };

  const handleVersionClick = (versionNum) => {
    setViewingVersion(versionNum);
    if (onViewingVersionChange) {
      onViewingVersionChange(versionNum);
    }
  };

  const handleRestoreVersion = () => {
    if (viewingVersion !== currentVersion && onRestoreVersion) {
      onRestoreVersion(viewingVersion);
      // Stay on the same tab after restoration
    }
  };

  // Show version tabs only if we have multiple versions (more than just V0)
  const showVersionTabs = hasHistory && versionNumbers.length > 1;

  // If no version tabs needed, show simple view
  if (!showVersionTabs) {
    return (
      <Box>
          <Paper elevation={0} sx={{ p: isMobile ? 1 : 2, mb: 2, bgcolor: colorPalette.primary.darkGreen, color: '#fff' }}>
            {isEditing ? (
              // EDITING MODE
              <>
                {tempData.map((exp, idx) => (
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
                    {/* Delete button - positioned at top right */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
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

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 2 }}>
                      <TextField
                        label="Job Title"
                        value={exp.title || ''}
                        onChange={(e) => updateTempField(idx, 'title', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Company"
                        value={exp.company || ''}
                        onChange={(e) => updateTempField(idx, 'company', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row' }}>
                        <TextField
                          label="Start Date"
                          value={exp.start_date || ''}
                          onChange={(e) => updateTempField(idx, 'start_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                        <TextField
                          label="End Date"
                          value={exp.currently_working ? 'Present' : (exp.end_date || '')}
                          onChange={(e) => updateTempField(idx, 'end_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          disabled={exp.currently_working}
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{
                            '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                            '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
                            '& .Mui-disabled': { color: '#fff !important', WebkitTextFillColor: '#fff !important' }
                          }}
                        />
                      </Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={exp.currently_working || false}
                            onChange={(e) => {
                              updateTempField(idx, 'currently_working', e.target.checked);
                              if (e.target.checked) {
                                updateTempField(idx, 'end_date', '');
                              }
                            }}
                            sx={{
                              color: colorPalette.secondary.mediumGreen,
                              '&.Mui-checked': {
                                color: '#fff',
                              },
                            }}
                          />
                        }
                        label="Currently working here"
                        slotProps={{
                          typography: {
                            sx: { color: '#fff !important' }
                          }
                        }}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Location"
                        value={exp.location || ''}
                        onChange={(e) => updateTempField(idx, 'location', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      {/* Bullet Points - Individual Inputs */}
                      <Box width={'100%'}>
                        <Typography variant="caption" sx={{ color: colorPalette.secondary.mediumGreen, mb: 1, display: 'block' }}>
                          Responsibilities / Achievements (Bullet Points)
                        </Typography>
                        {(() => {
                          const bullets = exp.bullets && exp.bullets.length > 0 ? exp.bullets : [''];
                          const bulletsCount = bullets.length;

                          return bullets.map((bullet, bulletIdx) => (
                            <Box key={bulletIdx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                              <TextField
                                value={bullet}
                                onChange={(e) => {
                                  const newBullets = [...(exp.bullets || [''])];
                                  newBullets[bulletIdx] = e.target.value;
                                  updateTempField(idx, 'bullets', newBullets);
                                }}
                                multiline
                                rows={3}
                                placeholder={`Bullet point ${bulletIdx + 1}`}
                                variant="standard"
                                slotProps={{
                                  input: {
                                    style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' }
                                  }
                                }}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  maxWidth: '100%',
                                  '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                                  '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
                                }}
                              />
                              {/* Only show delete button if there's more than one bullet point */}
                              {bulletsCount > 1 && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newBullets = [...(exp.bullets || [''])];
                                    newBullets.splice(bulletIdx, 1);
                                    updateTempField(idx, 'bullets', newBullets.length > 0 ? newBullets : ['']);
                                  }}
                                  sx={{ color: '#e74c3c', mt: 0.5, flexShrink: 0, ml: 0 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          ));
                        })()}
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => {
                            const newBullets = [...(exp.bullets || ['']), ''];
                            updateTempField(idx, 'bullets', newBullets);
                          }}
                          size="small"
                          sx={{ color: colorPalette.secondary.mediumGreen, textTransform: 'none', fontSize: '12px' }}
                        >
                          Add Bullet Point
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, { title: '', company: '', bullets: [], start_date: '', end_date: '', location: '' }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Experience
                </Button>
              </>
            ) : (
              // VIEW MODE - Cards with drag-and-drop (always show drag handles in simple view)
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={data.map((_, idx) => `exp-${idx}`)}
                  strategy={verticalListSortingStrategy}
                >
                  {data.map((exp, idx) => (
                    <SortableExperienceCard key={`exp-${idx}`} exp={exp} idx={idx} isMobile={isMobile} showDragHandle={true} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </Paper>
      </Box>
    );
  }

  // With history - show horizontal tabs at top + content below
  const displayData = getDisplayContent();

  return (
    <Box>
      {/* Info Label */}
      <Box >
<Typography variant="caption" sx={{ fontSize: '10px', color: '#111111', fontWeight:'bold'}}>
          Click version number to view. Use " Make This Current " to restore.
        </Typography>
      </Box>

      {/* Horizontal Version Tabs */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 1,
          p: 0.5,
          bgcolor: colorPalette.primary.darkGreen,
          borderRadius: '4px',
          flexWrap: 'wrap',
        }}
      >
        {/* All version chips - only show versions from version_history */}
        {versionNumbers.map((versionNum) => {
          const isSelected = viewingVersion === versionNum;
          const isCurrent = currentVersion === versionNum;

          return (
            <Chip
              key={`v${versionNum}`}
              label={`V${versionNum}`}
              onClick={() => handleVersionClick(versionNum)}
              sx={{
                bgcolor: isSelected ? '#fff' : colorPalette.primary.black,
                color: isSelected ? '#000' : '#fff',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.75rem',
                height: '28px',
                minWidth: '40px',
                cursor: 'pointer',
                // Green border if this version is current
                border: isCurrent ? `2px solid ${colorPalette.primary.brightGreen}` : 'none',
                '&:hover': {
                  bgcolor: isSelected ? '#fff' : colorPalette.secondary.mediumGreen,
                  color: isSelected ? '#000' : '#fff',
                },
              }}
            />
          );
        })}
      </Box>

      {/* Content Area - Full Width */}
      <Paper elevation={0} sx={{ p: isMobile ? 2 : 3, bgcolor: colorPalette.primary.darkGreen, color: '#fff', position: 'relative' }}>
            {isEditing && viewingVersion === currentVersion ? (
              // EDITING MODE
              <>
                {tempData.map((exp, idx) => (
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
                    {/* Delete button - positioned at top right */}
                    <IconButton
                      size="small"
                      onClick={() => {
                        const newData = [...tempData];
                        newData.splice(idx, 1);
                        updateTempField(null, null, newData);
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

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 2 }}>
                      <TextField
                        label="Job Title"
                        value={exp.title || ''}
                        onChange={(e) => updateTempField(idx, 'title', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <TextField
                        label="Company"
                        value={exp.company || ''}
                        onChange={(e) => updateTempField(idx, 'company', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isMobile ? 'column' : 'row' }}>
                        <TextField
                          label="Start Date"
                          value={exp.start_date || ''}
                          onChange={(e) => updateTempField(idx, 'start_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                        />
                        <TextField
                          label="End Date"
                          value={exp.currently_working ? 'Present' : (exp.end_date || '')}
                          onChange={(e) => updateTempField(idx, 'end_date', e.target.value)}
                          fullWidth
                          variant="standard"
                          disabled={exp.currently_working}
                          InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                          InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                          sx={{
                            '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                            '& .MuiInput-underline:after': { borderBottomColor: '#fff' },
                            '& .Mui-disabled': { color: '#fff !important', WebkitTextFillColor: '#fff !important' }
                          }}
                        />
                      </Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={exp.currently_working || false}
                            onChange={(e) => {
                              updateTempField(idx, 'currently_working', e.target.checked);
                              if (e.target.checked) {
                                updateTempField(idx, 'end_date', '');
                              }
                            }}
                            sx={{
                              color: colorPalette.secondary.mediumGreen,
                              '&.Mui-checked': {
                                color: '#fff',
                              },
                            }}
                          />
                        }
                        label="Currently working here"
                        slotProps={{
                          typography: {
                            sx: { color: '#fff !important' }
                          }
                        }}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Location"
                        value={exp.location || ''}
                        onChange={(e) => updateTempField(idx, 'location', e.target.value)}
                        fullWidth
                        variant="standard"
                        InputLabelProps={{ style: { color: colorPalette.secondary.mediumGreen } }}
                        InputProps={{ style: { color: '#fff', fontSize: isMobile ? '15px' : '14px' } }}
                        sx={{ '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen }, '& .MuiInput-underline:after': { borderBottomColor: '#fff' } }}
                      />
                      {/* Bullet Points - Individual Inputs */}
                   <Box width={'100%'}>
                        <Typography variant="caption" sx={{ color: colorPalette.secondary.mediumGreen, mb: 1, display: 'block' }}>
                          Responsibilities / Achievements (Bullet Points)
                        </Typography>
                        {(() => {
                          const bullets = exp.bullets && exp.bullets.length > 0 ? exp.bullets : [''];
                          const bulletsCount = bullets.length;

                          return bullets.map((bullet, bulletIdx) => (
                            <Box key={bulletIdx} sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'flex-start' }}>
                              <TextField
                                value={bullet}
                                onChange={(e) => {
                                  const newBullets = [...(exp.bullets || [''])];
                                  newBullets[bulletIdx] = e.target.value;
                                  updateTempField(idx, 'bullets', newBullets);
                                }}
                                multiline
                                rows={3}
                                placeholder={`Bullet point ${bulletIdx + 1}`}
                                variant="standard"
                                slotProps={{
                                  input: {
                                    style: { color: '#fff', fontSize: isMobile ? '14px' : '13px' }
                                  }
                                }}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  maxWidth: '100%',
                                  '& .MuiInput-underline:before': { borderBottomColor: colorPalette.secondary.mediumGreen },
                                  '& .MuiInput-underline:after': { borderBottomColor: '#fff' }
                                }}
                              />
                              {/* Only show delete button if there's more than one bullet point */}
                              {bulletsCount > 1 && (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const newBullets = [...(exp.bullets || [''])];
                                    newBullets.splice(bulletIdx, 1);
                                    updateTempField(idx, 'bullets', newBullets.length > 0 ? newBullets : ['']);
                                  }}
                                  sx={{ color: '#e74c3c', mt: 0.5, flexShrink: 0, ml: 0 }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          ));
                        })()}
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => {
                            const newBullets = [...(exp.bullets || ['']), ''];
                            updateTempField(idx, 'bullets', newBullets);
                          }}
                          size="small"
                          sx={{ color: colorPalette.secondary.mediumGreen, textTransform: 'none', fontSize: '12px' }}
                        >
                          Add Bullet Point
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const newData = [...tempData, { title: '', company: '', bullets: [], start_date: '', end_date: '', location: '' }];
                    updateTempField(null, null, newData);
                  }}
                  sx={{ color: '#fff', textTransform: 'none', mt: 2 }}
                >
                  Add Experience
                </Button>
              </>
            ) : (
              // VIEW MODE - Always show cards, but drag handles only for current version
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={displayData.map((_, idx) => `exp-${idx}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayData.map((exp, idx) => (
                      <SortableExperienceCard
                        key={`exp-${idx}`}
                        exp={exp}
                        idx={idx}
                        isMobile={isMobile}
                        showDragHandle={viewingVersion === currentVersion}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                {/* Restore Version Button - Show ONLY when viewing a version that is NOT current */}
                {viewingVersion !== currentVersion && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleRestoreVersion}
                      disabled={restoringVersion}
                      startIcon={restoringVersion ? <CircularProgress size={16} sx={{ color: '#000' }} /> : null}
                      sx={{
                        bgcolor: colorPalette.primary.brightGreen,
                        color: '#000',
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': { bgcolor: colorPalette.secondary.mediumGreen },
                        '&:disabled': { bgcolor: colorPalette.secondary.mediumGreen, color: '#000' }
                      }}
                    >
                      {restoringVersion ? 'Restoring...' : 'Make This Current'}
                    </Button>
                  </Box>
                )}
              </>
            )}
      </Paper>
    </Box>
  );
};

export default ExperienceSection;
