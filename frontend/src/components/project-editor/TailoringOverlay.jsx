import { Box, Typography, CircularProgress, LinearProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { colorPalette } from '../../styles/theme';

const TailoringOverlay = ({ tailoring, agentMessages, messagesEndRef }) => {
  if (!tailoring) return null;

  // Detect if we're editing or tailoring based on messages
  const isEditing = agentMessages.some(msg =>
    msg.step === 'editing' ||
    msg.tool === 'edit_resume_content' ||
    msg.message?.includes('edit') ||
    msg.data?.sections_modified
  );

  const title = isEditing ? 'Editing Resume' : 'Tailoring Resume';

  // Filter out unwanted messages
  const filteredMessages = agentMessages.filter(msg => {
    // Messages to HIDE (return false):
    // 1. "Starting process" status message
    if (msg.step === 'initialization') return false;

    // 2. "Validating input" status message
    if (msg.step === 'guardrail' || msg.step === 'validation') return false;

    // 3. Validation result tool message
    if (msg.tool === 'validate_intent') return false;

    // 4. Tailoring result tool message
    if (msg.tool === 'tailor_resume_content') return false;

    // 5. Cover letter/email messages (they happen in background after overlay closes)
    if (msg.step === 'cover_letter' || msg.step === 'email') return false;
    if (msg.tool === 'generate_cover_letter') return false;
    if (msg.tool === 'generate_recruiter_email') return false;
    if (msg.type === 'cover_letter_complete' || msg.type === 'email_complete') return false;

    // Show all other messages (status messages for main steps and complete notifications)
    return true;
  });

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Main Content Card */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: colorPalette.primary.darkGreen,
            color: 'white',
            p: 3,
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <CircularProgress size={28} sx={{ color: 'white' }} />
            <Typography variant="h5" fontWeight={700} color='white' fontFamily="Poppins, sans-serif">
              {title}
            </Typography>
          </Box>
          <LinearProgress
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#ffffff',
              },
              borderRadius: '4px',
              height: '6px',
            }}
          />
        </Box>

        {/* Messages Container */}
        <Box sx={{ p: 3, flex: 1, overflow: 'auto', minHeight: '250px', maxHeight: '500px' }}>
          {filteredMessages.length === 0 && (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress size={40} sx={{ color: colorPalette.primary.darkGreen }} />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Initializing agent...
              </Typography>
            </Box>
          )}

          {filteredMessages.map((msg, idx) => (
            <Box
              key={idx}
              sx={{
                mb: 2,
                p: 2,
                bgcolor:
                  msg.type === 'final' && msg.success
                    ? 'rgba(76, 175, 80, 0.08)'
                    : msg.type === 'final'
                    ? 'rgba(244, 67, 54, 0.08)'
                    : '#f5f5f5',
                borderRadius: '8px',
                borderLeft: '4px solid',
                borderColor:
                  msg.type === 'status'
                    ? '#2196f3'
                    : msg.type === 'tool_result'
                    ? '#4caf50'
                    : msg.type === 'final' && msg.success
                    ? '#29B770'
                    : msg.type === 'final'
                    ? '#f44336'
                    : '#ff9800',
                animation: 'fadeIn 0.3s ease-in',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(-10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                {msg.type === 'final' && msg.success && (
                  <CheckCircleIcon sx={{ color: '#29B770', fontSize: 20 }} />
                )}
                <Typography variant="caption" fontWeight={700} color="#555" textTransform="uppercase">
                  {msg.type === 'status' && `${msg.step}`}
                  {msg.type === 'tool_result' && `${msg.tool}`}
                  {msg.type === 'final' && 'Complete'}
                  {msg.type === 'db_update' && 'Database Update'}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>
                {msg.message}
              </Typography>
              {msg.data && msg.type === 'tool_result' && (
                <Box sx={{ mt: 1, ml: 1 }}>
                  {msg.data.role_focus && (
                    <Typography variant="caption" display="block" sx={{ fontSize: '12px', color: '#666' }}>
                      Role: <strong>{msg.data.role_focus}</strong>
                    </Typography>
                  )}
                  {msg.data.required_skills_count !== undefined && (
                    <Typography variant="caption" display="block" sx={{ fontSize: '12px', color: '#666' }}>
                      Skills identified: <strong>{msg.data.required_skills_count}</strong>
                    </Typography>
                  )}
                  {msg.data.sections_modified && msg.data.sections_modified.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '12px', color: '#555' }}>
                        Sections Modified:
                      </Typography>
                      {msg.data.sections_modified.map((section, sidx) => (
                        <Typography
                          key={sidx}
                          variant="caption"
                          display="block"
                          sx={{ fontSize: '11px', color: '#666', ml: 1 }}
                        >
                          • {section}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {msg.data.changes_description && (
                    <Typography variant="caption" display="block" sx={{ fontSize: '12px', color: '#666', mt: 0.5 }}>
                      {msg.data.changes_description}
                    </Typography>
                  )}
                  {msg.data.changes_made && msg.data.changes_made.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="caption" fontWeight={600} sx={{ fontSize: '12px', color: '#555' }}>
                        Changes:
                      </Typography>
                      {msg.data.changes_made.map((change, cidx) => (
                        <Typography
                          key={cidx}
                          variant="caption"
                          display="block"
                          sx={{ fontSize: '11px', color: '#666', ml: 1 }}
                        >
                          • {change}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          ))}

          {/* Show current step at the bottom if in progress */}
          {agentMessages.length > 0 && !agentMessages.some((m) => m.type === 'final') && (
            <Box display="flex" alignItems="center" gap={1} mt={2} p={2} bgcolor="#e3f2fd" borderRadius="8px">
              <CircularProgress size={20} sx={{ color: '#2196f3' }} />
              <Typography variant="body2" color="#1976d2" fontWeight={500}>
                Processing...
              </Typography>
            </Box>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </Box>
      </Box>
    </Box>
  );
};

export default TailoringOverlay;
