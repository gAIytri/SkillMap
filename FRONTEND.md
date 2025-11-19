# SkillMap Frontend Documentation

## Recent Changes (2025-01-19)

### Upload Experience Improvements
1. **Template Preview During Upload** (`pages/UploadResume.jsx`)
   - Added side-by-side layout showing template preview + status messages
   - Template preview shows what the generated resume will look like
   - Displays actual resume template image from `/src/assets/resume-template-preview.png`
   - Responsive layout: stacks vertically on mobile, side-by-side on desktop
   - Template preview: 320px fixed width with green border
   - Status messages: flexible width with scrollable area

2. **Layout Details**
   - **Desktop**: Template on left (320px), status messages on right (flex)
   - **Mobile**: Status messages first, then template preview below
   - **Template section**: Bordered paper with "Your resume will look like this" heading
   - **Status section**: Scrollable list with checkmark icons (max height 400px desktop, 180px mobile)

### Dashboard Protection
1. **Base Resume Requirement** (`pages/Dashboard.jsx`)
   - Automatically redirects to `/upload-resume` if user has no base resume
   - Prevents accessing dashboard/projects without uploading resume first
   - Ensures every user has their own base resume before creating projects

### Asset Requirements
1. **Template Preview Image**
   - Location: `/src/assets/resume-template-preview.png` (or `.jpg`)
   - Shows clean, professional, ATS-friendly resume format
   - Full-page screenshot of generated John Doe template
   - Used during upload to set user expectations

## Overview
React-based frontend for AI-powered resume tailoring with Stripe credit system and real-time agent streaming. **Fully responsive** design optimized for mobile, tablet, and desktop devices.

## Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios + Fetch (for SSE)
- **Notifications**: react-hot-toast
- **OAuth**: @react-oauth/google
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Icons**: Material Icons
- **Responsive Design**: MUI breakpoints (useMediaQuery, useTheme)

## Project Structure
```
frontend/src/
├── assets/              # Images, logos
├── components/
│   ├── common/
│   │   ├── Navbar.jsx              # Navigation with credit display
│   │   └── ProtectedRoute.jsx     # Auth guard
│   └── credits/
│       └── RechargeDialog.jsx      # Credit purchase dialog
├── context/
│   └── AuthContext.jsx             # User auth & state
├── pages/
│   ├── Dashboard.jsx               # Projects list
│   ├── Landing.jsx                 # Landing page
│   ├── Login.jsx                   # Login page
│   ├── Profile.jsx                 # User profile & transactions
│   ├── ProjectEditor.jsx           # Main editor interface
│   ├── Register.jsx                # Registration page
│   └── UploadResume.jsx            # Resume upload with OCR
├── services/
│   ├── api.js                      # Axios instance
│   ├── authService.js              # Authentication API
│   ├── creditsService.js           # Credits API
│   ├── projectService.js           # Projects API
│   ├── resumeService.js            # Resumes API (with SSE)
│   └── userService.js              # User profile API
├── styles/
│   └── theme.js                    # MUI theme & colors
├── App.jsx              # Root component with routing
└── main.jsx             # Entry point
```

## Responsive Design

**Fully responsive** across all devices with dedicated mobile, tablet, and desktop layouts.

### Breakpoints
- **Mobile**: < 600px (sm)
- **Tablet**: 600px - 1200px (md-lg)
- **Desktop**: > 1200px

### Responsive Features
- **Navbar**: Conditional layout, smaller buttons on mobile, credits only shown when logged in
- **Landing Page**: Auth-based CTAs, signup incentive badges for non-logged-in users
- **ProjectEditor**: Slide-in drawer for extracted data on mobile, FAB toggle button
- **All Pages**: Optimized padding, typography, and layouts for smaller screens
- **Dashboard**: Welcome message for new users showing "100 free credits"

## Core Features

### 1. Multi-Format Resume Upload

**Supported Formats**: DOCX, DOC, PDF, JPG, JPEG, PNG, BMP, TIFF

**Component**: `UploadResume.jsx`

**Features**:
- Drag-and-drop file upload
- File validation (format + size check)
- Real-time streaming status messages via SSE
- OCR status indicator when image extraction is used
- Progress indicators (LinearProgress + status list)
- Auto-redirect to dashboard after upload

**Upload Flow**:
```
Select file → Validate format & size → Upload →
Stream status messages →
If OCR needed: Show "Using OCR" chip →
Success → Navigate to Dashboard
```

**Status Messages**:
- "Uploading file..."
- "Extracting text from DOCX..."
- "Switching to OCR for better extraction..." (if needed)
- "Successfully extracted N characters"
- "Analyzing resume content with AI..."
- "Resume extraction completed successfully!"

### 2. Credits System

**Credit Display**:
- Always-visible credit chip in navbar
- Format: "93.5 Credits" (1 decimal place)
- Updates in real-time after tailoring
- Semi-transparent white background on gradient navbar

**Recharge Dialog** (`components/credits/RechargeDialog.jsx`):
- Displays current credit balance
- Shows 4 packages (50, 100, 250, 500 credits)
- Pricing with savings badges (10%, 20%, 30%)
- Stripe Checkout redirect
- Blocking mode (when credits < 5)
- Non-blocking mode (optional recharge)

**Profile Page** (`pages/Profile.jsx`):
- User info (name, email, avatar)
- Large credit balance display
- "Recharge Credits" button
- Transaction history table:
  - Date
  - Type (Purchase/Tailor/Grant/Refund/Bonus)
  - Description
  - Amount (+/-)
  - Balance after
  - Tokens used
- Payment redirect handling (success/cancelled)
- Auto-refresh on page load

**Credit Validation**:
- Pre-check before tailoring (requires 5 credits)
- Clear error messages showing current balance
- Low balance warning (when < 10 credits)
- Auto-refresh after successful tailoring

### 3. Project Editor

**Layout**:
- **Desktop/Tablet**: 2-column (PDF 60%, Extracted Data 40%) + Job Description Drawer
- **Mobile**: Full-width PDF with slide-in drawer for extracted data

**Main Features**:
- Load project data on mount
- PDF preview with zoom controls (60-200%)
- Extracted JSON data (Formatted/Raw tabs)
- Job description in slide-out drawer (450px, left-aligned)
- Download buttons (PDF, DOCX)
- Replace resume functionality
- Section drag-and-drop reordering
- **Responsive header** with mobile optimizations

**Mobile Optimizations**:
- Header height: 48px (vs 40px on desktop)
- "Replace" button hidden on mobile
- "Updated" timestamp hidden on mobile
- Smaller button sizes (font: 0.65rem, reduced padding)
- "Tailor Resume" → "Tailor" on mobile
- Extracted data panel becomes slide-in drawer
- FAB (Floating Action Button) to toggle drawer
- Drawer width: 85% with max 400px
- Project name truncates with ellipsis if too long

**Agent Streaming Modal**:
```javascript
// Real-time progress updates during tailoring
<Dialog open={tailoring} disableEscapeKeyDown>
  <DialogTitle>
    <CircularProgress size={24} />
    Tailoring Resume
    <LinearProgress />
  </DialogTitle>
  <DialogContent>
    {agentMessages.map((msg, idx) => (
      <Box key={idx}>
        <Typography>{msg.message}</Typography>
      </Box>
    ))}
  </DialogContent>
</Dialog>
```

**Message Types**:
- `{type: "status", message: "...", step: "initialization"}`
- `{type: "tool_result", tool: "validate_intent", data: {...}}`
- `{type: "final", success: true, tailored_json: {...}}`

**Formatted View**:
- Accordion cards for each section
- Current version highlighted in green with "CURRENT" badge
- Previous versions in nested accordions
- Timestamps in readable format
- Version count badges (e.g., "2 versions")
- Drag-and-drop reordering with @dnd-kit

**Section Reordering**:
- Optimistic UI update (instant feedback)
- Backend persistence via API
- Auto PDF regeneration
- Loading spinner during reorder
- Error handling with state revert
- 5px drag threshold (prevent accidental drags)

**Replace Resume**:
- File upload with validation
- Full-screen loading overlay
- Progress messages
- Extracted data updates
- PDF refreshes with new content
- Error handling with toast notifications

### 4. Job Description Drawer

**Position**: Slides in from left
**Width**: 450px
**Trigger**: "Tailor Resume" button in header

**Features**:
- Header with close button
- Multiline TextField (20 rows)
- Footer with Cancel/Tailor buttons
- Closes on cancel or after tailoring
- Preserves entered text

### 5. Toast Notification System

**Library**: react-hot-toast

**Configuration**:
- Position: top-right
- Duration: 4 seconds
- Custom styling (Poppins font, rounded corners, shadows)
- Color-coded (green success, red error, blue loading)

**Usage Examples**:
```javascript
// Simple success
toast.success('Resume replaced successfully!');

// Loading with update
const toastId = toast.loading('Deleting project...');
toast.success('Project deleted!', { id: toastId });

// Rich content with list
toast.success((t) => (
  <div>
    <strong>Resume tailored!</strong>
    <ul>
      {changes.map((change, idx) => (
        <li key={idx}>{change}</li>
      ))}
    </ul>
  </div>
), { duration: 6000 });
```

### 6. Navbar

**Features**:
- Gradient background (#072D1F → #29B770)
- Height: 48px (compact)
- Favicon logo before "SkillMap" text (28px × 28px)
- Dashboard link (hidden on mobile, moved to menu dropdown)
- Credit balance chip (**only shown when user is logged in**)
- User menu with profile dropdown
- White text/buttons for dark background
- **Fully responsive** with mobile optimizations

**Responsive Behavior**:
- **Desktop**: Full layout with all buttons and credits visible
- **Tablet**: Same as desktop
- **Mobile (<600px)**:
  - Smaller buttons (reduced padding and font size)
  - Dashboard button hidden (accessible via menu)
  - Credits chip smaller (just number, no "Credits" text)
  - Avatar reduced to 32px
  - Reduced spacing between elements
- **Very Small Mobile (<400px)**:
  - Credits chip completely hidden
  - Maximum space efficiency

**Credit Chip** (conditional display):
```javascript
{isAuthenticated && user ? (
  <Chip
    icon={<AccountBalanceWalletIcon />}
    label={`${user.credits?.toFixed(1) || '0.0'} ${isMobile ? '' : 'Credits'}`}
    onClick={() => navigate('/profile')}
    size={isMobile ? 'small' : 'medium'}
    sx={{
      bgcolor: 'rgba(255, 255, 255, 0.15)',
      color: '#ffffff',
      fontWeight: 600,
      cursor: 'pointer'
    }}
  />
) : null}
```

### 7. Dashboard

**Features**:
- Project cards with company/position
- Tailored status indicator
- Edit/delete actions with confirmations
- Create new project button
- Empty state for new users
- **Welcome message** for new users: "100 free credits to get started"
- Toast notifications for actions
- Loading states during operations
- **Fully responsive** grid layout

**Welcome Message** (for new users with no projects):
```javascript
<Alert severity="success">
  <Typography variant="body2" fontWeight={600}>
    Welcome! You've received 100 free credits to get started!
  </Typography>
  <Typography variant="caption">
    Each resume tailoring costs 5 credits. That's 20 tailored resumes!
  </Typography>
</Alert>
```

**Responsive Behavior**:
- **Desktop**: Full layout with all elements
- **Tablet**: Header stacks vertically, projects in 2 columns
- **Mobile**:
  - Reduced padding (py: 2 vs 4)
  - Header stacks vertically
  - "New Project" button full width
  - Projects grid: 1 column (xs=12)
  - Typography sizes reduced

### 8. Authentication

**Google OAuth Integration**:
- GoogleOAuthProvider wrapper in App.jsx
- Google Sign In button on Login page
- Google Sign Up button on Register page
- Handles credential response
- Sends id_token to backend
- Stores JWT in localStorage
- Auto-navigation after auth

**Auth Flow**:
```
Google → credential → AuthContext.googleLogin() →
JWT stored + User state updated → Navigate to page
```

**Known Issues**:
- Requires authorized origins in Google Cloud Console
- May need `http://localhost:5173` added to allowed origins

## Services

### api.js
Axios instance with JWT interceptors.

**Features**:
- Auto-adds JWT token to requests
- Handles 401 errors (logout)
- Base URL from environment variable

### authService.js
Authentication API calls.

**Methods**:
- `register(data)` - Create account
- `login(credentials)` - Email/password login
- `googleLogin(idToken)` - Google OAuth login
- `getCurrentUser()` - Get user from API
- `logout()` - Clear tokens

### creditsService.js
Credit operations.

**Methods**:
- `getBalance()` - Get current balance
- `getTransactions(limit, offset)` - Get history (paginated)
- `getPackages()` - Get credit packages
- `createCheckoutSession(credits)` - Create Stripe session

### userService.js
User profile operations.

**Methods**:
- `getCurrentProfile()` - Get fresh user data (includes credits)
- `updateProfile(profileData)` - Update user info
- `deleteAccount()` - Delete account

**Critical Feature**: `getCurrentProfile()` syncs localStorage with API to ensure navbar shows updated credits.

### projectService.js
Project CRUD operations.

**Methods**:
- `getAllProjects()` - List projects
- `getProject(id)` - Get details
- `createProject(data)` - Create project
- `updateProject(id, data)` - Update project
- `updateSectionOrder(id, sectionOrder)` - Update section order
- `deleteProject(id)` - Delete project
- `tailorResumeWithAgent(id, updates)` - Tailor with SSE streaming
- `getProjectPDF(id)` - Get PDF URL
- `downloadDOCX(id)` - Download DOCX

### resumeService.js
Resume upload and management.

**Methods**:
- `uploadResume(file, onMessage)` - Upload with SSE streaming
- `getBaseResume()` - Get user's base resume

**SSE Upload**:
```javascript
const result = await resumeService.uploadResume(
  file,
  (message) => {
    if (message.type === 'status') {
      setStatusMessages(prev => [...prev, message.message]);
    }
  }
);
```

## Context

### AuthContext

**State**:
- `user` - Current user object (includes credits)
- `loading` - Initial load state

**Methods**:
- `login(credentials)` - Email/password login
- `register(data)` - Register new user
- `googleLogin(idToken)` - Google OAuth login
- `logout()` - Clear user state
- `refreshUser()` - Fetch fresh user data from API (memoized)
- `isAuthenticated` - Boolean auth status

**Critical Feature**: `refreshUser()` is **memoized with useCallback** to prevent infinite re-renders:
```javascript
const refreshUser = useCallback(async () => {
  const profile = await userService.getCurrentProfile();
  setUser(profile);  // Update React state
  localStorage.setItem('user', JSON.stringify(profile));  // Sync localStorage
  return profile;
}, []); // Stable reference - no dependencies
```

**Bug Fix**: Previously caused infinite refresh loop on Profile page. Now properly memoized.

## Routing

```javascript
<Routes>
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Protected routes */}
  <Route path="/dashboard" element={
    <ProtectedRoute><Dashboard /></ProtectedRoute>
  } />
  <Route path="/upload" element={
    <ProtectedRoute><UploadResume /></ProtectedRoute>
  } />
  <Route path="/project/:id" element={
    <ProtectedRoute><ProjectEditor /></ProtectedRoute>
  } />
  <Route path="/profile" element={
    <ProtectedRoute><Profile /></ProtectedRoute>
  } />
</Routes>
```

## Environment Variables (.env)

```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create `.env` file with variables above.

### 3. Start Development Server
```bash
npm run dev
# App available at http://localhost:5173
```

### 4. Build for Production
```bash
npm run build
# Output in dist/
```

## User Flows

### First-Time User
```
Register → Upload Resume (with OCR support) → Dashboard (empty) →
Create Project → Enter Job Description → Tailor Resume →
Download DOCX/PDF
```

### Returning User
```
Login → Dashboard (with projects) → Select Project →
View/Edit → Tailor (if needed) → Download
```

### Credit Purchase
```
Profile Page → Click "Recharge Credits" → Select Package →
Redirect to Stripe Checkout → Complete Payment →
Redirect back with success → Credits Updated in Navbar
```

### Low Credits Flow
```
Try to Tailor (< 5 credits) → Error toast →
Recharge Dialog opens (blocking) → Purchase Credits →
Return to editor → Tailor successfully
```

## Styling

### MUI Theme
```javascript
export const colorPalette = {
  primary: '#29B770',
  primaryDark: '#072D1F',
  secondary: '#F4F4F4',
};
```

### Navbar Gradient
```javascript
background: 'linear-gradient(135deg, #072D1F 0%, #29B770 100%)'
```

## Common Issues

### Credits Not Updating in Navbar
**Problem**: Credits added to database but navbar shows old value
**Solution**: Fixed by updating `refreshUser()` to sync localStorage

### Navbar Shows Credits Before User Logs In
**Problem**: Navbar displays "0.0 Credits" before authentication
**Solution**: Fixed by changing condition from `isAuthenticated` to `isAuthenticated && user`

### Profile Page Infinite Refresh Loop
**Problem**: Non-stop fetches and re-renders on Profile page
**Solution**:
1. Memoized `refreshUser()` with `useCallback` in AuthContext
2. Split useEffect into two separate effects (initial load + payment redirect)
3. Initial load runs only once on mount with empty dependencies

### Navbar Overflow on Mobile
**Problem**: Navbar elements overflow and cause horizontal scroll
**Solution**:
1. Reduced button sizes and padding on mobile
2. Hidden Dashboard button on mobile (moved to menu)
3. Shortened credit chip text on mobile
4. Added overflow: hidden to container

### CORS Errors
**Problem**: API requests blocked
**Solution**: Ensure backend `CORS_ORIGINS` includes `http://localhost:5173`

### PDF Not Loading
**Problem**: PDF preview blank or downloads instead
**Solution**: Check backend LibreOffice installation

### Google OAuth "Error 401: invalid_client"
**Problem**: OAuth popup shows error
**Solution**: Add `http://localhost:5173` to Google Cloud Console authorized origins

### Stripe Checkout Redirects But No Credits
**Problem**: Payment succeeds but credits don't update
**Solution**:
1. Check `stripe listen` is running
2. Verify webhook secret matches `.env`
3. Wait 5-10 seconds for webhook processing

## Testing

### Manual Testing Checklist
- [ ] Register new account
- [ ] Upload resume (DOCX, PDF, Image)
- [ ] Create project
- [ ] Tailor resume with agent
- [ ] View agent streaming messages
- [ ] Check credit deduction
- [ ] Purchase credits via Stripe (test mode)
- [ ] View transaction history
- [ ] Reorder sections (drag & drop)
- [ ] Replace resume
- [ ] Download DOCX
- [ ] View PDF preview
- [ ] Test Google OAuth

### Stripe Testing
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry, any CVC, any ZIP

## Landing Page Features

### Auth-Based CTAs

**For Non-Logged-In Users**:
- Hero section shows "Get Started Free" + "Login" buttons
- Prominent "100 FREE credits" incentive badge with gold star icon
- Bottom CTA section visible with signup button
- Second "100 FREE credits" badge in bottom CTA

**For Logged-In Users**:
- Hero section shows single "Go to Dashboard" button
- No signup incentive badges (not needed)
- Bottom CTA section **completely hidden**
- Clean, streamlined experience

**Signup Incentive Design**:
```javascript
{!isAuthenticated && (
  <Chip
    icon={<StarIcon sx={{ color: '#FFD700' }} />}
    label="Sign up and get 100 FREE credits to start!"
    sx={{
      bgcolor: colorPalette.primary.darkGreen,
      color: '#FFFFFF',
      fontWeight: 700,
      boxShadow: '0 4px 12px rgba(7, 45, 31, 0.3)'
    }}
  />
)}
```

### Updated Feature Cards
1. **Upload Any Resume Format**: DOCX, PDF, or Images (JPG, PNG) - AI extraction
2. **AI-Powered Tailoring**: Paste job description, get resume + cover letter + email
3. **Manage Projects**: Organized with version history
4. **Download PDF or DOCX**: Your choice, instantly generated

## Deployment

### Production Build
```bash
npm run build
# Deploy dist/ folder to hosting service
```

### Hosting Options
- **Vercel** (recommended for React apps)
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### Environment Variables

**Local Development** (`.env`):
```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Production** (`.env.production`):
```bash
VITE_API_URL=https://skillmap-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-production-client-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_... for real payments
```

**Note**: Vite automatically uses `.env.production` when building for production (`npm run build`).

### SPA Routing Configuration

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

**Netlify** (`_redirects`):
```
/* /index.html 200
```

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

---

## Recent Changes (2025-11-19)

### Profile Page Redesign

#### 1. Credit Recharge Cards Styling (Profile.jsx)

**Changes:**
- Removed "Most Popular" badge and special styling
- Made all credit package cards uniform in appearance
- Removed green border from popular package
- Removed hover transform effects on cards
- Removed card click selection state
- All cards now have consistent 1px gray border

**Updated Credit Packages:**
Updated to show tailoring ranges based on 4-6 credits per tailoring:
- **50 Credits** ($5.00 - $0.10/credit): 8-12 resume tailorings
- **100 Credits** ($9.00 - $0.09/credit, SAVE 10%): 16-25 resume tailorings

**Code Changes:**
```javascript
// All cards now have uniform styling
<Card
  sx={{
    height: '100%',
    border: '1px solid',
    borderColor: '#e0e0e0',  // Uniform gray border
    bgcolor: '#ffffff',
    cursor: 'default',  // No pointer cursor
  }}
>

// Updated tailoring counts
<Typography variant="body2">
  ✓ {pkg.tailorings} resume tailorings
</Typography>
```

#### 2. Beta Modal Implementation (Profile.jsx)

**Purpose:** Display beta notice instead of Stripe checkout during beta phase

**Features:**
- Modal appears when user clicks any "Get Credits" button
- Explains beta phase and 100 free credits
- Stripe checkout code preserved (commented out) for future use
- Easy to switch to production by uncommenting Stripe code

**Implementation:**
```javascript
// State
const [showBetaModal, setShowBetaModal] = useState(false);

// Modified handleRecharge
const handleRecharge = async (_credits) => {
  setShowBetaModal(true);

  // PRODUCTION CODE (uncomment when ready):
  // setRechargeLoading(true);
  // try {
  //   const { url } = await creditsService.createCheckoutSession(credits, autoRecharge);
  //   window.location.href = url;
  // } catch (error) {
  //   toast.error('Failed to start checkout. Please try again.');
  //   setRechargeLoading(false);
  // }
};

// Beta Modal Component
<Dialog open={showBetaModal} onClose={() => setShowBetaModal(false)} maxWidth="sm" fullWidth>
  <DialogTitle>
    <Box display="flex" alignItems="center" gap={2}>
      <Typography variant="h6" fontWeight={700}>Beta Version</Typography>
    </Box>
  </DialogTitle>
  <DialogContent>
    <Typography variant="body1" paragraph>
      Thank you for trying SkillMap! We're currently in <strong>beta version</strong> and are working hard to bring you the best experience.
    </Typography>
    <Typography variant="body1" paragraph>
      During this beta phase, all users receive <strong>100 free credits</strong> to test our resume tailoring features.
    </Typography>
    <Typography variant="body2" color="text.secondary">
      💡 Credit recharging will be available soon. Stay tuned for updates!
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowBetaModal(false)} variant="contained" fullWidth>
      Got it!
    </Button>
  </DialogActions>
</Dialog>
```

**Component Imports Added:**
```javascript
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
```

### Project Editor Redesign

#### 1. Vertical Sidebar Implementation (ProjectEditor.jsx)

**Major Change:** Replaced two horizontal bars with vertical sidebar on left side

**Layout Changes:**
1. **Sidebar (10% width, min 140px, max 180px):**
   - Back to Dashboard button
   - Project name display
   - Document tabs (Resume, Cover Letter, Email) - vertical
   - Action buttons (Replace, Download, Tailor) - vertical stack

2. **Main Content Area:**
   - PDF preview and formatted sections moved up
   - Better screen real estate usage
   - Responsive: sidebar only on desktop, original layout on mobile

**Sidebar Structure:**
```javascript
{!isMobile && (
  <Box
    sx={{
      width: '10%',
      minWidth: '140px',
      maxWidth: '180px',
      bgcolor: '#f8f9fa',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      p: 2,
    }}
  >
    {/* Back to Dashboard */}
    <Button
      onClick={() => navigate('/dashboard')}
      startIcon={<ArrowBackIcon />}
      sx={{
        mb: 2,
        justifyContent: 'flex-start',
        color: colorPalette.primary.darkGreen,
        '&:hover': { bgcolor: 'rgba(41, 183, 112, 0.1)' },
      }}
    >
      Dashboard
    </Button>

    {/* Project Name */}
    <Typography
      variant="caption"
      sx={{
        mb: 3,
        color: 'text.secondary',
        fontSize: '0.7rem',
        fontWeight: 600,
      }}
    >
      {project?.project_name}
    </Typography>

    {/* Document Tabs - Vertical */}
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: 1,
          mb: 1,
          display: 'block',
        }}
      >
        DOCUMENTS
      </Typography>
      <Button
        fullWidth
        onClick={() => setDocumentTab(0)}
        startIcon={<DescriptionIcon />}
        variant={documentTab === 0 ? 'contained' : 'text'}
        sx={{ justifyContent: 'flex-start', mb: 0.5 }}
      >
        Resume
      </Button>
      <Button
        fullWidth
        onClick={() => setDocumentTab(1)}
        startIcon={<EmailIcon />}
        variant={documentTab === 1 ? 'contained' : 'text'}
        sx={{ justifyContent: 'flex-start', mb: 0.5 }}
      >
        Cover Letter
      </Button>
      <Button
        fullWidth
        onClick={() => setDocumentTab(2)}
        startIcon={<SendIcon />}
        variant={documentTab === 2 ? 'contained' : 'text'}
        sx={{ justifyContent: 'flex-start' }}
      >
        Email
      </Button>
    </Box>

    {/* Action Buttons */}
    <Box sx={{ mt: 'auto' }}>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.65rem',
          fontWeight: 700,
          letterSpacing: 1,
          mb: 1,
          display: 'block',
        }}
      >
        ACTIONS
      </Typography>
      <Button
        fullWidth
        variant="outlined"
        onClick={() => fileInputRef.current?.click()}
        sx={{ mb: 1 }}
      >
        Replace
      </Button>
      <Button
        fullWidth
        variant="outlined"
        onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
        sx={{ mb: 1 }}
      >
        Download
      </Button>
      <Button
        fullWidth
        variant="contained"
        onClick={() => setJobDescDrawerOpen(true)}
        sx={{
          bgcolor: colorPalette.primary.brightGreen,
          '&:hover': { bgcolor: colorPalette.primary.green },
        }}
      >
        Tailor
      </Button>
    </Box>
  </Box>
)}
```

**Mobile Responsiveness:**
- Sidebar hidden on mobile (`!isMobile` wrapper)
- Original horizontal tabs and header preserved for mobile
- Uses Material-UI `useMediaQuery` for breakpoint detection:
```javascript
const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
```

#### 2. Manual PDF Compilation Feature (ProjectEditor.jsx)

**Problem:** PDF was auto-reloading on every section reorder, causing unnecessary API calls

**Solution:** Added manual compile button with pending changes tracking

**Implementation:**

1. **New States:**
```javascript
const [pendingChanges, setPendingChanges] = useState(false);
const [compiling, setCompiling] = useState(false);
```

2. **Modified Section Reordering:**
```javascript
const handleDragEnd = async (event) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    const oldIndex = sectionOrder.indexOf(active.id);
    const newIndex = sectionOrder.indexOf(over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Optimistic UI update
      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      setSectionOrder(newOrder);

      try {
        // Persist to backend
        await projectService.updateSectionOrder(projectId, newOrder);
        setPendingChanges(true);  // Mark as having pending changes
        toast.success('Section order updated. Click "Compile" to see changes in PDF.');

        // NO PDF RELOAD HERE - user must click compile
      } catch (error) {
        console.error('Error updating section order:', error);
        setSectionOrder(sectionOrder); // Revert on error
        toast.error('Failed to update section order');
      }
    }
  }
};
```

3. **Compile Function:**
```javascript
const handleCompile = async () => {
  try {
    setCompiling(true);
    setPdfLoading(true);

    // Clean up old PDF URL
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    // Reload PDF preview
    await loadPdfPreview();

    setPendingChanges(false);
    toast.success('PDF compiled successfully!');
  } catch (error) {
    console.error('Error compiling PDF:', error);
    toast.error('Failed to compile PDF');
  } finally {
    setCompiling(false);
    setPdfLoading(false);
  }
};
```

4. **Compile Button (in zoom controls area):**
```javascript
<Button
  variant="contained"
  size="small"
  onClick={handleCompile}
  disabled={!pendingChanges || compiling}
  startIcon={compiling ? <CircularProgress size={14} /> : null}
  sx={{
    ml: 2,
    bgcolor: pendingChanges ? colorPalette.primary.brightGreen : '#cccccc',
    color: '#ffffff',
    '&:hover': {
      bgcolor: pendingChanges ? colorPalette.primary.green : '#cccccc',
    },
    '&:disabled': {
      bgcolor: '#cccccc',
      color: '#ffffff',
    },
  }}
>
  {compiling ? 'Compiling...' : pendingChanges ? 'Compile ⚡' : 'Compiled ✓'}
</Button>
```

**User Experience:**
- Button disabled when no pending changes
- Green color when changes pending
- Gray when compiled
- Shows loading state during compilation
- Toast notification on section reorder to remind user to compile
- Manual control prevents unnecessary PDF regenerations

### Credits Service Updates

#### Auto-Recharge API Integration (creditsService.js)

**New Methods:**

```javascript
// Modified checkout to support auto-recharge
createCheckoutSession: async (credits, enableAutoRecharge = false) => {
  const response = await api.post('/api/credits/create-checkout-session', {
    credits,
    enable_auto_recharge: enableAutoRecharge,
  });
  return response.data;
},

// Get user's auto-recharge settings
getAutoRechargeSettings: async () => {
  const response = await api.get('/api/credits/auto-recharge');
  return response.data;
},

// Update auto-recharge settings
updateAutoRechargeSettings: async (enabled, credits = null, threshold = 10.0) => {
  const response = await api.post('/api/credits/auto-recharge', {
    enabled,
    credits,
    threshold,
  });
  return response.data;
},
```

**Auto-Recharge Bonus:**
- Changed from 100 bonus credits to 20 bonus credits for auto-recharge purchases
- Backend automatically adds 20 bonus credits when auto-recharge triggers

---

## Production Deployment Checklist

### Before Enabling Stripe Payments:

1. **Profile Page (Profile.jsx):**
   - [ ] Comment out beta modal trigger in `handleRecharge`
   - [ ] Uncomment Stripe checkout code
   - [ ] Test checkout flow end-to-end

2. **Backend:**
   - [ ] Verify Stripe webhook endpoint is accessible
   - [ ] Test auto-recharge background job
   - [ ] Verify database has all auto-recharge columns

3. **Testing:**
   - [ ] Test successful payment flow
   - [ ] Test failed payment handling
   - [ ] Test auto-recharge with low credits
   - [ ] Test payment method saving

---

## Design Decisions

### Why Vertical Sidebar?
- Better use of horizontal screen space for PDF preview
- More intuitive document navigation
- Cleaner separation of controls vs content
- Industry standard pattern (similar to VS Code, Figma, etc.)
- 10% width provides enough space for buttons without wasting screen real estate

### Why Manual Compile?
- Reduces unnecessary API calls
- Gives user control over when to regenerate PDF
- Prevents jarring auto-refreshes during section reordering
- Clear visual feedback of pending changes
- Performance improvement (no regeneration on every drag)

### Why Beta Modal?
- Allows deployment without payment processing
- Preserves Stripe code for easy activation later
- Clear communication to users about beta status
- No code deletion - just commenting out
- Easy to switch to production mode

---

## License
Proprietary - All rights reserved
