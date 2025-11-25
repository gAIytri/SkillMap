import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  TextField,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { colorPalette } from '../styles/theme';
import projectService from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import RechargeDialog from '../components/credits/RechargeDialog';
import { useTailorResume } from '../hooks/useTailorResume.jsx';
import { useResumeUpload } from '../hooks/useResumeUpload.jsx';
import ActionSidebar from '../components/project-editor/ActionSidebar';
import DocumentViewer from '../components/project-editor/DocumentViewer';
import ExtractedDataPanel from '../components/project-editor/ExtractedDataPanel';
import TailoringOverlay from '../components/project-editor/TailoringOverlay';
import JobDescriptionDrawer from '../components/project-editor/JobDescriptionDrawer';
import PersonalInfoSection from '../components/project-editor/PersonalInfoSection';
import ProfessionalSummarySection from '../components/project-editor/ProfessionalSummarySection';
import ExperienceSection from '../components/project-editor/ExperienceSection';
import ProjectsSection from '../components/project-editor/ProjectsSection';
import EducationSection from '../components/project-editor/EducationSection';
import SkillsSection from '../components/project-editor/SkillsSection';
import CertificationsSection from '../components/project-editor/CertificationsSection';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

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
  // Custom section names
  const [sectionNames, setSectionNames] = useState({
    personal_info: 'Personal Information',
    professional_summary: 'Professional Summary',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
  });
  const [rightSidebarWidth, setRightSidebarWidth] = useState(35); // Width as percentage (25-45%)
  const [isResizing, setIsResizing] = useState(false);

  // Section-level editing state
  const [editingSection, setEditingSection] = useState(null); // Which section is being edited (e.g., 'professional_summary', 'experience', etc.)
  const [tempSectionData, setTempSectionData] = useState(null); // Temporary data for the entire section while editing

  const [selectedSection, setSelectedSection] = useState('personal_info'); // Currently selected section tab (default: personal_info)
  const [viewingPreviousVersion, setViewingPreviousVersion] = useState(false); // Track if user is viewing a previous version
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
  const pdfLoadingRef = useRef(false); // Track if PDF is currently being loaded

  // Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // mobile < 900px
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // 900px - 1200px
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false); // Right drawer for extracted data
  const [mobileLeftDrawerOpen, setMobileLeftDrawerOpen] = useState(false); // Left drawer for actions

  // Drag and drop sensors with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load PDF preview function (defined early for use in loadProject)
  const loadPdfPreview = async () => {
    // Prevent concurrent PDF loads
    if (pdfLoadingRef.current) {
      console.log('PDF already loading, skipping duplicate request');
      return;
    }

    try {
      pdfLoadingRef.current = true;
      setPdfLoading(true);
      const blob = await projectService.downloadProjectPDF(projectId);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfLoading(false);
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
      setPdfLoading(false);
    } finally {
      pdfLoadingRef.current = false;
    }
  };

  // Load project data function (defined early for use in hooks)
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

        // Load custom section names from resume_json if available
        if (projectData.resume_json.section_names) {
          setSectionNames(prev => ({
            ...prev,
            ...projectData.resume_json.section_names
          }));
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

  // Custom hooks for complex operations
  const { handleTailorResume, abortControllerRef: tailorAbortRef } = useTailorResume({
    projectId,
    project,
    jobDescription,
    extractedData,
    user,
    refreshUser,
    setTailoring,
    setError,
    setAgentMessages,
    setExtractedData,
    loadPdfPreview: () => loadPdfPreview(),
    setCoverLetter,
    setEmail,
    setRechargeDialogBlocking,
    setShowRechargeDialog,
    setJobDescription,
    setDocumentTab,
    loadProject, // Add this to refresh project data after tailoring
  });

  const { handleResumeUpload, abortControllerRef: uploadAbortRef } = useResumeUpload({
    projectId,
    jobDescription,
    setUploading,
    setError,
    setExtractedData,
    loadPdfPreview: () => loadPdfPreview(),
    fileInputRef,
  });

  useEffect(() => {
    loadProject();

    // Cleanup function to abort pending requests on unmount
    return () => {
      if (abortControllerRef.current) {
        console.log('Aborting pending requests on unmount');
        abortControllerRef.current.abort();
      }
      if (tailorAbortRef.current) {
        console.log('Aborting tailoring request on unmount');
        tailorAbortRef.current.abort();
      }
      if (uploadAbortRef.current) {
        console.log('Aborting upload request on unmount');
        uploadAbortRef.current.abort();
      }
    };
  }, [projectId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentMessages]);

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

  // Sidebar resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;

      // Calculate the available width (full width minus 10% left sidebar)
      const leftSidebarWidth = window.innerWidth * 0.1;
      const availableWidth = window.innerWidth - leftSidebarWidth;

      // Mouse position relative to the available area (after left sidebar)
      const mouseXRelative = e.clientX - leftSidebarWidth;

      // Calculate what percentage the RIGHT sidebar should be
      // (distance from right edge of screen to mouse)
      const distanceFromRight = window.innerWidth - e.clientX;
      const newWidth = (distanceFromRight / availableWidth) * 100;

      // Clamp between 25% and 45%
      const clampedWidth = Math.min(Math.max(newWidth, 25), 45);
      setRightSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';

      // Prevent iframe and other elements from capturing mouse events during resize
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.style.pointerEvents = 'none';
      });

      // Add overlay to prevent any element from interfering
      const overlay = document.createElement('div');
      overlay.id = 'resize-overlay';
      overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; cursor: ew-resize;';
      document.body.appendChild(overlay);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Re-enable iframe pointer events
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        iframe.style.pointerEvents = 'auto';
      });

      // Remove overlay
      const overlay = document.getElementById('resize-overlay');
      if (overlay) {
        overlay.remove();
      }
    };
  }, [isResizing]);

  // Section-level editing handlers
  const handleStartEditingSection = (sectionKey) => {
    setEditingSection(sectionKey);

    // Copy the entire section data for editing
    if (sectionKey === 'personal_info') {
      setTempSectionData(JSON.parse(JSON.stringify(extractedData.personal_info))); // Deep copy
    } else if (sectionKey === 'professional_summary') {
      setTempSectionData(extractedData.professional_summary);
    } else if (sectionKey === 'experience') {
      setTempSectionData(JSON.parse(JSON.stringify(extractedData.experience))); // Deep copy
    } else if (sectionKey === 'projects') {
      setTempSectionData(JSON.parse(JSON.stringify(extractedData.projects)));
    } else if (sectionKey === 'education') {
      setTempSectionData(JSON.parse(JSON.stringify(extractedData.education)));
    } else if (sectionKey === 'skills') {
      setTempSectionData(JSON.parse(JSON.stringify(extractedData.skills)));
    } else if (sectionKey === 'certifications') {
      setTempSectionData(JSON.parse(JSON.stringify(extractedData.certifications)));
    }
  };

  const handleSaveSection = () => {
    if (!editingSection) return;

    const updatedData = { ...extractedData };
    let dataToSave = tempSectionData;

    // Convert bullets array back to description string ONLY for projects
    // Experience section keeps bullets as native array
    if (editingSection === 'projects' && Array.isArray(dataToSave)) {
      dataToSave = dataToSave.map(item => {
        if (item.bullets && Array.isArray(item.bullets)) {
          return {
            ...item,
            description: item.bullets.filter(b => b.trim()).join('\n'),
            bullets: undefined // Remove bullets field
          };
        }
        return item;
      });
    }

    // For experience, just filter out empty bullets
    if (editingSection === 'experience' && Array.isArray(dataToSave)) {
      dataToSave = dataToSave.map(item => {
        if (item.bullets && Array.isArray(item.bullets)) {
          return {
            ...item,
            bullets: item.bullets.filter(b => b.trim()) // Keep only non-empty bullets
          };
        }
        return item;
      });
    }

    updatedData[editingSection] = dataToSave;
    // Section names are already updated in state via the TextField onChange

    setExtractedData(updatedData);
    setEditingSection(null);
    setTempSectionData(null);
    setPendingChanges(true);
  };

  const handleCancelEditingSection = () => {
    setEditingSection(null);
    setTempSectionData(null);
  };

  // Restore a previous version
  const handleRestoreVersion = (sectionKey, versionData) => {
    const updatedData = { ...extractedData };
    updatedData[sectionKey] = versionData;

    setExtractedData(updatedData);
    setPendingChanges(true);
  };

  // Helper to update temp section data
  const updateTempField = (index, field, value) => {
    // If index is null and value is an array, replace entire array (for add/delete operations)
    if (index === null && Array.isArray(value)) {
      setTempSectionData(value);
      return;
    }

    // If index is null and field is provided, update object field (for PersonalInfo)
    if (index === null && field && typeof tempSectionData === 'object' && !Array.isArray(tempSectionData)) {
      setTempSectionData({ ...tempSectionData, [field]: value });
      return;
    }

    if (Array.isArray(tempSectionData)) {
      const updated = [...tempSectionData];
      if (field) {
        updated[index] = { ...updated[index], [field]: value };
      } else {
        updated[index] = value;
      }
      setTempSectionData(updated);
    } else {
      setTempSectionData(value);
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

  const handleCompile = async () => {
    try {
      setCompiling(true);

      // Save custom section names and section order to backend
      if (extractedData) {
        const updatedResumeJson = {
          ...extractedData,
          section_names: sectionNames,
          section_order: sectionOrder
        };

        await projectService.updateProject(projectId, {
          resume_json: updatedResumeJson,
          section_order: sectionOrder
        });

        setExtractedData(updatedResumeJson);
      }

      // Compile PDF (with smart caching)
      const response = await api.post(`/api/projects/${projectId}/compile`, {});

      if (response.data.cached) {
        toast.success('PDF loaded from cache!');
      } else {
        toast.success('PDF compiled successfully!');
      }

      // Reload PDF preview
      await loadPdfPreview();
      setPendingChanges(false);

    } catch (err) {
      console.error('Failed to compile PDF:', err);
      toast.error('Failed to compile PDF. Please try again.');
    } finally {
      setCompiling(false);
    }
  };

  // Toggle section expansion
  const handleToggleSection = (sectionKey) => {
    const willBeExpanded = !expandedSections[sectionKey];

    // If collapsing a section that's being edited, cancel edit mode
    if (!willBeExpanded && editingSection === sectionKey) {
      handleCancelEditingSection();
    }

    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Helper to render editable section title with edit/save/cancel icons
  const renderSectionTitle = (sectionKey, canEdit = false) => {
    const isEditing = editingSection === sectionKey;
    const isExpanded = expandedSections[sectionKey];

    // When editing, show section name as editable text field
    if (isEditing) {
      return (
        <Box display="flex" alignItems="center" gap={1} width="100%" onClick={(e) => e.stopPropagation()}>
          <TextField
            value={sectionNames[sectionKey]}
            onChange={(e) => {
              setSectionNames(prev => ({
                ...prev,
                [sectionKey]: e.target.value
              }));
            }}
            variant="standard"
            sx={{
              flex: 1,
              '& .MuiInputBase-root': {
                fontSize: isMobile ? '0.8rem' : '0.875rem',
                fontWeight: 700,
              }
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleSaveSection();
            }}
            sx={{ p: isMobile ? 0.75 : 0.5 }}
          >
            <CheckIcon fontSize={isMobile ? "medium" : "small"} sx={{ color: '#4caf50' }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleCancelEditingSection();
            }}
            sx={{ p: isMobile ? 0.75 : 0.5 }}
          >
            <CloseIcon fontSize={isMobile ? "medium" : "small"} sx={{ color: '#f44336' }} />
          </IconButton>
        </Box>
      );
    }

    return (
      <Box display="flex" alignItems="center" gap={1} width="100%">
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: isMobile ? '0.85rem' : '0.875rem' }}>
          {sectionNames[sectionKey]}
        </Typography>

        {/* Only show edit icon when section is expanded */}
        {isExpanded && canEdit && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleStartEditingSection(sectionKey);
            }}
            sx={{
              p: isMobile ? 0.5 : 0.25,
              ml: 'auto',
              opacity: 0.7,
              '&:hover': { opacity: 1, bgcolor: 'rgba(76, 175, 80, 0.1)' }
            }}
          >
            <EditIcon sx={{ fontSize: isMobile ? 18 : 16, color: colorPalette.primary.brightGreen }} />
          </IconButton>
        )}
      </Box>
    );
  };

  // Helper to render each section
  const renderSection = (sectionKey) => {
    const history = project?.tailoring_history || [];

    switch (sectionKey) {
      case 'personal_info':
        return (
          <PersonalInfoSection
            sectionKey={sectionKey}
            data={extractedData.personal_info}
            expanded={expandedSections[sectionKey]}
            onToggle={() => handleToggleSection(sectionKey)}
            renderSectionTitle={renderSectionTitle}
            isEditing={editingSection === 'personal_info'}
            tempData={tempSectionData}
            updateTempField={updateTempField}
          />
        );

      case 'professional_summary':
        return (
          <ProfessionalSummarySection
            sectionKey={sectionKey}
            data={extractedData.professional_summary}
            isEditing={editingSection === 'professional_summary'}
            tempData={tempSectionData}
            onTempDataChange={setTempSectionData}
            history={history}
            onViewingPreviousVersion={setViewingPreviousVersion}
            onRestoreVersion={handleRestoreVersion}
          />
        );

      case 'experience':
        return (
          <ExperienceSection
            sectionKey={sectionKey}
            data={extractedData.experience}
            isEditing={editingSection === 'experience'}
            tempData={tempSectionData}
            updateTempField={updateTempField}
            history={history}
            onViewingPreviousVersion={setViewingPreviousVersion}
            onRestoreVersion={handleRestoreVersion}
          />
        );

      case 'projects':
        return (
          <ProjectsSection
            sectionKey={sectionKey}
            data={extractedData.projects}
            isEditing={editingSection === 'projects'}
            tempData={tempSectionData}
            updateTempField={updateTempField}
            history={history}
            onViewingPreviousVersion={setViewingPreviousVersion}
            onRestoreVersion={handleRestoreVersion}
          />
        );

      case 'education':
        return (
          <EducationSection
            sectionKey={sectionKey}
            data={extractedData.education}
            expanded={expandedSections[sectionKey]}
            onToggle={() => handleToggleSection(sectionKey)}
            renderSectionTitle={renderSectionTitle}
            isEditing={editingSection === 'education'}
            tempData={tempSectionData}
            updateTempField={updateTempField}
          />
        );

      case 'skills':
        return (
          <SkillsSection
            sectionKey={sectionKey}
            data={extractedData.skills}
            expanded={expandedSections[sectionKey]}
            onToggle={() => handleToggleSection(sectionKey)}
            renderSectionTitle={renderSectionTitle}
            isEditing={editingSection === 'skills'}
            tempData={tempSectionData}
            updateTempField={updateTempField}
          />
        );

      case 'certifications':
        return (
          <CertificationsSection
            sectionKey={sectionKey}
            data={extractedData.certifications}
            expanded={expandedSections[sectionKey]}
            onToggle={() => handleToggleSection(sectionKey)}
            renderSectionTitle={renderSectionTitle}
            isEditing={editingSection === 'certifications'}
            tempData={tempSectionData}
            updateTempField={updateTempField}
          />
        );

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

      {/* Action Sidebar - Desktop & Mobile Drawer */}
      <ActionSidebar
        isMobile={isMobile}
        project={project}
        documentTab={documentTab}
        onDocumentTabChange={setDocumentTab}
        uploading={uploading}
        downloading={downloading}
        tailoring={tailoring}
        extractedData={extractedData}
        onReplaceClick={() => fileInputRef.current?.click()}
        onDownloadClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
        onTailorClick={() => setJobDescDrawerOpen(true)}
        onNavigateToDashboard={() => navigate('/dashboard')}
        mobileDrawerOpen={mobileLeftDrawerOpen}
        onMobileDrawerClose={() => setMobileLeftDrawerOpen(false)}
        // Section navigation props
        sectionOrder={sectionOrder}
        sectionNames={sectionNames}
        selectedSection={selectedSection}
        onSelectedSectionChange={setSelectedSection}
        sensors={sensors}
        onDragEnd={handleDragEnd}
      />

      {/* Main Content Area - 90% width on desktop, full width on mobile */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, overflow: 'hidden', bgcolor: '#f5f7fa', position: 'relative' }}>
        {/* Document Viewer */}
        <DocumentViewer
          isMobile={isMobile}
          documentTab={documentTab}
          onDocumentTabChange={setDocumentTab}
          onLeftMenuClick={() => setMobileLeftDrawerOpen(true)}
          onRightMenuClick={() => setMobileDrawerOpen(true)}
          pdfZoom={pdfZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pendingChanges={pendingChanges}
          compiling={compiling}
          onCompile={handleCompile}
          pdfLoading={pdfLoading}
          reorderingPdf={reorderingPdf}
          pdfUrl={pdfUrl}
          onLoadPdfPreview={loadPdfPreview}
          iframeRef={iframeRef}
          coverLetter={coverLetter}
          email={email}
          project={project}
        />

        {/* Extracted Data Panel - Desktop Sidebar & Mobile Drawer */}
        <ExtractedDataPanel
          isMobile={isMobile}
          isTablet={isTablet}
          extractedData={extractedData}
          sectionNames={sectionNames}
          onSectionNameChange={(sectionKey, newName) => {
            setSectionNames(prev => ({
              ...prev,
              [sectionKey]: newName
            }));
          }}
          selectedSection={selectedSection}
          viewingPreviousVersion={viewingPreviousVersion}
          renderSection={renderSection}
          mobileDrawerOpen={mobileDrawerOpen}
          onMobileDrawerClose={() => setMobileDrawerOpen(false)}
          editingSection={editingSection}
          onStartEditingSection={handleStartEditingSection}
          onSaveSection={handleSaveSection}
          onCancelEditingSection={handleCancelEditingSection}
          width={rightSidebarWidth}
          onResizeStart={handleResizeStart}
          isResizing={isResizing}
        />
      </Box>

      {/* Agent Tailoring Full-Screen Overlay */}
      <TailoringOverlay
        tailoring={tailoring}
        agentMessages={agentMessages}
        messagesEndRef={messagesEndRef}
      />

      {/* Job Description Drawer */}
      <JobDescriptionDrawer
        open={jobDescDrawerOpen}
        onClose={() => setJobDescDrawerOpen(false)}
        jobDescription={jobDescription}
        onJobDescriptionChange={setJobDescription}
        tailoring={tailoring}
        extractedData={extractedData}
        onTailorResume={handleTailorResume}
        messageHistory={project?.message_history || []}
      />

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
