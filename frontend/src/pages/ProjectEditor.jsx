import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Drawer,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import { colorPalette } from '../styles/theme';
import projectService from '../services/projectService';
import resumeService from '../services/resumeService';
import { useAuth } from '../context/AuthContext';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ProjectEditor = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
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
  const [reorderingPdf, setReorderingPdf] = useState(false);
  const [jobDescDrawerOpen, setJobDescDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  const [extractedData, setExtractedData] = useState(null); // LLM extracted JSON
  const [downloadingRecreated, setDownloadingRecreated] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0 = formatted, 1 = raw JSON
  const [documentTab, setDocumentTab] = useState(0); // 0 = Resume, 1 = Cover Letter, 2 = Email
  const [coverLetter, setCoverLetter] = useState(null);
  const [email, setEmail] = useState(null); // { subject, body }
  const [pdfZoom, setPdfZoom] = useState(100);
  const [tailoring, setTailoring] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]); // Agent progress messages
  const [sectionOrder, setSectionOrder] = useState([
    'personal_info',
    'professional_summary',
    'experience',
    'projects',
    'education',
    'skills',
    'certifications',
  ]);
  const [expandedSections, setExpandedSections] = useState({
    personal_info: false,
    professional_summary: false,
    experience: false,
    projects: false,
    education: false,
    skills: false,
    certifications: false,
  }); // Track which sections are expanded (all collapsed by default)
  const iframeRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

        // Load section order from resume_json if available
        if (projectData.resume_json.section_order) {
          setSectionOrder(projectData.resume_json.section_order);
        }
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

    // Supported file formats (same as UploadResume)
    const SUPPORTED_FORMATS = ['.docx', '.doc', '.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'];

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isSupported = SUPPORTED_FORMATS.some(ext => fileName.endsWith(ext));

    if (!isSupported) {
      toast.error(`Unsupported file format. Please upload one of: ${SUPPORTED_FORMATS.join(', ')}`);
      setError(`Unsupported file format. Please upload one of: ${SUPPORTED_FORMATS.join(', ')}`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Step 1: Upload and convert the new resume
      const convertedData = await resumeService.uploadResume(file);

      // Step 2: Extract JSON data from metadata (LLM extraction)
      const resumeJson = convertedData.metadata?.resume_json;

      if (!resumeJson) {
        throw new Error('Failed to extract resume data. Please try again.');
      }

      setExtractedData(resumeJson);

      // Step 3: Update the project with the new resume JSON
      await projectService.updateProject(projectId, {
        resume_json: resumeJson,
        job_description: jobDescription,
      });

      // Step 4: Reload PDF preview with new data
      await loadPdfPreview();

      toast.success('Resume replaced successfully!');
    } catch (err) {
      console.error('Resume upload error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to upload and replace resume. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
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

      toast.success('Project saved successfully!');
    } catch (err) {
      console.error('Save error:', err);
      const errorMsg = 'Failed to save project. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
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
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download PDF. Please try again.');
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
      toast.success('DOCX downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download DOCX. Please try again.');
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
      toast.success('Tailored DOCX downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download DOCX. Please try again.');
    } finally {
      setDownloadingRecreated(false);
    }
  };

  const handleTailorResume = async () => {
    if (!jobDescription || jobDescription.trim().length < 10) {
      toast.error('Please paste a job description first (at least 10 characters).');
      return;
    }

    if (!extractedData) {
      toast.error('No resume found for this project. Please upload a resume first.');
      return;
    }

    // Check if user has sufficient credits
    if (user && user.credits < 5.0) {
      toast.error(
        `Insufficient credits! You have ${user.credits.toFixed(1)} credits. Minimum 5 credits required.`,
        { duration: 5000 }
      );
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

        // Fetch cover letter and email if generated
        try {
          const [coverLetterData, emailData] = await Promise.all([
            projectService.getCoverLetter(projectId).catch(() => null),
            projectService.getEmail(projectId).catch(() => null),
          ]);

          if (coverLetterData && coverLetterData.success) {
            setCoverLetter(coverLetterData.cover_letter);
            console.log('✓ Cover letter loaded');
          }

          if (emailData && emailData.success) {
            setEmail({
              subject: emailData.email_subject,
              body: emailData.email_body,
            });
            console.log('✓ Email loaded');
          }
        } catch (err) {
          console.warn('Failed to load cover letter/email:', err);
          // Don't fail the whole operation if these fail
        }

        // Refresh user data to update credits in navbar
        if (refreshUser) {
          await refreshUser();
        }

        // Show success message with changes made
        const changes = finalResult.changes_made || [];
        if (changes.length > 0) {
          toast.success(
            (t) => (
              <div>
                <strong>Resume tailored successfully!</strong>
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <strong>Changes Made:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {changes.slice(0, 3).map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                    {changes.length > 3 && <li>...and {changes.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            ),
            { duration: 6000 }
          );
        } else {
          toast.success('Resume tailored! Cover letter and email generated.');
        }
      } else {
        const errorMsg = finalResult?.message || 'Failed to tailor resume - no result';
        console.error('Tailoring failed:', finalResult);
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Tailoring error (full):', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);

      const errorMsg = err.message || 'Failed to tailor resume. Please try again.';
      setError(errorMsg);

      // If it's an auth error, redirect to login
      if (errorMsg.includes('authentication') || errorMsg.includes('Session expired') || errorMsg.includes('login again')) {
        toast.error(`${errorMsg} Redirecting to login...`, { duration: 3000 });
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setTailoring(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sectionOrder.indexOf(active.id);
    const newIndex = sectionOrder.indexOf(over.id);

    // Update local state immediately for smooth UX
    const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
    setSectionOrder(newOrder);

    try {
      console.log('Updating section order to:', newOrder);

      // Show reordering state
      setReorderingPdf(true);

      // Update backend
      const response = await projectService.updateSectionOrder(projectId, newOrder);
      console.log('Backend response:', response);

      // Force PDF reload by revoking old URL and loading new one
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Small delay to ensure backend has generated new PDF
      setTimeout(async () => {
        await loadPdfPreview();
        setReorderingPdf(false);
        console.log('PDF reloaded with new section order');
      }, 500);

    } catch (err) {
      console.error('Failed to update section order:', err);
      setReorderingPdf(false);
      // Revert on error
      setSectionOrder(sectionOrder);
      toast.error('Failed to update section order. Please try again.');
    }
  };

  // Toggle section expansion
  const handleToggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // SortableSection component for drag and drop
  const SortableSection = ({ id, children }) => {
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

  // Helper function to format timestamp
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

  // Helper to render each section
  const renderSection = (sectionKey) => {
    const history = project?.tailoring_history || [];

    switch (sectionKey) {
      case 'personal_info':
        return extractedData.personal_info ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Personal Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
                  <Chip label="CURRENT" size="small" color="success" sx={{ fontSize: '10px', height: '18px', mb: 1 }} />
                  <Box sx={{ fontSize: '12px' }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                      {extractedData.personal_info.name}
                    </Typography>
                    {extractedData.personal_info.email && (
                      <Typography variant="caption" display="block">
                        Email: {extractedData.personal_info.email}
                      </Typography>
                    )}
                    {extractedData.personal_info.phone && (
                      <Typography variant="caption" display="block">
                        Phone: {extractedData.personal_info.phone}
                      </Typography>
                    )}
                    {extractedData.personal_info.location && (
                      <Typography variant="caption" display="block">
                        Location: {extractedData.personal_info.location}
                      </Typography>
                    )}
                    {extractedData.personal_info.header_links && extractedData.personal_info.header_links.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" fontWeight={600} display="block">
                          Links:
                        </Typography>
                        {extractedData.personal_info.header_links.map((link, idx) => (
                          <Typography key={idx} variant="caption" display="block" sx={{ ml: 1 }}>
                            • {link.text} {link.url && `(${link.url})`}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Paper>
              </AccordionDetails>
            </Accordion>
          </SortableSection>
        ) : null;

      case 'professional_summary':
        return extractedData.professional_summary ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
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
          </SortableSection>
        ) : null;

      case 'experience':
        return extractedData.experience && extractedData.experience.length > 0 ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
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
          </SortableSection>
        ) : null;

      case 'projects':
        return extractedData.projects && extractedData.projects.length > 0 ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
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
          </SortableSection>
        ) : null;

      case 'education':
        return extractedData.education && extractedData.education.length > 0 ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
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
          </SortableSection>
        ) : null;

      case 'skills':
        return extractedData.skills && extractedData.skills.length > 0 ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
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
          </SortableSection>
        ) : null;

      case 'certifications':
        return extractedData.certifications && extractedData.certifications.length > 0 ? (
          <SortableSection key={sectionKey} id={sectionKey}>
            <Accordion
              expanded={expandedSections[sectionKey] || false}
              onChange={() => handleToggleSection(sectionKey)}
              sx={{ mb: 1 }}
            >
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
          </SortableSection>
        ) : null;

      default:
        return null;
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
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Full-Screen Loading Overlay for Resume Upload */}
      {uploading && (
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
          <CircularProgress size={60} sx={{ color: '#4caf50', mb: 3 }} />
          <Typography variant="h6" sx={{ color: '#fff', fontFamily: 'Poppins, sans-serif', mb: 1 }}>
            Replacing Resume
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'Poppins, sans-serif' }}>
            Extracting data and generating preview...
          </Typography>
        </Box>
      )}

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
            accept=".docx,.doc,.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif"
            style={{ display: 'none' }}
          />

          {/* Replace Resume */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="small"
            startIcon={uploading ? <CircularProgress size={14} sx={{ color: '#111111' }} /> : null}
            sx={{
              color: '#111111',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(17,17,17,0.1)' },
              '&:disabled': {
                color: '#666',
                opacity: 0.7,
              },
            }}
          >
            {uploading ? 'Replacing...' : 'Replace'}
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

          {/* Tailor Resume Button */}
          <Button
            onClick={() => setJobDescDrawerOpen(true)}
            disabled={tailoring || !extractedData}
            size="small"
            variant="contained"
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              color: '#ffffff',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              minWidth: 'auto',
              px: 1.5,
              py: 0.5,
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            Tailor Resume
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

      {/* 2-Column Layout: PDF Preview (flex) + Extracted Data (fixed) */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden', bgcolor: '#f5f7fa' }}>
        {/* Left: PDF Viewer - Takes remaining space */}
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
          {/* Document Tabs: Resume | Cover Letter | Email */}
          <Box
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: '#fff',
            }}
          >
            <Tabs
              value={documentTab}
              onChange={(e, newValue) => setDocumentTab(newValue)}
              sx={{
                minHeight: '48px',
                '& .MuiTab-root': {
                  minHeight: '48px',
                  textTransform: 'none',
                  fontWeight: 600,
                },
              }}
            >
              <Tab icon={<DescriptionIcon />} iconPosition="start" label="Resume" />
              <Tab icon={<EmailIcon />} iconPosition="start" label="Cover Letter" />
              <Tab icon={<SendIcon />} iconPosition="start" label="Email" />
            </Tabs>
          </Box>

          {/* Zoom Controls (only for Resume tab) */}
          {documentTab === 0 && (
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
              <Box display="flex" alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleZoomOut}
                  disabled={pdfZoom <= 60}
                  sx={{
                    color: '#2c3e50',
                    borderColor: 'transparent',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    minWidth: '30px',
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
                    borderColor: 'transparent',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    minWidth: '30px',
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
              </>
            )}

            {/* Cover Letter Tab */}
            {documentTab === 1 && (
              <Box sx={{ width: '100%', height: '100%', p: 3, overflow: 'auto' }}>
                {coverLetter ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600} color="#2c3e50">
                        Cover Letter
                      </Typography>
                      <Button
                        startIcon={<DownloadIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          // Download as .txt file
                          const blob = new Blob([coverLetter], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${project?.project_name || 'cover-letter'}_cover_letter.txt`;
                          a.click();
                          URL.revokeObjectURL(url);
                          toast.success('Cover letter downloaded!');
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Download
                      </Button>
                    </Box>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        bgcolor: '#fff',
                        border: '1px solid #e0e0e0',
                        whiteSpace: 'pre-wrap',
                        fontFamily: '"Times New Roman", serif',
                        fontSize: '14px',
                        lineHeight: 1.6,
                      }}
                    >
                      {coverLetter}
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
              <Box sx={{ width: '100%', height: '100%', p: 3, overflow: 'auto' }}>
                {email ? (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" fontWeight={600} color="#2c3e50">
                        Recruiter Email
                      </Typography>
                      <Button
                        startIcon={<ContentCopyIcon />}
                        variant="outlined"
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
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary" mb={1}>
                        Subject:
                      </Typography>
                      <Typography variant="body1" fontWeight={600} mb={3} sx={{ color: '#2c3e50' }}>
                        {email.subject}
                      </Typography>
                      <Box
                        sx={{
                          borderTop: '1px solid #e0e0e0',
                          pt: 3,
                        }}
                      >
                        <Typography variant="subtitle2" color="text.secondary" mb={1}>
                          Body:
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            fontFamily: '"Arial", sans-serif',
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

        {/* Right: Extracted Data with Tabs - 40% Width */}
        <Box
          sx={{
            width: '40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: '#ffffff',
          }}
        >
          <Box
            sx={{
              px: 2,
              py:0.4,
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
              /* Formatted View with Drag-and-Drop Reordering */
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sectionOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <Box sx={{ pl: 1 }}>
                    {sectionOrder.map((sectionKey) => renderSection(sectionKey))}
                  </Box>
                </SortableContext>
              </DndContext>
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

      {/* Agent Tailoring Full-Screen Overlay */}
      {tailoring && (
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
                <Typography variant="h5" fontWeight={700} fontFamily="Poppins, sans-serif">
                  Tailoring Resume
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
            </Box>
          </Box>
        </Box>
      )}

      {/* Job Description Drawer - Slides from Left */}
      <Drawer
        anchor="left"
        open={jobDescDrawerOpen}
        onClose={() => setJobDescDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '450px',
            boxSizing: 'border-box',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            bgcolor: '#ffffff',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 2,
              borderBottom: '2px solid',
              borderColor: colorPalette.primary.darkGreen,
              bgcolor: 'rgba(76, 175, 80, 0.04)',
            }}
          >
            <Typography variant="h6" fontWeight={700} color="#2c3e50" gutterBottom>
              Job Description
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Paste the job description below and click "Tailor" to optimize your resume
            </Typography>
          </Box>

          {/* Job Description TextField */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: '#fafbfc' }}>
            <TextField
              fullWidth
              multiline
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: '14px',
                  lineHeight: '1.6',
                  bgcolor: '#ffffff',
                  borderRadius: '8px',
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
              rows={20}
            />
          </Box>

          {/* Footer Actions */}
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid #e1e8ed',
              display: 'flex',
              gap: 1,
              justifyContent: 'flex-end',
            }}
          >
            <Button
              onClick={() => setJobDescDrawerOpen(false)}
              sx={{
                textTransform: 'none',
                color: '#666',
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                handleTailorResume();
                setJobDescDrawerOpen(false);
              }}
              disabled={tailoring || !jobDescription || !extractedData}
              sx={{
                bgcolor: colorPalette.primary.darkGreen,
                color: '#ffffff',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#1a8050',
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#666666',
                },
              }}
            >
              {tailoring ? 'Tailoring...' : 'Tailor Resume'}
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ProjectEditor;
