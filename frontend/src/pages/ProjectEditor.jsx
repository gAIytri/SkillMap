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
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
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
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { colorPalette } from '../styles/theme';
import projectService from '../services/projectService';
import resumeService from '../services/resumeService';
import { useAuth } from '../context/AuthContext';
import RechargeDialog from '../components/credits/RechargeDialog';
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
  const [jobDescription, setJobDescription] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [reorderingPdf, setReorderingPdf] = useState(false);
  const [jobDescDrawerOpen, setJobDescDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  const [pendingChanges, setPendingChanges] = useState(false); // Track if there are unsaved changes
  const [compiling, setCompiling] = useState(false); // Track if PDF is being compiled
  const [extractedData, setExtractedData] = useState(null); // LLM extracted JSON
  const [activeTab, setActiveTab] = useState(0); // 0 = formatted, 1 = raw JSON
  const [documentTab, setDocumentTab] = useState(0); // 0 = Resume, 1 = Cover Letter, 2 = Email
  const [coverLetter, setCoverLetter] = useState(null);
  const [email, setEmail] = useState(null); // { subject, body }
  const [pdfZoom, setPdfZoom] = useState(100);
  const [tailoring, setTailoring] = useState(false);
  const [agentMessages, setAgentMessages] = useState([]); // Agent progress messages
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeDialogBlocking, setRechargeDialogBlocking] = useState(false);
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState(null);
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
  const abortControllerRef = useRef(null); // For cancelling requests

  // Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // mobile < 900px
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 900px - 1200px
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadProject();

    // Cleanup function to abort pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        console.log('Aborting pending requests on unmount');
        abortControllerRef.current.abort();
      }
    };
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

      // Load JD: prefer last_tailoring_jd, fallback to job_description
      const jdToLoad = projectData.last_tailoring_jd || projectData.job_description || '';
      setJobDescription(jdToLoad);

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
      const errorMsg = 'Failed to load project. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
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

    // Create new AbortController for this upload
    const uploadAbortController = new AbortController();
    abortControllerRef.current = uploadAbortController;

    try {
      // Step 1: Upload and convert the new resume with abort support
      const convertedData = await resumeService.uploadResume(
        file,
        null, // No progress callback needed here
        uploadAbortController.signal
      );

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
      // Gracefully handle aborted uploads
      if (err.name === 'AbortError') {
        console.log('Resume upload was cancelled');
        return;
      }

      console.error('Resume upload error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to upload and replace resume. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
      abortControllerRef.current = null; // Clean up controller
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      link.download = `${(project?.project_name || 'resume').replace(/\s+/g, '_')}.pdf`;
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
      link.download = `${(project?.project_name || 'resume').replace(/\s+/g, '_')}.docx`;
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
      // Show blocking recharge dialog
      setRechargeDialogBlocking(true);
      setShowRechargeDialog(true);
      return;
    }

    setTailoring(true);
    setError('');
    setAgentMessages([]); // Clear previous messages

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

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
        },
        abortControllerRef.current.signal // Pass abort signal
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
        let updatedUser = user;
        if (refreshUser) {
          const freshUser = await refreshUser();
          if (freshUser) {
            updatedUser = freshUser;
          }
        }

        // Check if low credits warning should be shown (non-blocking)
        if (updatedUser && updatedUser.credits < 10.0) {
          setRechargeDialogBlocking(false);
          setShowRechargeDialog(true);
        }

        // Show success message with changes made
        const changes = finalResult.changes_made || [];
        if (changes.length > 0) {
          toast.success(
            (_t) => (
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
        // Check if it's an invalid intent error
        const errorMsg = finalResult?.message || 'Failed to tailor resume - no result';
        console.error('Tailoring failed:', finalResult);

        if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('not related') || errorMsg.toLowerCase().includes('unrelated')) {
          // Invalid intent detected - revert to last tailoring JD if available
          const lastJD = project?.last_tailoring_jd || '';
          if (lastJD) {
            toast.error(
              `${errorMsg}. Reverted to previous job description.`,
              { duration: 5000 }
            );
            setJobDescription(lastJD);
          } else {
            toast.error(
              `${errorMsg}. Please provide a valid job description.`,
              { duration: 5000 }
            );
            setJobDescription(''); // Clear invalid JD
          }
        } else {
          setError(errorMsg);
          toast.error(errorMsg);
        }
      }
    } catch (err) {
      // Gracefully handle aborted requests (user navigated away)
      if (err.name === 'AbortError') {
        console.log('Tailoring request was cancelled');
        return; // Don't show error message for intentional cancellation
      }

      console.error('Tailoring error (full):', err);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);

      const errorMsg = err.message || 'Failed to tailor resume. Please try again.';
      setError(errorMsg);
      toast.error(errorMsg);

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
      abortControllerRef.current = null; // Clean up controller
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

      // Update backend
      const response = await projectService.updateSectionOrder(projectId, newOrder);
      console.log('Backend response:', response);

      // Mark as having pending changes (user needs to click Compile)
      setPendingChanges(true);
      toast.success('Section order updated. Click "Compile" to see changes in PDF.');

    } catch (err) {
      console.error('Failed to update section order:', err);
      // Revert on error
      setSectionOrder(sectionOrder);
      toast.error('Failed to update section order. Please try again.');
    }
  };

  // Compile/Regenerate PDF with current changes
  const handleCompile = async () => {
    try {
      setCompiling(true);
      setPdfLoading(true);

      // Revoke old PDF URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      // Reload PDF preview
      await loadPdfPreview();

      // Clear pending changes flag
      setPendingChanges(false);
      toast.success('PDF compiled successfully!');
    } catch (err) {
      console.error('Failed to compile PDF:', err);
      toast.error('Failed to compile PDF. Please try again.');
    } finally {
      setCompiling(false);
      setPdfLoading(false);
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

  // If error and no project, show error page without Alert
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
        <Typography variant="h6" color="error" sx={{ mb: 3 }}>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 48px)', display: 'flex', position: 'relative' }}>
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

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleResumeUpload}
        accept=".docx,.doc,.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif"
        style={{ display: 'none' }}
      />

      {/* Download Menu */}
      <Menu
        anchorEl={downloadMenuAnchor}
        open={Boolean(downloadMenuAnchor)}
        onClose={() => setDownloadMenuAnchor(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem
          onClick={() => {
            handleDownloadPDF();
            setDownloadMenuAnchor(null);
          }}
          disabled={downloading}
        >
          <DescriptionIcon sx={{ mr: 1, fontSize: 18 }} />
          Download as PDF
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDownloadDOCX();
            setDownloadMenuAnchor(null);
          }}
          disabled={downloading}
        >
          <DescriptionIcon sx={{ mr: 1, fontSize: 18 }} />
          Download as DOCX
        </MenuItem>
      </Menu>

      {/* Left Vertical Sidebar (10% width) - Desktop Only */}
      {!isMobile && (
        <Box
          sx={{
            width: '10%',
            minWidth: '140px',
            maxWidth: '180px',
            bgcolor: '#f8f9fa',
            borderRight: '2px solid #e1e8ed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            py: 2,
            px: 1,
            gap: 1,
            overflow: 'auto',
          }}
        >
          {/* Back to Dashboard Button */}
          <Button
            onClick={() => navigate('/dashboard')}
            size="small"
            startIcon={<ArrowBackIcon />}
            sx={{
              color: colorPalette.primary.darkGreen,
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: '0.75rem',
              justifyContent: 'flex-start',
              px: 1,
              '&:hover': {
                bgcolor: 'rgba(76, 175, 80, 0.1)',
              },
            }}
          >
            Dashboard
          </Button>

          {/* Project Name */}
          <Typography
            variant="caption"
            sx={{
              px: 1,
              py: 1,
              color: '#666',
              fontWeight: 600,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={project?.project_name}
          >
            {project?.project_name}
          </Typography>

          {/* Document Tabs - Vertical */}
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                pb: 1,
                color: '#666',
                fontWeight: 600,
                display: 'block',
              }}
            >
              DOCUMENTS
            </Typography>
            <Button
              fullWidth
              onClick={() => setDocumentTab(0)}
              startIcon={<DescriptionIcon />}
              sx={{
                justifyContent: 'flex-start',
                color: documentTab === 0 ? '#fff' : colorPalette.primary.darkGreen,
                bgcolor: documentTab === 0 ? colorPalette.primary.darkGreen : 'transparent',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.8rem',
                px: 1.5,
                py: 1,
                mb: 0.5,
                '&:hover': {
                  bgcolor: documentTab === 0 ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
                },
              }}
            >
              Resume
            </Button>
            <Button
              fullWidth
              onClick={() => setDocumentTab(1)}
              startIcon={<EmailIcon />}
              sx={{
                justifyContent: 'flex-start',
                color: documentTab === 1 ? '#fff' : colorPalette.primary.darkGreen,
                bgcolor: documentTab === 1 ? colorPalette.primary.darkGreen : 'transparent',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.8rem',
                px: 1.5,
                py: 1,
                mb: 0.5,
                '&:hover': {
                  bgcolor: documentTab === 1 ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
                },
              }}
            >
              Cover Letter
            </Button>
            <Button
              fullWidth
              onClick={() => setDocumentTab(2)}
              startIcon={<SendIcon />}
              sx={{
                justifyContent: 'flex-start',
                color: documentTab === 2 ? '#fff' : colorPalette.primary.darkGreen,
                bgcolor: documentTab === 2 ? colorPalette.primary.darkGreen : 'transparent',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.8rem',
                px: 1.5,
                py: 1,
                '&:hover': {
                  bgcolor: documentTab === 2 ? colorPalette.primary.darkGreen : 'rgba(76, 175, 80, 0.1)',
                },
              }}
            >
              Email
            </Button>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                pb: 1,
                color: '#666',
                fontWeight: 600,
                display: 'block',
              }}
            >
              ACTIONS
            </Typography>

            {/* Replace Resume Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              fullWidth
              size="small"
              variant="outlined"
              startIcon={uploading ? <CircularProgress size={14} /> : <DescriptionIcon />}
              sx={{
                color: colorPalette.primary.darkGreen,
                borderColor: colorPalette.primary.darkGreen,
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.75rem',
                py: 1,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: colorPalette.primary.darkGreen,
                },
                '&:disabled': {
                  borderColor: '#cccccc',
                  color: '#666666',
                },
              }}
            >
              {uploading ? 'Replacing...' : 'Replace'}
            </Button>

            {/* Download Button */}
            <Button
              onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
              disabled={downloading}
              fullWidth
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              sx={{
                color: colorPalette.primary.darkGreen,
                borderColor: colorPalette.primary.darkGreen,
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.75rem',
                py: 1,
                '&:hover': {
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  borderColor: colorPalette.primary.darkGreen,
                },
                '&:disabled': {
                  borderColor: '#cccccc',
                  color: '#666666',
                },
              }}
            >
              {downloading ? 'Downloading...' : 'Download'}
            </Button>

            {/* Tailor Resume Button */}
            <Button
              onClick={() => setJobDescDrawerOpen(true)}
              disabled={tailoring || !extractedData}
              fullWidth
              size="small"
              variant="contained"
              sx={{
                bgcolor: colorPalette.primary.darkGreen,
                color: '#ffffff',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.75rem',
                py: 1,
                '&:hover': {
                  bgcolor: '#1a8050',
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#666666',
                },
              }}
            >
              Tailor
            </Button>
          </Box>
        </Box>
      )}

      {/* Mobile-Only Header */}
      {isMobile && (
      <Box
        sx={{
          height: isMobile ? '48px' : '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: isMobile ? 1 : 2,
          backgroundColor:'#98C7AC',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(244,244,244,0.1)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          opacity:0.8,
          overflow: 'hidden',
        }}
      >
        {/* Left: Back button and Project Info (One Line) */}
        <Box display="flex" alignItems="center" gap={isMobile ? 0.5 : 1.5} overflow="hidden" flex={1} mr={1}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            size="small"
            sx={{
              color: '#111111',
              p: isMobile ? 0.5 : 1,
              '&:hover': { bgcolor: 'rgba(244,244,244,0.1)' },
            }}
          >
            <ArrowBackIcon fontSize={isMobile ? 'small' : 'medium'} />
          </IconButton>
          <Typography
            variant={isMobile ? 'body2' : 'subtitle1'}
            fontWeight={600}
            sx={{
              color: '#111111',
              fontFamily: 'Poppins, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              mr: isMobile ? 0 : 2,
            }}
          >
            {project?.project_name}
          </Typography>
          {!isMobile && (
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
          )}
        </Box>

        {/* Right: Action Buttons */}
        <Box display="flex" alignItems="center" gap={isMobile ? 0.5 : 1} flexShrink={0}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleResumeUpload}
            accept=".docx,.doc,.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif"
            style={{ display: 'none' }}
          />

          {/* Replace Resume */}
          {!isMobile && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              size="small"
              variant="contained"
              startIcon={uploading ? <CircularProgress size={14} sx={{ color: '#ffffff' }} /> : null}
              sx={{
                bgcolor: colorPalette.primary.darkGreen,
                color: '#ffffff',
                textTransform: 'none',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '0.75rem',
                minWidth: 'auto',
                px: 2,
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
              {uploading ? 'Replacing...' : 'Replace Resume'}
            </Button>
          )}

          {/* Download Button with Dropdown */}
          <Button
            onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
            disabled={downloading}
            size="small"
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              bgcolor: colorPalette.primary.darkGreen,
              color: '#ffffff',
              textTransform: 'none',
              fontFamily: 'Poppins, sans-serif',
              fontSize: isMobile ? '0.65rem' : '0.75rem',
              minWidth: 'auto',
              px: isMobile ? 1.5 : 2,
              py: isMobile ? 0.3 : 0.5,
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            Download
          </Button>

          {/* Download Menu */}
          <Menu
            anchorEl={downloadMenuAnchor}
            open={Boolean(downloadMenuAnchor)}
            onClose={() => setDownloadMenuAnchor(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <MenuItem
              onClick={() => {
                handleDownloadPDF();
                setDownloadMenuAnchor(null);
              }}
              disabled={downloading}
            >
              <DescriptionIcon sx={{ mr: 1, fontSize: 18 }} />
              Download as PDF
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleDownloadDOCX();
                setDownloadMenuAnchor(null);
              }}
              disabled={downloading}
            >
              <DescriptionIcon sx={{ mr: 1, fontSize: 18 }} />
              Download as DOCX
            </MenuItem>
          </Menu>

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
              fontSize: isMobile ? '0.65rem' : '0.75rem',
              minWidth: 'auto',
              px: isMobile ? 1.5 : 2.5,
              py: isMobile ? 0.3 : 0.5,
              '&:hover': {
                bgcolor: '#1a8050',
              },
              '&:disabled': {
                bgcolor: '#cccccc',
                color: '#666666',
              },
            }}
          >
            {isMobile ? 'Tailor' : 'Tailor Resume'}
          </Button>
        </Box>
      </Box>
      )}

      {/* Main Content Area - 90% width on desktop, full width on mobile */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, overflow: 'hidden', bgcolor: '#f5f7fa', position: 'relative' }}>
        {/* Left: PDF Viewer - Takes remaining space */}
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
            <Tabs
              value={documentTab}
              onChange={(_e, newValue) => setDocumentTab(newValue)}
              sx={{
                minHeight: '48px',
                flex: 1,
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
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
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

                {/* Compile Button */}
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleCompile}
                  disabled={!pendingChanges || compiling}
                  startIcon={compiling ? <CircularProgress size={14} sx={{ color: '#ffffff' }} /> : null}
                  sx={{
                    ml: 2,
                    bgcolor: pendingChanges ? colorPalette.primary.brightGreen : '#cccccc',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    px: 2,
                    py: 0.5,
                    '&:hover': {
                      bgcolor: pendingChanges ? '#1a8050' : '#cccccc',
                    },
                    '&:disabled': {
                      bgcolor: '#cccccc',
                      color: '#999999',
                    },
                  }}
                >
                  {compiling ? 'Compiling...' : pendingChanges ? 'Compile ⚡' : 'Compiled ✓'}
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

        {/* Right: Extracted Data with Tabs - Drawer on Mobile, Fixed Sidebar on Desktop/Tablet */}
        {!isMobile && (
          /* Desktop/Tablet: Fixed Sidebar */
          <Box
            sx={{
              width: isTablet ? '35%' : '30%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: '#ffffff',
            }}
          >
            

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
        )}
      </Box>

      {/* Mobile Drawer for Extracted Data */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '85%',
            maxWidth: '400px',
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
          {/* Drawer Header */}
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
            <IconButton
              size="small"
              onClick={() => setMobileDrawerOpen(false)}
              sx={{ color: '#2c3e50' }}
            >
              <CloseIcon />
            </IconButton>
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
            <Tab label="Formatted" />
            <Tab label="JSON" />
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
      </Drawer>

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
                <Typography variant="h5" fontWeight={700} color='white' fontFamily="Poppins, sans-serif">
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

      {/* Recharge Credits Dialog */}
      <RechargeDialog
        open={showRechargeDialog}
        onClose={() => setShowRechargeDialog(false)}
        currentCredits={user?.credits || 0}
        blocking={rechargeDialogBlocking}
      />
    </Box>
  );
};

export default ProjectEditor;
