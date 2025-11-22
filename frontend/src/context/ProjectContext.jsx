import { createContext, useContext, useState, useCallback } from 'react';
import projectService from '../services/projectService';

const ProjectContext = createContext();

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasFetched, setHasFetched] = useState(false);

  // Fetch all projects (only if not already fetched)
  const fetchProjects = useCallback(async (force = false) => {
    // If already fetched and not forcing, return cached data immediately
    if (hasFetched && !force) {
      // Data already in cache, no loading needed
      return projects;
    }

    // Only set loading if we're actually fetching
    setLoading(true);
    setError('');

    try {
      const data = await projectService.getAllProjects();
      setProjects(data);
      setHasFetched(true);
      return data;
    } catch (err) {
      setError('Failed to load projects');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hasFetched, projects]);

  // Add a new project to the cache
  const addProject = useCallback((newProject) => {
    setProjects(prev => [newProject, ...prev]);
  }, []);

  // Update a project in the cache
  const updateProject = useCallback((projectId, updatedData) => {
    setProjects(prev =>
      prev.map(p => p.id === projectId ? { ...p, ...updatedData } : p)
    );
  }, []);

  // Delete a project from the cache
  const deleteProject = useCallback(async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err) {
      throw err;
    }
  }, []);

  // Refresh projects (force fetch)
  const refreshProjects = useCallback(() => {
    return fetchProjects(true);
  }, [fetchProjects]);

  // Clear cache (useful for logout)
  const clearCache = useCallback(() => {
    setProjects([]);
    setHasFetched(false);
    setError('');
  }, []);

  const value = {
    projects,
    loading,
    error,
    hasFetched,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
    refreshProjects,
    clearCache,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
