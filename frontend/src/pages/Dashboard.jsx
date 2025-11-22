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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
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
    if (!newProjectData.project_name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    try {
      const newProject = await projectService.createProject(newProjectData);
      setOpenCreateDialog(false);
      setNewProjectData({ project_name: '', job_description: '' });
      toast.success('Project created successfully!');
      navigate(`/project/${newProject.id}`);
    } catch (err) {
      toast.error('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    const toastId = toast.loading('Deleting project...');
    try {
      await deleteProjectFromCache(projectToDelete);
      toast.success('Project deleted successfully!', { id: toastId });
      setDeleteConfirmOpen(false);
    } catch (err) {
      toast.error('Failed to delete project. Please try again.', { id: toastId });
    } finally {
      setProjectToDelete(null);
    }
  };

  const openDeleteConfirm = (projectId) => {
    setProjectToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const filteredProjects = projects.filter((project) =>
    project.project_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ py: isMobile ? 2 : 4, px: isMobile ? 2 : 3 }}>
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
          <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={700} color={colorPalette.primary.darkGreen}>
            Your Projects
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            Manage your tailored resumes for different job applications
          </Typography>
        </Box>
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

      {localError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {localError}
        </Alert>
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
          <Typography variant="body2" color="text.secondary" mb={3}>
            {projects.length === 0
              ? 'Create your first project to start tailoring resumes'
              : 'Try a different search term'}
          </Typography>
          {projects.length === 0 && (
            <Alert
              severity="success"
              sx={{
                mb: 3,
                maxWidth: isMobile ? '100%' : '500px',
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.3)',
              }}
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Welcome! You've received 100 free credits to get started!
              </Typography>
              <Typography variant="caption">
                Each resume tailoring costs 5 credits. That's 20 tailored resumes to help you land your dream job!
              </Typography>
            </Alert>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map((project) => (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
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
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/project/${project.id}`)}
                    sx={{ color: colorPalette.primary.brightGreen }}
                  >
                    Edit
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => openDeleteConfirm(project.id)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Project Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
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
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateProject}
            sx={{ bgcolor: colorPalette.primary.brightGreen }}
          >
            Create Project
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
    </Container>
  );
};

export default Dashboard;