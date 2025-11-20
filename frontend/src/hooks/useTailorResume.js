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
}) => {
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const handleTailorResume = async () => {
    if (!jobDescription || jobDescription.trim().length < 10) {
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

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Call agent-based tailoring with streaming updates
      const finalResult = await resumeService.tailorProjectResumeWithAgent(
        projectId,
        jobDescription,
        (message) => {
          // This callback is called for each SSE message
          console.log('Agent message:', message);

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

      // Handle final result
      if (finalResult && finalResult.success && finalResult.tailored_json) {
        // Update extracted data with tailored JSON
        setExtractedData(finalResult.tailored_json);

        // Reload PDF preview to show tailored version
        await loadPdfPreview();

        // Fetch cover letter and email if generated
        try {
          const [coverLetterData, emailData] = await Promise.all([
            projectService.getCoverLetter(projectId).catch(() => null),
            projectService.getEmail(projectId).catch(() => null),
          ]);

          if (coverLetterData && coverLetterData.success) {
            setCoverLetter(coverLetterData.cover_letter);
            console.log('✓ Cover letter loaded');
          }

          if (emailData && emailData.success) {
            setEmail({
              subject: emailData.email_subject,
              body: emailData.email_body,
            });
            console.log('✓ Email loaded');
          }
        } catch (err) {
          console.warn('Failed to load cover letter/email:', err);
          // Don't fail the whole operation if these fail
        }

        // Refresh user data to update credits in navbar
        let updatedUser = user;
        if (refreshUser) {
          const freshUser = await refreshUser();
          if (freshUser) {
            updatedUser = freshUser;
          }
        }

        // Check if low credits warning should be shown (non-blocking)
        if (updatedUser && updatedUser.credits < 10.0) {
          setRechargeDialogBlocking(false);
          setShowRechargeDialog(true);
        }

        // Show success message with changes made
        const changes = finalResult.changes_made || [];
        if (changes.length > 0) {
          toast.success(
            (_t) => (
              <div>
                <strong>Resume tailored successfully!</strong>
                <div style={{ marginTop: '8px', fontSize: '12px' }}>
                  <strong>Changes Made:</strong>
                  <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                    {changes.slice(0, 3).map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                    {changes.length > 3 && <li>...and {changes.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            ),
            { duration: 6000 }
          );
        } else {
          toast.success('Resume tailored! Cover letter and email generated.');
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
