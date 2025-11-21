import { useState } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Paper,
} from '@mui/material';
import { colorPalette } from '../../styles/theme';

const DateRangeSelector = ({ onRangeChange }) => {
  const [selectedPreset, setSelectedPreset] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handlePresetChange = (event, newPreset) => {
    if (newPreset !== null) {
      setSelectedPreset(newPreset);

      // Call callback with preset
      if (newPreset === 'custom') {
        // Don't call callback yet, wait for custom dates
        return;
      }

      onRangeChange({ preset: newPreset });
    }
  };

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      onRangeChange({
        start_date: customStart,
        end_date: customEnd,
      });
    }
  };

  return (
    <Paper elevation={2} sx={{ p: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 3 } }}>
      <Box display="flex" flexWrap="wrap" gap={{ xs: 1, md: 2 }} alignItems="center">
        <ToggleButtonGroup
          value={selectedPreset}
          exclusive
          onChange={handlePresetChange}
          aria-label="date range"
          size="small"
          sx={{ flexWrap: 'wrap' }}
        >
          <ToggleButton
            value="7d"
            sx={{
              fontSize: { xs: '0.7rem', md: '0.875rem' },
              py: { xs: 0.5, md: 1 },
              px: { xs: 1, md: 1.5 },
              '&.Mui-selected': {
                bgcolor: colorPalette.primary.brightGreen,
                color: 'white',
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
              },
            }}
          >
            Last 7 Days
          </ToggleButton>
          <ToggleButton
            value="30d"
            sx={{
              fontSize: { xs: '0.7rem', md: '0.875rem' },
              py: { xs: 0.5, md: 1 },
              px: { xs: 1, md: 1.5 },
              '&.Mui-selected': {
                bgcolor: colorPalette.primary.brightGreen,
                color: 'white',
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
              },
            }}
          >
            Last 30 Days
          </ToggleButton>
          <ToggleButton
            value="90d"
            sx={{
              fontSize: { xs: '0.7rem', md: '0.875rem' },
              py: { xs: 0.5, md: 1 },
              px: { xs: 1, md: 1.5 },
              '&.Mui-selected': {
                bgcolor: colorPalette.primary.brightGreen,
                color: 'white',
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
              },
            }}
          >
            Last 90 Days
          </ToggleButton>
          <ToggleButton
            value="custom"
            sx={{
              fontSize: { xs: '0.7rem', md: '0.875rem' },
              py: { xs: 0.5, md: 1 },
              px: { xs: 1, md: 1.5 },
              '&.Mui-selected': {
                bgcolor: colorPalette.primary.brightGreen,
                color: 'white',
                '&:hover': {
                  bgcolor: colorPalette.secondary.mediumGreen,
                },
              },
            }}
          >
            Custom Range
          </ToggleButton>
        </ToggleButtonGroup>

        {selectedPreset === 'custom' && (
          <Box display="flex" gap={{ xs: 1, md: 2 }} alignItems="center" flexWrap="wrap">
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                if (e.target.value && customEnd) {
                  handleCustomDateChange();
                }
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                }
              }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                if (customStart && e.target.value) {
                  onRangeChange({
                    start_date: customStart,
                    end_date: e.target.value,
                  });
                }
              }}
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                },
                '& .MuiInputLabel-root': {
                  fontSize: { xs: '0.75rem', md: '0.875rem' }
                }
              }}
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default DateRangeSelector;
