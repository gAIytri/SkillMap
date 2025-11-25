import { Box, Button, Typography, TextField, Drawer, IconButton, Chip, useTheme, useMediaQuery } from '@mui/material';
import { useState } from 'react';
import { colorPalette } from '../../styles/theme';
import SendIcon from '@mui/icons-material/Send';
import RefreshIcon from '@mui/icons-material/Refresh';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';

const JobDescriptionDrawer = ({
  open,
  onClose,
  jobDescription,
  onJobDescriptionChange,
  tailoring,
  extractedData,
  onTailorResume,
  messageHistory, // Array of message entries from project
}) => {
  const [inputValue, setInputValue] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // < 900px

  const handleSend = () => {
    if (!inputValue.trim() || tailoring || !extractedData) return;

    // Update the job description state
    onJobDescriptionChange(inputValue);

    // Trigger tailoring with the input value directly (to avoid async state update delay)
    onTailorResume(inputValue);

    // Clear input and close drawer
    setInputValue('');
    onClose();
  };

  const handleReuseMessage = (text) => {
    setInputValue(text);
  };

  // Sort messages by timestamp (newest first)
  const sortedMessages = messageHistory
    ? [...messageHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    : [];
  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '400px' : '450px',
          maxWidth: '100vw',
          boxSizing: 'border-box',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          bgcolor: '#f9fafb',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: isMobile ? 2 : 3,
            py: isMobile ? 2 : 2.5,
            borderBottom: '2px solid',
            borderColor: colorPalette.primary.darkGreen,
            bgcolor: '#ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <Box flex={1} sx={{ minWidth: 0, pr: 1 }}>
            <Typography variant="h6" fontWeight={700} color={colorPalette.primary.darkGreen} gutterBottom>
              Tailor / Edit Resume
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '12px' }}>
              View previous requests or enter new job description/edit instructions
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: colorPalette.primary.darkGreen,
              flexShrink: 0,
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Chat Messages Area */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            p: isMobile ? 1.5 : 2,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 1.5 : 2,
          }}
        >
          {sortedMessages.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
                textAlign: 'center',
                px: 3,
              }}
            >
              <DescriptionIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No previous tailoring history
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Enter a job description or edit instructions below to get started
              </Typography>
            </Box>
          ) : (
            sortedMessages.map((message, index) => {
              const isEdit = message.text?.length < 200 || message.type === 'edit';
              const timestamp = new Date(message.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Box
                  key={index}
                  sx={{
                    bgcolor: '#ffffff',
                    borderRadius: '12px',
                    p: isMobile ? 1.5 : 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      borderColor: colorPalette.primary.darkGreen,
                    },
                  }}
                >
                  {/* Header with icon and timestamp */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1} gap={1}>
                    <Box display="flex" alignItems="center" gap={1} minWidth={0} flexShrink={1}>
                      {isEdit ? (
                        <EditIcon sx={{ fontSize: 16, color: colorPalette.secondary.mediumGreen, flexShrink: 0 }} />
                      ) : (
                        <DescriptionIcon sx={{ fontSize: 16, color: colorPalette.primary.brightGreen, flexShrink: 0 }} />
                      )}
                      <Chip
                        label={isEdit ? 'Edit' : 'Job Description'}
                        size="small"
                        sx={{
                          fontSize: '10px',
                          height: '20px',
                          bgcolor: isEdit ? 'rgba(41, 183, 112, 0.1)' : 'rgba(7, 45, 31, 0.1)',
                          color: isEdit ? colorPalette.secondary.mediumGreen : colorPalette.primary.darkGreen,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: '11px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {timestamp}
                    </Typography>
                  </Box>

                  {/* Message text */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '13px',
                      lineHeight: 1.5,
                      color: '#333',
                      mb: 1.5,
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      width: '100%',
                    }}
                  >
                    {message.text}
                  </Typography>

                  {/* Re-use button */}
                  <Button
                    size="small"
                    startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
                    onClick={() => handleReuseMessage(message.text)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '12px',
                      color: colorPalette.primary.darkGreen,
                      '&:hover': {
                        bgcolor: 'rgba(7, 45, 31, 0.05)',
                      },
                    }}
                  >
                    Re-use this
                  </Button>
                </Box>
              );
            })
          )}
        </Box>

        {/* Input Area - Chat Style */}
        <Box
          sx={{
            p: isMobile ? 1.5 : 2,
            borderTop: '1px solid #e5e7eb',
            bgcolor: '#ffffff',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <Box display="flex" gap={1} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste job description or edit instructions..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '14px',
                  bgcolor: '#f9fafb',
                  borderRadius: '12px',
                },
                '& fieldset': {
                  borderColor: '#d1d9e0',
                },
                '& .MuiInputBase-root:hover fieldset': {
                  borderColor: colorPalette.primary.darkGreen,
                },
                '& .MuiInputBase-root.Mui-focused fieldset': {
                  borderColor: colorPalette.primary.darkGreen,
                  borderWidth: '2px',
                },
              }}
            />
            <IconButton
              onClick={handleSend}
              disabled={!inputValue.trim() || tailoring || !extractedData}
              sx={{
                bgcolor: colorPalette.primary.darkGreen,
                color: '#ffffff',
                width: '44px',
                height: '44px',
                '&:hover': {
                  bgcolor: '#1a8050',
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#666666',
                },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: '11px' }}>
            Press Enter to send, Shift+Enter for new line
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};

export default JobDescriptionDrawer;
