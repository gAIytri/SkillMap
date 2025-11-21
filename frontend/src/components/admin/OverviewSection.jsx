import { Box, Divider } from '@mui/material';
import UserAnalytics from './UserAnalytics';
import TokenAnalytics from './TokenAnalytics';
import CreditsAnalytics from './CreditsAnalytics';

const OverviewSection = ({ userAnalytics, tokenAnalytics, creditsAnalytics }) => {
  return (
    <Box>
      {/* User Analytics */}
      <Box mb={6}>
        <UserAnalytics data={userAnalytics} />
      </Box>

      <Divider sx={{ my: 6 }} />

      {/* Token Analytics */}
      <Box mb={6}>
        <TokenAnalytics data={tokenAnalytics} />
      </Box>

      <Divider sx={{ my: 6 }} />

      {/* Credits Analytics */}
      <Box mb={6}>
        <CreditsAnalytics data={creditsAnalytics} />
      </Box>
    </Box>
  );
};

export default OverviewSection;
