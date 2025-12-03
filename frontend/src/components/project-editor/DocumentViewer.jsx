import { Box, Button, Typography, Paper, IconButton, Tabs, Tab, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import { colorPalette } from '../../styles/theme';

const DocumentViewer = ({
  isMobile,
  documentTab,
  onDocumentTabChange,
  onLeftMenuClick,
  onRightMenuClick,
  pdfZoom,
  onZoomIn,
  onZoomOut,
  pendingChanges,
  compiling,
  onCompile,
  pdfLoading,
  reorderingPdf,
  pdfUrl,
  onLoadPdfPreview,
  iframeRef,
  coverLetter,
  email,
  project,
  tailoring, // NEW: To show loading spinner during tailoring (Resume tab only)
  generatingCoverLetter, // NEW: Separate loading for cover letter
  generatingEmail, // NEW: Separate loading for email
}) => {
  return (
    <Box
      sx={{
        flex: 1,
        borderRight: isMobile ? 'none' : '2px solid #e1e8ed',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: '#ffffff',
      }}
    >
      {/* Document Tabs: Mobile Only (Desktop uses sidebar) */}
      {isMobile && (
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Menu icon for actions drawer */}
          <IconButton
            onClick={onLeftMenuClick}
            sx={{
              ml: 1,
              color: colorPalette.primary.darkGreen,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Center: Document tabs */}
          <Tabs
            value={documentTab}
            onChange={(_e, newValue) => onDocumentTabChange(newValue)}
            sx={{
              minHeight: '40px',
              flex: 1,
              '& .MuiTab-root': {
                minHeight: '40px',
                minWidth: 'auto',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.7rem',
                px: 0.5,
                py: 0.5,
              },
              '& .MuiTab-iconWrapper': {
                fontSize: '16px',
                marginRight: '4px',
              },
            }}
          >
            <Tab icon={<DescriptionIcon fontSize="small" />} iconPosition="start" label="Resume" />
            <Tab icon={<EmailIcon fontSize="small" />} iconPosition="start" label="Cover Letter" />
            <Tab icon={<SendIcon fontSize="small" />} iconPosition="start" label="Email" />
          </Tabs>

          {/* Right: Menu icon for extracted data drawer */}
          <IconButton
            onClick={onRightMenuClick}
            sx={{
              mr: 1,
              color: colorPalette.primary.darkGreen,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      )}

      {/* Zoom Controls (only for Resume tab) */}
      {documentTab === 0 && (
        <Box
          sx={{
            px: isMobile ? 1 : 2,
            py: isMobile ? 0.3 : 0.5,
            bgcolor: 'rgba(76, 175, 80, 0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {/* Left: PDF Preview Label */}
          {!isMobile && (
            <Typography variant="subtitle2" fontWeight={700} color="colorPalette.primary.darkGreen">
              PDF Preview
            </Typography>
          )}

          {/* Right: Zoom Controls + Compile Button */}
          <Box display="flex" alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={onZoomOut}
              disabled={pdfZoom <= 60}
              sx={{
                color: 'colorPalette.primary.darkGreen',
                borderColor: 'transparent',
                textTransform: 'none',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                fontWeight: 'bold',
                minWidth: isMobile ? '24px' : '30px',
                px: 0,
                py: 0,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: colorPalette.primary.darkGreen,
                },
              }}
            >
              -
            </Button>
            <Typography variant="caption" sx={{ minWidth: isMobile ? '40px' : '50px', textAlign: 'center', color: 'colorPalette.primary.darkGreen', fontSize: isMobile ? '0.7rem' : '0.8rem', fontWeight: 600 }}>
              {pdfZoom}%
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={onZoomIn}
              disabled={pdfZoom >= 200}
              sx={{
                color: 'colorPalette.primary.darkGreen',
                borderColor: 'transparent',
                textTransform: 'none',
                fontSize: isMobile ? '0.75rem' : '0.85rem',
                fontWeight: 'bold',
                minWidth: isMobile ? '24px' : '30px',
                px: 0,
                py: 0,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: colorPalette.primary.darkGreen,
                },
              }}
            >
              +
            </Button>

            {/* Compile Button */}
            <Button
              variant="contained"
              size="small"
              onClick={onCompile}
              disabled={!pendingChanges || compiling}
              startIcon={compiling ? <CircularProgress size={14} sx={{ color: '#ffffff' }} /> : null}
              sx={{
                ml: isMobile ? 1 : 2,
                bgcolor: pendingChanges ? colorPalette.primary.brightGreen : '#cccccc',
                color: '#ffffff',
                textTransform: 'none',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: 600,
                px: isMobile ? 1.5 : 2,
                py: isMobile ? 0.4 : 0.5,
                '&:hover': {
                  bgcolor: pendingChanges ? '#1a8050' : '#cccccc',
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#999999',
                },
              }}
            >
              {compiling ? 'Compiling...' : pendingChanges ? 'Compile' : 'Compiled'}
            </Button>
          </Box>
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          bgcolor: '#f5f7fa',
          overflow: 'auto',
          p: 0.5,
        }}
      >
        {/* Resume Tab */}
        {documentTab === 0 && (
          <>
            {pdfLoading || reorderingPdf ? (
              <Box textAlign="center" sx={{ alignSelf: 'center' }}>
                <CircularProgress sx={{ color: colorPalette.primary.darkGreen }} />
                <Typography variant="body2" color="text.secondary" mt={2}>
                  {reorderingPdf ? 'Reordering sections...' : 'Generating PDF preview...'}
                </Typography>
              </Box>
            ) : pdfUrl ? (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'auto',
                  bgcolor: 'colorPalette.secondary.lightGreen',
                }}
              >
                <Box
                  sx={{
                    transform: `scale(${pdfZoom / 100})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease-in-out',
                    width: `${100 / (pdfZoom / 100)}%`,
                    height: `${100 / (pdfZoom / 100)}%`,
                  }}
                >
                  <iframe
                    ref={iframeRef}
                    src={`${pdfUrl}#toolbar=0&navpanes=0`}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      backgroundColor: '#FFF',
                    }}
                    title="Resume PDF Preview"
                  />
                </Box>
              </Box>
            ) : (
              <Paper elevation={3} sx={{ p: 4, maxWidth: '400px', textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  Failed to load PDF preview
                </Typography>
                <Button variant="outlined" onClick={onLoadPdfPreview} sx={{ mt: 2 }}>
                  Retry
                </Button>
              </Paper>
            )}
          </>
        )}

        {/* Cover Letter Tab */}
        {documentTab === 1 && (
          <Box sx={{ width: '100%', height: '100%', p: 1, overflow: 'auto' }}>
            {generatingCoverLetter ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress sx={{ color: colorPalette.primary.darkGreen, mb: 2 }} />
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  Generating cover letter...
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                  This will take a few seconds
                </Typography>
              </Box>
            ) : coverLetter ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={600} color="colorPalette.primary.darkGreen">
                    Cover Letter
                  </Typography>
                  <Button
                    startIcon={<ContentCopyIcon />}
                    size="small"
                    onClick={() => {
                      // Build full cover letter with header for copying
                      const personalInfo = project?.resume_json?.personal_info || {};
                      let headerText = '';
                      if (personalInfo.name) headerText += personalInfo.name + '\n';
                      if (personalInfo.location) headerText += personalInfo.location + '\n';
                      if (personalInfo.email) headerText += personalInfo.email + '\n';
                      if (personalInfo.phone) headerText += personalInfo.phone + '\n';

                      // Add links
                      const links = personalInfo.header_links || [];
                      for (let i = 0; i < links.length; i += 2) {
                        const linksInRow = links.slice(i, i + 2);
                        const linkTexts = linksInRow.map(link => `${link.text}: ${link.url}`).join(' | ');
                        headerText += linkTexts + '\n';
                      }

                      const fullText = headerText + '\n' + coverLetter;
                      navigator.clipboard.writeText(fullText);
                      toast.success('Cover letter copied to clipboard!');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy Cover Letter
                  </Button>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: '#fff',
                    border: '1px solid colorPalette.secondary.lightGreen',
                    fontFamily: 'Calibri, sans-serif',
                    fontSize: '14px',
                    lineHeight: 1.6,
                    mt: 2,
                  }}
                >
                  {/* Personal Info Header - Generated from resume_json */}
                  {project?.resume_json?.personal_info && (
                    <Box sx={{ mb: 2 }}>
                      {/* Name */}
                      {project.resume_json.personal_info.name && (
                        <Typography sx={{ fontFamily: 'Calibri, sans-serif', fontSize: '14px', lineHeight: 1.6 }}>
                          {project.resume_json.personal_info.name}
                        </Typography>
                      )}

                      {/* Location */}
                      {project.resume_json.personal_info.location && (
                        <Typography sx={{ fontFamily: 'Calibri, sans-serif', fontSize: '14px', lineHeight: 1.6 }}>
                          {project.resume_json.personal_info.location}
                        </Typography>
                      )}

                      {/* Email */}
                      {project.resume_json.personal_info.email && (
                        <Typography sx={{ fontFamily: 'Calibri, sans-serif', fontSize: '14px', lineHeight: 1.6 }}>
                          {project.resume_json.personal_info.email}
                        </Typography>
                      )}

                      {/* Phone */}
                      {project.resume_json.personal_info.phone && (
                        <Typography sx={{ fontFamily: 'Calibri, sans-serif', fontSize: '14px', lineHeight: 1.6 }}>
                          {project.resume_json.personal_info.phone}
                        </Typography>
                      )}

                      {/* Links (2 per row) */}
                      {project.resume_json.personal_info.header_links && project.resume_json.personal_info.header_links.length > 0 && (
                        <>
                          {(() => {
                            const links = project.resume_json.personal_info.header_links;
                            const rows = [];
                            for (let i = 0; i < links.length; i += 2) {
                              const linksInRow = links.slice(i, i + 2);
                              rows.push(
                                <Typography key={i} sx={{ fontFamily: 'Calibri, sans-serif', fontSize: '14px', lineHeight: 1.6 }}>
                                  {linksInRow.map((link, idx) => (
                                    <span key={idx}>
                                      {idx > 0 && ' | '}
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#000', textDecoration: 'none' }}
                                      >
                                        {link.text}
                                      </a>
                                    </span>
                                  ))}
                                </Typography>
                              );
                            }
                            return rows;
                          })()}
                        </>
                      )}
                    </Box>
                  )}

                  {/* Cover Letter Body */}
                  <Box sx={{ whiteSpace: 'pre-wrap' }}>
                    {coverLetter}
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666',
                }}
              >
                <EmailIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Click "Tailor Resume" to generate cover letter
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                  A professional cover letter will be created alongside your tailored resume
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Email Tab */}
        {documentTab === 2 && (
          <Box sx={{ width: '100%', height: '100%', p: 1, overflow: 'auto' }}>
            {generatingEmail ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <CircularProgress sx={{ color: colorPalette.primary.darkGreen, mb: 2 }} />
                <Typography variant="body1" color="text.secondary" textAlign="center">
                  Generating recruiter email...
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                  This will take a few seconds
                </Typography>
              </Box>
            ) : email ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={600} color="colorPalette.primary.darkGreen">
                    Recruiter Email
                  </Typography>
                  <Button
                    startIcon={<ContentCopyIcon />}
                    size="small"
                    onClick={() => {
                      const emailText = `Subject: ${email.subject}\n\n${email.body}`;
                      navigator.clipboard.writeText(emailText);
                      toast.success('Email copied to clipboard!');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy Email
                  </Button>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    bgcolor: '#fff',
                    border: '1px solid colorPalette.secondary.lightGreen',
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>
                    SUBJECT:
                  </Typography>
                  <Typography variant="body1" fontWeight={600} mb={3} sx={{ color: 'colorPalette.primary.darkGreen' }}>
                    {email.subject}
                  </Typography>
                  <Box
                    sx={{
                      borderTop: '1px solid colorPalette.secondary.lightGreen',
                      pt: 3,
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>
                      BODY:
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'Calibri, sans-serif',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: '#333',
                      }}
                    >
                      {email.body}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: '#666',
                }}
              >
                <SendIcon sx={{ fontSize: 48, color: '#bbb', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" textAlign="center">
                  Click "Tailor Resume" to generate email
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center" mt={1}>
                  A professional recruiter email will be created alongside your tailored resume
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DocumentViewer;
