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

  // Tailor project resume with Agent (Streaming with progress updates)
  tailorProjectResumeWithAgent: async (projectId, jobDescription, onMessage) => {
    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    console.log('Tailoring with agent:', { projectId, hasToken: !!token, baseURL });

    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const response = await fetch(`${baseURL}/api/projects/${projectId}/tailor-with-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_description: jobDescription }),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('access_token');
        throw new Error('Session expired. Please login again.');
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to tailor resume (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines to get individual SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Call the onMessage callback with the update
              if (onMessage) {
                onMessage(data);
              }

              // Store final result
              if (data.type === 'final') {
                finalResult = data;
              }
            } catch (e) {
              console.error('Failed to parse SSE message:', e);
            }
          }
        }
      }

      return finalResult;
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    }
  },
};

export default resumeService;
