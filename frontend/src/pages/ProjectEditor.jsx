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
import ConfirmDialog from '../components/common/ConfirmDialog';
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
import CustomSection from '../components/project-editor/CustomSection';
import SectionTemplateModal from '../components/project-editor/SectionTemplateModal';
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
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false); // Separate loading for cover letter
  const [generatingEmail, setGeneratingEmail] = useState(false); // Separate loading for email
  const [restoringVersion, setRestoringVersion] = useState(false); // Loading state for version restoration
  const [agentMessages, setAgentMessages] = useState([]); // Agent progress messages
  const [showRechargeDialog, setShowRechargeDialog] = useState(false);
  const [rechargeDialogBlocking, setRechargeDialogBlocking] = useState(false);
  const [showReplaceConfirmDialog, setShowReplaceConfirmDialog] = useState(false); // Confirmation dialog for replacing resume
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
  const [originalSectionName, setOriginalSectionName] = useState(null); // Track original section name before editing

  // Track which version is being viewed for each section
  const [viewingVersions, setViewingVersions] = useState({
    professional_summary: null, // null means viewing current
    experience: null,
    projects: null,
    skills: null,
  });

  const [selectedSection, setSelectedSection] = useState('personal_info'); // Currently selected section tab (default: personal_info)
  const [viewingPreviousVersion, setViewingPreviousVersion] = useState(false); // Track if user is viewing a previous version
  const [sectionTemplateModalOpen, setSectionTemplateModalOpen] = useState(false); // Control custom section template modal
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
  const loadProject = async (skipPdfLoad = false) => {
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

      // Load cover letter if exists
      if (projectData.cover_letter_text) {
        setCoverLetter(projectData.cover_letter_text);
        console.log('✓ Cover letter loaded from project');
      }

      // Load email if exists
      if (projectData.email_body_text) {
        setEmail({
          subject: `Application for ${projectData.job_description?.split('\n')[0] || 'Position'}`,
          body: projectData.email_body_text
        });
        console.log('✓ Email loaded from project');
      }

      setLoading(false);

      // Load PDF preview (skip if requested, e.g., after tailoring when PDF is already loaded)
      if (!skipPdfLoad) {
        await loadPdfPreview();
      }
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
    setPdfUrl, // NEW: Set PDF directly from tailoring (no need to loadPdfPreview)
    setCoverLetter,
    setEmail,
    setGeneratingCoverLetter, // NEW: Separate loading state for cover letter
    setGeneratingEmail, // NEW: Separate loading state for email
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

  // Initialize viewing versions with current versions when project loads
  useEffect(() => {
    if (project?.current_versions) {
      setViewingVersions({
        professional_summary: project.current_versions.professional_summary || 0,
        experience: project.current_versions.experience || 0,
        projects: project.current_versions.projects || 0,
        skills: project.current_versions.skills || 0,
      });
    }
  }, [project?.current_versions]);

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
    console.log('🎯 Starting to edit section:', sectionKey);
    console.log('📊 Current extractedData:', extractedData);

    // If user is viewing an old version, switch to current version before editing
    const sectionsWithVersioning = ['professional_summary', 'experience', 'projects', 'skills'];
    if (sectionsWithVersioning.includes(sectionKey)) {
      const currentVersionNum = project?.current_versions?.[sectionKey] || 0;
      const viewingVersionNum = viewingVersions[sectionKey];

      if (viewingVersionNum !== currentVersionNum) {
        // Switch to current version
        setViewingVersions(prev => ({ ...prev, [sectionKey]: currentVersionNum }));
        console.log(`🔄 Switched from V${viewingVersionNum} to current V${currentVersionNum} before editing`);
      }
    }

    setEditingSection(sectionKey);
    // Save the original section name so we can restore it if user cancels
    setOriginalSectionName(sectionNames[sectionKey]);

    // Copy the entire section data for editing
    if (sectionKey === 'personal_info') {
      const personalInfo = extractedData?.personal_info || {};
      console.log('👤 Personal info data:', personalInfo);
      const deepCopy = JSON.parse(JSON.stringify(personalInfo));
      console.log('📋 Deep copy result:', deepCopy);
      setTempSectionData(deepCopy); // Deep copy
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
    } else if (sectionKey.startsWith('custom_')) {
      // Handle custom sections
      const customSections = extractedData.custom_sections || [];
      const customSection = customSections.find(s => s.id === sectionKey);
      if (customSection) {
        setTempSectionData(JSON.parse(JSON.stringify(customSection)));
      }
    }
  };

  const handleSaveSection = () => {
    if (!editingSection) return;

    // Validation for personal_info: Name is required
    if (editingSection === 'personal_info') {
      if (!tempSectionData?.name || !tempSectionData.name.trim()) {
        toast.error('Name is required and cannot be empty');
        return; // Don't save
      }
    }

    // Validation for projects: Require at least one non-empty bullet point
    if (editingSection === 'projects' && Array.isArray(tempSectionData)) {
      for (const project of tempSectionData) {
        // Check if project has at least one non-empty bullet point
        const bullets = project.bullets || (project.description ? project.description.split(/[.\n]/).filter(b => b.trim()) : []);
        const hasValidBullet = bullets.some(b => b && b.trim().length > 0);

        if (!hasValidBullet) {
          toast.error(`Project "${project.name || 'Untitled'}" must have at least one bullet point`);
          return; // Don't save
        }
      }
    }

    // Validation for experience: Require title, company, location, start_date, and at least one bullet point
    if (editingSection === 'experience' && Array.isArray(tempSectionData)) {
      for (const exp of tempSectionData) {
        // Check required fields
        if (!exp.title || !exp.title.trim()) {
          toast.error('Job Title is required for all experience entries');
          return; // Don't save
        }
        if (!exp.company || !exp.company.trim()) {
          toast.error(`Company is required for "${exp.title}"`);
          return; // Don't save
        }
        if (!exp.start_date || !exp.start_date.trim()) {
          toast.error(`Start Date is required for "${exp.title}" at ${exp.company}`);
          return; // Don't save
        }
        if (!exp.location || !exp.location.trim()) {
          toast.error(`Location is required for "${exp.title}" at ${exp.company}`);
          return; // Don't save
        }

        // Check if experience has at least one non-empty bullet point
        const bullets = exp.bullets || [];
        const hasValidBullet = bullets.some(b => b && b.trim().length > 0);

        if (!hasValidBullet) {
          toast.error(`"${exp.title}" at ${exp.company} must have at least one bullet point`);
          return; // Don't save
        }

        // Auto-fill end_date with "Present" if empty
        if (!exp.end_date || !exp.end_date.trim()) {
          exp.end_date = 'Present';
        }
      }
    }

    // Validation for skills: Each category must have a name and at least one skill
    if (editingSection === 'skills' && Array.isArray(tempSectionData)) {
      for (const skillCategory of tempSectionData) {
        const category = skillCategory.category || '';
        const skills = skillCategory.skills || [];

        // Check if category name is empty
        if (!category.trim()) {
          toast.error('Category name cannot be empty. Please provide a name or remove the category.');
          return; // Don't save
        }

        // Check if category has at least one skill
        const hasValidSkill = skills.some(s => s && s.trim().length > 0);
        if (!hasValidSkill) {
          toast.error(`Category "${category}" must have at least one skill. Please add a skill or remove the category.`);
          return; // Don't save
        }
      }
    }

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

    // Handle custom sections differently
    if (editingSection.startsWith('custom_')) {
      const customSections = updatedData.custom_sections || [];
      const sectionIndex = customSections.findIndex(s => s.id === editingSection);

      if (sectionIndex !== -1) {
        customSections[sectionIndex] = {
          ...customSections[sectionIndex],
          ...tempSectionData
        };
        updatedData.custom_sections = customSections;
      }
    } else {
      updatedData[editingSection] = dataToSave;
    }
    // Section names are already updated in state via the TextField onChange

    setExtractedData(updatedData);
    setEditingSection(null);
    setTempSectionData(null);
    setOriginalSectionName(null); // Clear original name on save
    setPendingChanges(true);
  };

  const handleCancelEditingSection = () => {
    // Restore original section name if it was being edited
    if (editingSection && originalSectionName !== null) {
      setSectionNames(prev => ({
        ...prev,
        [editingSection]: originalSectionName
      }));
    }

    setEditingSection(null);
    setTempSectionData(null);
    setOriginalSectionName(null);
  };

  // Restore a previous version
  const handleRestoreVersion = async (sectionName, versionNumber) => {
    setRestoringVersion(true);
    try {
      // Call the new backend API endpoint
      const response = await api.post(
        `/api/projects/${projectId}/restore-version`,
        null,
        {
          params: {
            section_name: sectionName,
            version_number: versionNumber
          }
        }
      );

      // Update local state with the restored project data
      const updatedProject = response.data;
      setProject(updatedProject);
      setExtractedData(updatedProject.resume_json);

      // Mark as having pending changes (user needs to click Compile)
      setPendingChanges(true);
      toast.success('Version restored. Click "Compile" to see changes in PDF.');
    } catch (error) {
      console.error('Failed to restore version:', error);
      toast.error('Failed to restore version');
    } finally {
      setRestoringVersion(false);
    }
  };

  // Handle replace resume with confirmation
  const handleReplaceConfirm = async () => {
    try {
      // Clear version history from backend
      await api.post(`/api/projects/${projectId}/clear-version-history`);

      // Reset local viewing versions to 0
      setViewingVersions({
        professional_summary: 0,
        experience: 0,
        projects: 0,
        skills: 0,
      });

      // Close dialog and trigger file input
      setShowReplaceConfirmDialog(false);
      fileInputRef.current?.click();
    } catch (error) {
      console.error('Failed to clear version history:', error);
      toast.error('Failed to prepare for replacement. Please try again.');
      setShowReplaceConfirmDialog(false);
    }
  };

  // Helper to update temp section data
  const updateTempField = (index, field, value) => {
    console.log('🔄 updateTempField called:', { index, field, value });

    // Use functional update to avoid stale closure issues
    setTempSectionData(prevData => {
      console.log('📦 Previous data in updater:', prevData);

      // If index is null and field is provided, update object field (for PersonalInfo)
      // This must come BEFORE the array check, because the value might be an array being set as a field
      if (index === null && field && typeof prevData === 'object' && !Array.isArray(prevData)) {
        const result = { ...prevData, [field]: value };
        console.log('✅ Updating object field. Result:', result);
        return result;
      }

      // If index is null and value is an array, replace entire array (for add/delete operations)
      // This is for sections that ARE arrays (like experience, projects)
      if (index === null && Array.isArray(value)) {
        console.log('✅ Replacing entire array');
        return value;
      }

      // Handle array updates (for experience, projects, etc.)
      if (Array.isArray(prevData)) {
        const updated = [...prevData];
        if (field) {
          updated[index] = { ...updated[index], [field]: value };
        } else {
          updated[index] = value;
        }
        console.log('✅ Updating array. Result:', updated);
        return updated;
      }

      // Fallback: replace entire value
      console.log('✅ Fallback: replacing entire value');
      return value;
    });
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

  // Handle adding custom section
  const handleAddCustomSection = () => {
    setSectionTemplateModalOpen(true);
  };

  // Handle template selection and create new section
  const handleSelectTemplate = (template) => {
    // Generate unique section ID
    const customSectionId = `custom_${Date.now()}`;

    // Add to extractedData.custom_sections
    const updatedExtractedData = {
      ...extractedData,
      custom_sections: [
        ...(extractedData.custom_sections || []),
        {
          id: customSectionId,
          name: 'New Section',
          ...template.structure
        }
      ]
    };

    // Add to section order (after certifications, before the end)
    const newSectionOrder = [...sectionOrder, customSectionId];

    // Add to section names
    const newSectionNames = {
      ...sectionNames,
      [customSectionId]: 'New Section'
    };

    setExtractedData(updatedExtractedData);
    setSectionOrder(newSectionOrder);
    setSectionNames(newSectionNames);
    setPendingChanges(true);

    // Auto-select and expand the new section
    setSelectedSection(customSectionId);
    setExpandedSections(prev => ({
      ...prev,
      [customSectionId]: true
    }));

    toast.success('Custom section added! Click "Compile PDF" to see changes.');
  };

  // Handle deleting custom section
  const handleDeleteSection = (sectionId) => {
    // Show confirmation toast
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${sectionNames[sectionId]}"? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    // Remove from custom_sections array
    const updatedCustomSections = (extractedData.custom_sections || []).filter(
      section => section.id !== sectionId
    );

    // Remove from section order
    const updatedSectionOrder = sectionOrder.filter(key => key !== sectionId);

    // Remove from section names
    const updatedSectionNames = { ...sectionNames };
    delete updatedSectionNames[sectionId];

    // Update state
    setExtractedData({
      ...extractedData,
      custom_sections: updatedCustomSections
    });
    setSectionOrder(updatedSectionOrder);
    setSectionNames(updatedSectionNames);
    setPendingChanges(true);

    // If deleted section was selected, switch to first section
    if (selectedSection === sectionId) {
      setSelectedSection(updatedSectionOrder[0] || 'personal_info');
    }

    toast.success('Section deleted. Click "Compile PDF" to update.');
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

        {/* Only show edit icon when section is expanded and on current version */}
        {isExpanded && canEdit && (() => {
          // Check if this section has version history and if user is viewing non-current version
          const sectionsWithHistory = ['professional_summary', 'experience', 'projects', 'skills'];
          if (sectionsWithHistory.includes(sectionKey)) {
            const currentVersion = project?.current_versions?.[sectionKey] || 0;
            const viewingVersion = viewingVersions[sectionKey];
            // Hide edit icon if viewing a version different from current
            if (viewingVersion !== null && viewingVersion !== currentVersion) {
              return null;
            }
          }
          // Show edit icon for all other cases
          return (
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
          );
        })()}
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
            versionHistory={project?.version_history?.professional_summary || {}}
            currentVersion={project?.current_versions?.professional_summary || 0}
            onRestoreVersion={(versionNumber) => handleRestoreVersion('professional_summary', versionNumber)}
            onViewingVersionChange={(versionNumber) => {
              setViewingVersions(prev => ({ ...prev, professional_summary: versionNumber }));
            }}
            restoringVersion={restoringVersion}
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
            versionHistory={project?.version_history?.experience || {}}
            currentVersion={project?.current_versions?.experience || 0}
            onRestoreVersion={(versionNumber) => handleRestoreVersion('experience', versionNumber)}
            onViewingVersionChange={(versionNumber) => {
              setViewingVersions(prev => ({ ...prev, experience: versionNumber }));
            }}
            restoringVersion={restoringVersion}
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
            versionHistory={project?.version_history?.projects || {}}
            currentVersion={project?.current_versions?.projects || 0}
            onRestoreVersion={(versionNumber) => handleRestoreVersion('projects', versionNumber)}
            onViewingVersionChange={(versionNumber) => {
              setViewingVersions(prev => ({ ...prev, projects: versionNumber }));
            }}
            restoringVersion={restoringVersion}
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
            versionHistory={project?.version_history?.skills || {}}
            currentVersion={project?.current_versions?.skills || 0}
            onRestoreVersion={(versionNumber) => handleRestoreVersion('skills', versionNumber)}
            onViewingVersionChange={(versionNumber) => {
              setViewingVersions(prev => ({ ...prev, skills: versionNumber }));
            }}
            restoringVersion={restoringVersion}
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
        // Handle custom sections
        if (sectionKey.startsWith('custom_')) {
          const customSections = extractedData.custom_sections || [];
          const customSection = customSections.find(section => section.id === sectionKey);

          if (!customSection) return null;

          return (
            <CustomSection
              sectionKey={sectionKey}
              sectionName={sectionNames[sectionKey] || 'New Section'}
              customSection={customSection}
              isEditing={editingSection === sectionKey}
              tempData={tempSectionData}
              updateTempField={updateTempField}
            />
          );
        }
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
        onReplaceClick={() => setShowReplaceConfirmDialog(true)}
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
        // Custom section props
        onAddCustomSection={handleAddCustomSection}
        onDeleteSection={handleDeleteSection}
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
          tailoring={tailoring}
          generatingCoverLetter={generatingCoverLetter}
          generatingEmail={generatingEmail}
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

      {/* Replace Resume Confirmation Dialog */}
      <ConfirmDialog
        open={showReplaceConfirmDialog}
        onClose={() => setShowReplaceConfirmDialog(false)}
        onConfirm={handleReplaceConfirm}
        title="Replace Resume"
        message="Replacing your resume will clear all version history for this project. This will make it a fresh project with no previous versions. Are you sure you want to continue?"
        confirmText="Yes, Replace"
        cancelText="Cancel"
        confirmColor="warning"
      />

      {/* Section Template Modal */}
      <SectionTemplateModal
        open={sectionTemplateModalOpen}
        onClose={() => setSectionTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </Box>
  );
};

export default ProjectEditor;
