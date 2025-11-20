import { Box, IconButton, useTheme, useMediaQuery } from '@mui/material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { colorPalette } from '../../styles/theme';

const SortableSection = ({ id, children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{ position: 'relative', mb: 1 }}>
      {/* Drag Handle */}
      <IconButton
        {...attributes}
        {...listeners}
        size="small"
        sx={{
          position: 'absolute',
          left: -8,
          top: 8,
          zIndex: 10,
          cursor: 'grab',
          touchAction: 'none', // Prevent scroll conflict on touch devices
          color: colorPalette.primary.darkGreen,
          '&:active': {
            cursor: 'grabbing',
          },
          '&:hover': {
            bgcolor: 'rgba(76, 175, 80, 0.1)',
          },
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </IconButton>
      {children}
    </Box>
  );
};

export default SortableSection;
