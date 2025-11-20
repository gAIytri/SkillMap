/**
 * Formats an ISO timestamp string to a readable format
 * @param {string} isoString - ISO format date string
 * @returns {string} Formatted date string or 'Current' if no date provided
 */
export const formatTimestamp = (isoString) => {
  if (!isoString) return 'Current';
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
