import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Checkbox,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { colorPalette } from '../styles/theme';
import projectService from '../services/projectService';
import resumeService from '../services/resumeService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useProjects } from '../context/ProjectContext';

const Dashboard = () => {
  // Use ProjectContext for cached project data
  const {
    projects,
    loading: projectsLoading,
    fetchProjects,
    deleteProject: deleteProjectFromCache,
    addProject,
  } = useProjects();

  const [localError, setLocalError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    project_name: '',
    job_description: '',
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [creating, setCreating] = useState(false); // Track project creation state
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Load projects from cache (or fetch if not cached)
    const loadDashboard = async () => {
      try {
        // Fetch projects (uses cache if already fetched)
        await fetchProjects();
      } catch (err) {
        setLocalError('Failed to load dashboard. Please try again.');
      }
    };

    loadDashboard();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    // Prevent multiple clicks
    if (creating) {
      return;
    }

    if (!newProjectData.project_name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setCreating(true);

    // Check if user has a base resume
    try {
      const baseResume = await resumeService.getBaseResume();

      // If no base resume, redirect to upload page
      if (!baseResume || !baseResume.id) {
        toast.error('Please upload your base resume first');
        setOpenCreateDialog(false);
        setCreating(false);
        navigate('/upload-resume');
        return;
      }
    } catch (err) {
      // If 404 or any error, user doesn't have base resume
      toast.error('Please upload your base resume first');
      setOpenCreateDialog(false);
      setCreating(false);
      navigate('/upload-resume');
      return;
    }

    // Create project if base resume exists
    try {
      const newProject = await projectService.createProject(newProjectData);
      // Add the new project to cache immediately
      addProject(newProject);
      setOpenCreateDialog(false);
      setNewProjectData({ project_name: '', job_description: '' });
      navigate(`/project/${newProject.id}`);
    } catch (err) {
      toast.error('Failed to create project. Please try again.');
      setCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProjectFromCache(projectToDelete);
      setDeleteConfirmOpen(false);
    } catch (err) {
      toast.error('Failed to delete project. Please try again.');
    } finally {
      setProjectToDelete(null);
    }
  };

  const openDeleteConfirm = (projectId) => {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedProjects([]); // Clear selections when toggling mode
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAllProjects = () => {
    if (selectedProjects.length === filteredProjects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(filteredProjects.map((p) => p.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedProjects.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      // Delete all selected projects
      await Promise.all(
        selectedProjects.map((projectId) => deleteProjectFromCache(projectId))
      );
      setSelectedProjects([]);
      setSelectionMode(false);
      setShowBulkDeleteConfirm(false);
      toast.success(`Successfully deleted ${selectedProjects.length} project(s)`);
    } catch (err) {
      toast.error('Failed to delete some projects. Please try again.');
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth={false} sx={{ py: isMobile ? 2 : 4, px: isMobile ? 2 : 3, maxWidth: '100%' }}>
      {/* Header */}
      <Box
        display="flex"
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={isMobile ? 'stretch' : 'center'}
        mb={isMobile ? 2 : 3}
        gap={isMobile ? 2 : 0}
      >
        <Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} color={colorPalette.primary.darkGreen}>
              Your Projects
            </Typography>
            {/* <InfoOutlinedIcon
              sx={{
                fontSize: 20,
                color: colorPalette.secondary.mediumGreen,
                cursor: 'help',
              }}
              titleAccess="Each project tailors your resume for a specific job, including a cover letter and email"
            /> */}
          </Box>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Each project creates a tailored resume, cover letter, and email for a specific job
          </Typography>
        </Box>
        <Box display="flex" gap={2} flexDirection={isMobile ? 'column' : 'row'}>
          {filteredProjects.length > 0 && (
            <Button
              variant={selectionMode ? 'contained' : 'outlined'}
              startIcon={selectionMode ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
              onClick={toggleSelectionMode}
              size={isMobile ? 'medium' : 'large'}
              sx={{
                borderColor: colorPalette.primary.darkGreen,
                color: selectionMode ? '#fff' : colorPalette.primary.darkGreen,
                bgcolor: selectionMode ? colorPalette.primary.darkGreen : 'transparent',
                '&:hover': {
                  bgcolor: selectionMode ? colorPalette.secondary.mediumGreen : 'rgba(0,0,0,0.05)',
                  borderColor: colorPalette.secondary.mediumGreen,
                },
              }}
            >
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            size={isMobile ? 'medium' : 'large'}
            sx={{
              bgcolor: colorPalette.primary.brightGreen,
              whiteSpace: 'nowrap',
              '&:hover': {
                bgcolor: colorPalette.secondary.mediumGreen,
              },
            }}
          >
            New Project
          </Button>
        </Box>
      </Box>

      {localError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {localError}
        </Alert>
      )}

      {/* Bulk Action Bar */}
      {selectionMode && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: colorPalette.secondary.lightGreen,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Checkbox
              checked={selectedProjects.length === filteredProjects.length && filteredProjects.length > 0}
              indeterminate={selectedProjects.length > 0 && selectedProjects.length < filteredProjects.length}
              onChange={selectAllProjects}
              sx={{
                color: colorPalette.primary.darkGreen,
                '&.Mui-checked': { color: colorPalette.primary.darkGreen },
              }}
            />
            <Typography variant="body2" fontWeight={600}>
              {selectedProjects.length === 0
                ? 'Select projects'
                : `${selectedProjects.length} project(s) selected`}
            </Typography>
          </Box>
          {selectedProjects.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleBulkDelete}
              size="medium"
            >
              Delete Selected
            </Button>
          )}
        </Box>
      )}

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {/* Projects Grid */}
      {projectsLoading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="300px"
        >
          <CircularProgress />
        </Box>
      ) : filteredProjects.length === 0 ? (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="300px"
          textAlign="center"
        >
          <DescriptionIcon
            sx={{ fontSize: 80, color: colorPalette.secondary.mediumGreen, mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary" mb={1}>
            {projects.length === 0 ? 'No projects yet' : 'No projects found'}
          </Typography>

          {projects.length === 0 ? (
            // Empty state with helpful info
            <Box maxWidth="600px" mx="auto">
              <Alert
                severity="info"
                icon={<InfoOutlinedIcon />}
                sx={{
                  mb: 3,
                  textAlign: 'left',
                  bgcolor: "#f4f4f4",
                  border: `1px solid ${colorPalette.secondary.mediumGreen}`,
                }}
              >
                <Typography variant="body2" fontWeight={600} mb={1}>
                  What is a Project?
                </Typography>
                <Typography variant="body2" component="div">
                  A project helps you tailor your resume for a specific job application. Each project includes:
                  <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                    <li>AI-tailored resume for the job</li>
                    <li>Custom cover letter</li>
                    <li>Professional email draft</li>
                    <li>Version history of all changes</li>
                  </Box>
                </Typography>
              </Alert>
           
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" mb={3}>
              Try a different search term
            </Typography>
          )}
         `
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                onClick={() => {
                  if (selectionMode) {
                    toggleProjectSelection(project.id);
                  } else {
                    navigate(`/project/${project.id}`);
                  }
                }}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: selectionMode && selectedProjects.includes(project.id)
                    ? `2px solid ${colorPalette.primary.brightGreen}`
                    : '1px solid rgba(0, 0, 0, 0.12)',
                  bgcolor: selectionMode && selectedProjects.includes(project.id)
                    ? colorPalette.secondary.lightGreen
                    : 'white',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="flex-start" gap={1}>
                    {selectionMode && (
                      <Checkbox
                        checked={selectedProjects.includes(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        onClick={(e) => e.stopPropagation()}
                        sx={{
                          p: 0,
                          color: colorPalette.primary.darkGreen,
                          '&.Mui-checked': { color: colorPalette.primary.brightGreen },
                        }}
                      />
                    )}
                    <Box flex={1}>
                      <Typography
                        variant="h6"
                        fontWeight={600}
                        gutterBottom
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {project.project_name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {project.job_description || 'No job description provided'}
                      </Typography>
                      <Chip
                        label={new Date(project.updated_at).toLocaleDateString()}
                        size="small"
                        sx={{
                          bgcolor: colorPalette.secondary.lightGreen,
                          color: colorPalette.primary.darkGreen,
                        }}
                      />
                    </Box>
                  </Box>
                </CardContent>
                {!selectionMode && (
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click when deleting
                        openDeleteConfirm(project.id);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Project Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => {
          if (!creating) {
            setOpenCreateDialog(false);
            setCreating(false);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={600}>
            Create New Project
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Project Name"
            value={newProjectData.project_name}
            onChange={(e) =>
              setNewProjectData({ ...newProjectData, project_name: e.target.value })
            }
            margin="normal"
            required
            autoFocus
            placeholder="e.g., Frontend Developer at Google"
          />
          <TextField
            fullWidth
            label="Job Description (Optional)"
            value={newProjectData.job_description}
            onChange={(e) =>
              setNewProjectData({ ...newProjectData, job_description: e.target.value })
            }
            margin="normal"
            multiline
            rows={4}
            placeholder="Paste the job description here..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setOpenCreateDialog(false);
              setCreating(false);
            }}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            disabled={creating}
            startIcon={creating ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : null}
            sx={{
              bgcolor: colorPalette.primary.brightGreen,
              '&:hover': {
                bgcolor: colorPalette.secondary.mediumGreen,
              },
              '&.Mui-disabled': {
                bgcolor: colorPalette.secondary.mediumGreen,
                color: '#fff',
                opacity: 0.7,
              },
            }}
          >
            {creating ? 'Creating...' : 'Create Project'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="error"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Projects"
        message={`Are you sure you want to delete ${selectedProjects.length} project(s)? This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        confirmColor="error"
      />
    </Container>
  );
};

export default Dashboard;