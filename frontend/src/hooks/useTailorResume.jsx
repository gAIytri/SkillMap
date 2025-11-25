import { useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import resumeService from '../services/resumeService';
import projectService from '../services/projectService';

export const useTailorResume = ({
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
  loadPdfPreview,
  setCoverLetter,
  setEmail,
  setRechargeDialogBlocking,
  setShowRechargeDialog,
  setJobDescription,
  setDocumentTab,
  loadProject, // Add this to refresh project data
}) => {
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const handleTailorResume = async (overrideJobDescription) => {
    // Use override if provided, otherwise use the state jobDescription
    const jdToUse = overrideJobDescription !== undefined ? overrideJobDescription : jobDescription;

    if (!jdToUse || jdToUse.trim().length < 10) {
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

    // Auto-switch to Resume tab
    setDocumentTab(0);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Call agent-based tailoring with streaming updates
      const finalResult = await resumeService.tailorProjectResumeWithAgent(
        projectId,
        jdToUse,
        (message) => {
          // This callback is called for each SSE message
          console.log('Agent message:', message);

          // Handle granular completion events
          if (message.type === 'resume_complete') {
            console.log('✓ Resume tailoring completed!');
            console.log('Tailored JSON received:', message.tailored_json ? 'YES' : 'NO');
            console.log('Changes made:', message.changes_made);

            // Update resume data immediately (visible in extracted data panel)
            setExtractedData(message.tailored_json);

            // DON'T hide spinner yet - wait for cover letter and email
          } else if (message.type === 'cover_letter_complete') {
            console.log('✓ Cover letter generated!');
            setCoverLetter(message.cover_letter);

            // DON'T hide spinner yet - wait for email
          } else if (message.type === 'email_complete') {
            console.log('✓ Email generated!');
            setEmail({
              subject: message.email_subject,
              body: message.email_body,
            });

            // DON'T hide spinner yet - will be hidden in finally block
          }

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

      // Handle final result - now we've already handled resume/cover letter/email in streaming
      if (finalResult && finalResult.success) {
        // All 3 documents are complete - now load PDF preview
        loadPdfPreview();

        // Refresh user data to update credits in navbar
        let updatedUser = user;
        if (refreshUser) {
          const freshUser = await refreshUser();
          if (freshUser) {
            updatedUser = freshUser;
          }
        }

        // Refresh project data to get updated message_history
        if (loadProject) {
          await loadProject();
          console.log('✓ Project data refreshed (message_history updated)');
        }

        // Check if low credits warning should be shown (non-blocking)
        if (updatedUser && updatedUser.credits < 10.0) {
          setRechargeDialogBlocking(false);
          setShowRechargeDialog(true);
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

  return { handleTailorResume, abortControllerRef };
};
