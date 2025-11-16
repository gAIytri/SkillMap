import api from './api';

const projectService = {
  // Get all projects
  getAllProjects: async () => {
    const response = await api.get('/api/projects');
    return response.data;
  },

  // Create new project
  createProject: async (projectData) => {
    const response = await api.post('/api/projects', projectData);
    return response.data;
  },

  // Get project by ID
  getProject: async (projectId) => {
    const response = await api.get(`/api/projects/${projectId}`);
    return response.data;
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    const response = await api.put(`/api/projects/${projectId}`, projectData);
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId) => {
    const response = await api.delete(`/api/projects/${projectId}`);
    return response.data;
  },

  // Download project PDF
  downloadProjectPDF: async (projectId) => {
    const response = await api.get(`/api/projects/${projectId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download project DOCX
  downloadProjectDOCX: async (projectId) => {
    const response = await api.get(`/api/projects/${projectId}/docx`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Update section order
  updateSectionOrder: async (projectId, sectionOrder) => {
    const response = await api.put(`/api/projects/${projectId}/section-order`, {
      section_order: sectionOrder,
    });
    return response.data;
  },
};

export default projectService;
