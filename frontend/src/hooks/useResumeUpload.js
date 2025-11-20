import { useRef } from 'react';
import toast from 'react-hot-toast';
import resumeService from '../services/resumeService';
import projectService from '../services/projectService';

export const useResumeUpload = ({
  projectId,
  jobDescription,
  setUploading,
  setError,
  setExtractedData,
  loadPdfPreview,
  fileInputRef,
}) => {
  const abortControllerRef = useRef(null);

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

  return { handleResumeUpload, abortControllerRef };
};
