import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import { colorPalette } from '../styles/theme';
import projectService from '../services/projectService';
import resumeService from '../services/resumeService';

const ProjectEditor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [project, setProject] = useState(null);
  const [latexContent, setLatexContent] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null); // LLM extracted JSON
  const [downloadingRecreated, setDownloadingRecreated] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = formatted, 1 = raw JSON
  const [pdfZoom, setPdfZoom] = useState(100);
  const [tailoring, setTailoring] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]); // Agent progress messages
  const iframeRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentMessages]);

  const loadProject = async () => {
    try {
      const projectData = await projectService.getProject(projectId);
      setProject(projectData);
      setLatexContent(projectData.tailored_latex_content);
      setJobDescription(projectData.job_description || '');

      // Load project's resume JSON (not base_resume)
      if (projectData.resume_json) {
        setExtractedData(projectData.resume_json);
      }

      setLoading(false);

      // Load PDF preview
      await loadPdfPreview();
    } catch (err) {
      setError('Failed to load project. Please try again.');
      setLoading(false);
    }
  };

  const loadPdfPreview = async () => {
    try {
      setPdfLoading(true);
      const blob = await projectService.downloadProjectPDF(projectId);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfLoading(false);
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
      setPdfLoading(false);
    }
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleZoomIn = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newZoom = Math.min(pdfZoom + 15, 200);
    setPdfZoom(newZoom);
  };

  const handleZoomOut = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newZoom = Math.max(pdfZoom - 15, 60);
    setPdfZoom(newZoom);
  };


  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Step 1: Upload and convert the new resume
      const convertedData = await resumeService.uploadResume(file);

      // Step 2: Extract JSON data from metadata (LLM extraction)
      if (convertedData.metadata && convertedData.metadata.resume_json) {
        setExtractedData(convertedData.metadata.resume_json);
      }

      // Step 3: Update the project with the new LaTeX content
      await projectService.updateProject(projectId, {
        tailored_latex_content: convertedData.latex_content,
        job_description: jobDescription,
      });

      // Step 4: Update state with new content
      setLatexContent(convertedData.latex_content);

      // Step 5: Reload PDF
      await loadPdfPreview();

      alert('Resume replaced successfully!');
    } catch (err) {
      setError('Failed to upload and replace resume. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      // Save the LaTeX content and job description
      await projectService.updateProject(projectId, {
        tailored_latex_content: latexContent,
        job_description: jobDescription,
      });

      // Reload PDF
      await loadPdfPreview();

      alert('Project saved successfully!');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdfBlob = await projectService.downloadProjectPDF(projectId);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.project_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setDownloading(true);
    try {
      const docxBlob = await projectService.downloadProjectDOCX(projectId);

      // Create download link
      const url = window.URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.project_name.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download DOCX. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadRecreatedDOCX = async () => {
    setDownloadingRecreated(true);
    try {
      // Download from PROJECT endpoint (not base_resume)
      const docxBlob = await projectService.downloadProjectDOCX(projectId);

      // Create download link
      const url = window.URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project?.project_name || 'resume'}_tailored.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download DOCX. Please try again.');
    } finally {
      setDownloadingRecreated(false);
    }
  };

  const handleTailorResume = async () => {
    if (!jobDescription || jobDescription.trim().length < 10) {
      alert('Please paste a job description first (at least 10 characters).');
      return;
    }

    if (!extractedData) {
      alert('No resume found for this project. Please upload a resume first.');
      return;
    }

    setTailoring(true);
    setError('');
    setAgentMessages([]); // Clear previous messages

    try {
      // Call agent-based tailoring with streaming updates
      const finalResult = await resumeService.tailorProjectResumeWithAgent(
        projectId,
        jobDescription,
        (message) => {
          // This callback is called for each SSE message
          console.log('Agent message:', message);

          // Force immediate render for each message using flushSync
          flushSync(() => {
            setAgentMessages(prev => [...prev, message]);
          });

          // Show real-time updates in console
          if (message.type === 'status') {
            console.log(`[${message.step}] ${message.message}`);
          } else if (message.type === 'tool_result') {
            console.log(`[Tool: ${message.tool}] ${message.message}`);
          }
        }
      );

      console.log('Final result:', finalResult);

      // Handle final result
      if (finalResult && finalResult.success && finalResult.tailored_json) {
        // Update extracted data with tailored JSON
        setExtractedData(finalResult.tailored_json);

        // Reload PDF preview to show tailored version
        await loadPdfPreview();

        // Show success message with changes made
        const changes = finalResult.changes_made || [];
        let successMsg = 'Resume tailored successfully!\n\nChanges Made:\n';
        changes.forEach((change, idx) => {
          successMsg += `${idx + 1}. ${change}\n`;
        });
        alert(successMsg);
      } else {
        const errorMsg = finalResult?.message || 'Failed to tailor resume - no result';
        console.error('Tailoring failed:', finalResult);
        setError(errorMsg);
        alert(`Error: ${errorMsg}`);
      }
    } catch (err) {
      console.error('Tailoring error (full):', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);

      const errorMsg = err.message || 'Failed to tailor resume. Please try again.';
      setError(errorMsg);

      // If it's an auth error, redirect to login
      if (errorMsg.includes('authentication') || errorMsg.includes('Session expired') || errorMsg.includes('login again')) {
        alert(`${errorMsg}\n\nRedirecting to login...`);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        alert(`Error: ${errorMsg}\n\nCheck console for details.`);
      }
    } finally {
      setTailoring(false);
    }
  };


  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !project) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 64px)"
        p={4}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* Compact Professional Header */}
      <Box
        sx={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          backgroundColor:'#98C7AC',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(244,244,244,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          opacity:0.5
        }}
      >
        {/* Left: Back button and Project Info (One Line) */}
        <Box display="flex" alignItems="center" gap={1.5}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            size="small"
            sx={{
              color: '#111111',
              '&:hover': { bgcolor: 'rgba(244,244,244,0.1)' },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            sx={{
              color: '#111111',
              fontFamily: 'Poppins, sans-serif',
              mr: 2,
            }}
          >
            {project?.project_name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: '#111111',
            }}
          >
            Updated: {project && new Date(project.updated_at).toLocaleString()}
          </Typography>
        </Box>

        {/* Right: Action Buttons */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleResumeUpload}
            accept=".docx"
            style={{ display: 'none' }}
          />

          {/* Replace Resume */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="small"
            sx={{
              color: '#111111',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(17,17,17,0.1)' },
            }}
          >
            Replace
          </Button>

          {/* Download PDF */}
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading}
            size="small"
            sx={{
              color: '#111111',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(17,17,17,0.1)' },
            }}
          >
            PDF
          </Button>

          {/* Download DOCX */}
          <Button
            onClick={handleDownloadDOCX}
            disabled={downloading}
            size="small"
            sx={{
              color: '#111111',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(17,17,17,0.1)' },
            }}
          >
            DOCX
          </Button>

          {/* Save Button */}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            size="small"
            sx={{
              bgcolor: '#29B770',
              color: '#111111',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              ml: 0.5,
              px: 1.5,
              py: 0.5,
              boxShadow: 'none',
              '&:hover': {
                bgcolor: '#1a8050',
                boxShadow: '0 2px 8px rgba(41,183,112,0.3)',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {error}
        </Alert>
      )}

      {/* 3-Column Professional Layout */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', bgcolor: '#f5f7fa' }}>
        {/* Left: Job Description Panel - Fixed 300px */}
        <Box
          sx={{
            width: '300px',
            borderRight: '2px solid #101111ff',
            bgcolor: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '2px 0 4px rgba(0,0,0,0.03)',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              border: '2px solid',
              borderColor: colorPalette.primary.darkGreen,
              bgcolor: 'rgba(76, 175, 80, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#2c3e50">
              Job Description
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleTailorResume}
              disabled={tailoring || !jobDescription || !extractedData}
              sx={{
                bgcolor: colorPalette.primary.darkGreen,
                color: '#ffffff',
                textTransform: 'none',
                fontSize: '0.75rem',
                px: 1.5,
                py: 0.5,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#1a8050',
                  boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#666666',
                },
              }}
            >
              {tailoring ? 'Tailoring...' : 'Tailor'}
            </Button>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#fafbfc' }}>
            <TextField
              fullWidth
              multiline
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to reference while tailoring your resume..."
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '13px',
                  lineHeight: '1.6',
                  bgcolor: '#ffffff',
                  borderRadius: '6px',
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
              rows={15}
            />
          </Box>
        </Box>

        {/* Middle: PDF Viewer - Flex */}
        <Box
          sx={{
            flex: 1,
            borderRight: '2px solid #e1e8ed',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              border: '2px solid',
              borderColor: colorPalette.primary.darkGreen,
              bgcolor: 'rgba(76, 175, 80, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#2c3e50">
              PDF Preview
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleZoomOut}
                disabled={pdfZoom <= 60}
                sx={{
                  color: '#2c3e50',
                  borderColor: '#2c3e50',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  minWidth: '30px',
                  px: 0.5,
                  py: 0.25,
                  '&:hover': {
                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                    borderColor: colorPalette.primary.darkGreen,
                  },
                }}
              >
                -
              </Button>
              <Typography variant="caption" sx={{ minWidth: '50px', textAlign: 'center', color: '#2c3e50', fontSize: '0.8rem', fontWeight: 600 }}>
                {pdfZoom}%
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleZoomIn}
                disabled={pdfZoom >= 200}
                sx={{
                  color: '#2c3e50',
                  borderColor: '#2c3e50',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  minWidth: '30px',
                  px: 0.5,
                  py: 0.25,
                  '&:hover': {
                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                    borderColor: colorPalette.primary.darkGreen,
                  },
                }}
              >
                +
              </Button>
            </Box>
          </Box>
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
            {pdfLoading ? (
              <Box textAlign="center" sx={{ alignSelf: 'center' }}>
                <CircularProgress sx={{ color: colorPalette.primary.darkGreen }} />
                <Typography variant="body2" color="text.secondary" mt={2}>
                  Generating PDF preview...
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
                  bgcolor: '#e0e0e0',
                  p: 1,
                }}
              >
                <iframe
                  ref={iframeRef}
                  key={`pdf-${pdfZoom}`}
                  src={`${pdfUrl}#zoom=${pdfZoom}&toolbar=0&navpanes=0`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: '#FFF',
                  }}
                  title="Resume PDF Preview"
                />
              </Box>
            ) : (
              <Paper elevation={3} sx={{ p: 4, maxWidth: '400px', textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  Failed to load PDF preview
                </Typography>
                <Button variant="outlined" onClick={loadPdfPreview} sx={{ mt: 2 }}>
                  Retry
                </Button>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Right: Extracted Data with Tabs - Flex */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              border: '2px solid',
              borderColor: colorPalette.primary.darkGreen,
              bgcolor: 'rgba(76, 175, 80, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} color="#2c3e50">
              Extracted Data (LLM)
            </Typography>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadRecreatedDOCX}
              disabled={downloadingRecreated}
              sx={{
                textTransform: 'none',
                fontSize: '11px',
                color: colorPalette.primary.darkGreen,
                border: `1px solid ${colorPalette.primary.darkGreen}`,
                px: 1,
                py: 0.5,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                },
              }}
            >
              {downloadingRecreated ? 'Downloading...' : 'Test Download DOCX'}
            </Button>
          </Box>

          {/* Tabs for Formatted / Raw JSON */}
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              borderBottom: '1px solid #e0e0e0',
              minHeight: '40px',
              '& .MuiTab-root': {
                minHeight: '40px',
                textTransform: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
              },
            }}
          >
            <Tab label="Formatted View" />
            <Tab label="Raw JSON" />
          </Tabs>

          {/* Tab Content */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              bgcolor: '#fafbfc',
              p: 2,
            }}
          >
            {!extractedData ? (
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
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  No data extracted yet
                </Typography>
                <Typography variant="caption" color="text.secondary" textAlign="center" mt={1}>
                  Upload a resume to see extracted JSON data
                </Typography>
              </Box>
            ) : activeTab === 0 ? (
              /* Formatted View with Version History */
              <Box>
                {/* Helper function to format timestamp */}
                {(() => {
                  const formatTimestamp = (isoString) => {
                    if (!isoString) return 'Current';
                    const date = new Date(isoString);
                    return date.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  };

                  const history = project?.tailoring_history || [];

                  return (
                    <>
                      {/* Professional Summary Accordion */}
                      {extractedData.professional_summary && (
                        <Accordion defaultExpanded sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Typography variant="subtitle2" fontWeight={700}>
                                Professional Summary
                              </Typography>
                              {history.length > 0 && (
                                <Chip
                                  icon={<HistoryIcon />}
                                  label={`${history.length} versions`}
                                  size="small"
                                  sx={{ ml: 'auto', fontSize: '10px', height: '20px' }}
                                />
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {/* Current Version */}
                            <Paper elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Chip label="CURRENT" size="small" color="success" sx={{ fontSize: '10px', height: '18px' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {formatTimestamp(project?.updated_at)}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontSize: '12px' }}>
                                {extractedData.professional_summary}
                              </Typography>
                            </Paper>

                            {/* Previous Versions */}
                            {history.map((version, idx) => (
                              <Accordion key={idx} sx={{ mb: 0.5, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '36px', '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                                    <Typography variant="caption" fontWeight={600}>
                                      Version {idx + 1}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                      {formatTimestamp(version.timestamp)}
                                    </Typography>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ py: 1 }}>
                                  <Typography variant="body2" sx={{ fontSize: '11px', color: '#666' }}>
                                    {version.resume_json?.professional_summary || 'No summary available'}
                                  </Typography>
                                </AccordionDetails>
                              </Accordion>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {/* Experience Accordion */}
                      {extractedData.experience && extractedData.experience.length > 0 && (
                        <Accordion defaultExpanded sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Typography variant="subtitle2" fontWeight={700}>
                                Experience ({extractedData.experience.length})
                              </Typography>
                              {history.length > 0 && (
                                <Chip
                                  icon={<HistoryIcon />}
                                  label={`${history.length} versions`}
                                  size="small"
                                  sx={{ ml: 'auto', fontSize: '10px', height: '20px' }}
                                />
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {/* Current Version */}
                            <Paper elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                              <Chip label="CURRENT" size="small" color="success" sx={{ fontSize: '10px', height: '18px', mb: 1 }} />
                              {extractedData.experience.map((exp, idx) => (
                                <Box key={idx} sx={{ mb: 1.5, fontSize: '12px' }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {exp.title} at {exp.company}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {exp.start_date} - {exp.end_date}
                                    {exp.location && ` | ${exp.location}`}
                                  </Typography>
                                  {exp.bullets && exp.bullets.length > 0 && (
                                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                                      {exp.bullets.map((bullet, bidx) => (
                                        <li key={bidx} style={{ fontSize: '11px' }}>{bullet}</li>
                                      ))}
                                    </ul>
                                  )}
                                </Box>
                              ))}
                            </Paper>

                            {/* Previous Versions */}
                            {history.map((version, idx) => (
                              <Accordion key={idx} sx={{ mb: 0.5, '&:before': { display: 'none' } }}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: '36px', '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                                  <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                                    <Typography variant="caption" fontWeight={600}>
                                      Version {idx + 1}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                      {formatTimestamp(version.timestamp)}
                                    </Typography>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails sx={{ py: 1 }}>
                                  {version.resume_json?.experience?.map((exp, eidx) => (
                                    <Box key={eidx} sx={{ mb: 1, fontSize: '11px' }}>
                                      <Typography variant="caption" fontWeight={600}>
                                        {exp.title} at {exp.company}
                                      </Typography>
                                      {exp.bullets && exp.bullets.length > 0 && (
                                        <ul style={{ margin: '2px 0', paddingLeft: '18px', fontSize: '10px' }}>
                                          {exp.bullets.map((bullet, bidx) => (
                                            <li key={bidx}>{bullet}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </Box>
                                  ))}
                                </AccordionDetails>
                              </Accordion>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {/* Skills, Projects, Education (same pattern) - Collapsed for brevity */}
                      {/* You can expand these similarly */}

                      {/* Simple view for other sections without detailed history */}
                      {extractedData.education && extractedData.education.length > 0 && (
                        <Accordion sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              Education ({extractedData.education.length})
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {extractedData.education.map((edu, idx) => (
                              <Box key={idx} sx={{ mb: 1, fontSize: '12px' }}>
                                <Typography variant="body2" fontWeight={600}>{edu.degree}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {edu.institution}
                                  {edu.graduation_date && ` | ${edu.graduation_date}`}
                                  {edu.gpa && ` | GPA: ${edu.gpa}`}
                                </Typography>
                              </Box>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {extractedData.skills && extractedData.skills.length > 0 && (
                        <Accordion sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={700}>Skills</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            {extractedData.skills.map((skillCat, idx) => (
                              <Box key={idx} sx={{ mb: 1, fontSize: '12px' }}>
                                <Typography variant="caption" fontWeight={600}>{skillCat.category}:</Typography>
                                <Typography variant="caption" sx={{ ml: 1 }}>{skillCat.skills.join(', ')}</Typography>
                              </Box>
                            ))}
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {extractedData.projects && extractedData.projects.length > 0 && (
                        <Accordion sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1} width="100%">
                              <Typography variant="subtitle2" fontWeight={700}>
                                Projects ({extractedData.projects.length})
                              </Typography>
                              {history.length > 0 && (
                                <Chip
                                  icon={<HistoryIcon />}
                                  label={`${history.length} versions`}
                                  size="small"
                                  sx={{ ml: 'auto', fontSize: '10px', height: '20px' }}
                                />
                              )}
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Paper elevation={0} sx={{ p: 1.5, mb: 1, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                              <Chip label="CURRENT" size="small" color="success" sx={{ fontSize: '10px', height: '18px', mb: 1 }} />
                              {extractedData.projects.map((proj, idx) => (
                                <Box key={idx} sx={{ mb: 1, fontSize: '12px' }}>
                                  <Typography variant="body2" fontWeight={600}>{proj.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{proj.description}</Typography>
                                  {proj.technologies && proj.technologies.length > 0 && (
                                    <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                                      Tech: {proj.technologies.join(', ')}
                                    </Typography>
                                  )}
                                </Box>
                              ))}
                            </Paper>
                          </AccordionDetails>
                        </Accordion>
                      )}

                      {extractedData.certifications && extractedData.certifications.length > 0 && (
                        <Accordion sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              Certifications ({extractedData.certifications.length})
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px' }}>
                              {extractedData.certifications.map((cert, idx) => (
                                <li key={idx}>{cert}</li>
                              ))}
                            </ul>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </>
                  );
                })()}
              </Box>
            ) : (
              /* Raw JSON View */
              <Box
                sx={{
                  height: '100%',
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  p: 2,
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(extractedData, null, 2)}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Agent Tailoring Modal */}
      <Dialog
        open={tailoring}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: colorPalette.primary.darkGreen,
            color: 'white',
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <CircularProgress size={24} sx={{ color: 'white' }} />
            <Typography variant="h6" fontWeight={600}>
              Tailoring Resume
            </Typography>
          </Box>
          <LinearProgress
            sx={{
              mt: 2,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#ffffff',
              },
            }}
          />
        </DialogTitle>
        <DialogContent sx={{ p: 3, minHeight: '250px', maxHeight: '500px', overflow: 'auto' }}>
          {agentMessages.length === 0 && (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={4}>
              <CircularProgress size={40} sx={{ color: colorPalette.primary.darkGreen }} />
              <Typography variant="body2" color="text.secondary" mt={2}>
                Initializing agent...
              </Typography>
            </Box>
          )}

          {agentMessages.map((msg, idx) => (
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
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ProjectEditor;
