import api from './api';

const resumeService = {
  // Upload and convert DOCX to LaTeX
  uploadResume: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Save as base resume
  saveBaseResume: async (data) => {
    const response = await api.post('/api/resumes/base', {
      latex_content: data.latex_content,
      doc_metadata: data.doc_metadata,
      original_filename: data.original_filename,
    });
    return response.data;
  },

  // Get base resume
  getBaseResume: async () => {
    const response = await api.get('/api/resumes/base');
    return response.data;
  },

  // Update base resume
  updateBaseResume: async (data) => {
    const response = await api.put('/api/resumes/base', data);
    return response.data;
  },

  // Delete base resume
  deleteBaseResume: async () => {
    const response = await api.delete('/api/resumes/base');
    return response.data;
  },

  // Download base resume PDF
  downloadBaseResumePDF: async () => {
    const response = await api.get('/api/resumes/base/pdf', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Download recreated DOCX from JSON
  downloadRecreatedDOCX: async () => {
    const response = await api.get('/api/resumes/base/recreated-docx', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Tailor resume for job description (base resume)
  tailorResume: async (jobDescription) => {
    const response = await api.post('/api/resumes/base/tailor', {
      job_description: jobDescription,
    });
    return response.data;
  },

  // Tailor project resume for job description
  tailorProjectResume: async (projectId, jobDescription) => {
    const response = await api.post(`/api/projects/${projectId}/tailor`, {
      job_description: jobDescription,
    });
    return response.data;
  },
};

export default resumeService;
