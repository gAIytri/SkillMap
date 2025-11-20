# SkillMap Frontend Documentation

## Recent Changes (2025-01-19)

### ProjectEditor Component Refactoring
**Major refactoring to reduce file complexity and improve maintainability**

1. **Component Extractions** (`src/components/project-editor/`)
   - **ActionSidebar.jsx**: Vertical sidebar with navigation, document tabs, and action buttons
     - Desktop: Fixed left sidebar (10% width, 140-180px)
     - Mobile: Slide-in drawer from left
   - **DocumentViewer.jsx**: PDF/Cover Letter/Email viewer with tabs
     - Includes zoom controls, compile button, and mobile tab navigation
   - **ExtractedDataPanel.jsx**: Resume data viewer (Formatted/Raw JSON)
     - Desktop: Fixed right panel (40-45% width)
     - Mobile: Slide-in drawer from right
   - **TailoringOverlay.jsx**: Full-screen modal showing real-time tailoring progress
     - Displays agent messages with step-by-step feedback
   - **JobDescriptionDrawer.jsx**: Left-sliding drawer for job description input
   - **SortableSection.jsx**: Drag-and-drop wrapper for resume sections
   - **PersonalInfoSection.jsx**: Personal information display
   - **ProfessionalSummarySection.jsx**: Professional summary with editing and version history
   - **ExperienceSection.jsx**: Work experience with editing and version history
   - **ProjectsSection.jsx**: Projects with editing capability
   - **EducationSection.jsx**: Education display
   - **SkillsSection.jsx**: Skills with editing capability
   - **CertificationsSection.jsx**: Certifications with editing capability

2. **Custom Hooks** (`src/hooks/`)
   - **useTailorResume.js**: Handles complex resume tailoring with streaming
     - Manages agent messages, credit checks, success/error handling
     - Fetches cover letter and email after tailoring
     - Includes abort controller for cleanup (210 lines)
   - **useResumeUpload.js**: Handles resume file upload and validation
     - Supports multiple file formats with size validation
     - Updates project with extracted resume JSON
     - Includes abort controller for cleanup (95 lines)

3. **Utility Functions** (`src/utils/`)
   - **dateUtils.js**: Date formatting utilities
     - `formatTimestamp()`: Formats ISO timestamps to readable format

4. **Code Reduction**
   - ProjectEditor.jsx reduced from ~2200+ lines to 833 lines (62% reduction)
   - Removed 1367 lines through component extraction
   - Cleaner, more maintainable codebase
   - Reusable components following React best practices

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
├── assets/              # Images, logos, resume template preview
├── components/
│   ├── common/
│   │   ├── Navbar.jsx              # Navigation with credit display
│   │   └── ProtectedRoute.jsx     # Auth guard
│   ├── credits/
│   │   └── RechargeDialog.jsx      # Credit purchase dialog
│   └── project-editor/
│       ├── ActionSidebar.jsx       # Sidebar with navigation & actions
│       ├── DocumentViewer.jsx      # PDF/Cover Letter/Email viewer
│       ├── ExtractedDataPanel.jsx  # Resume data viewer
│       ├── TailoringOverlay.jsx    # Tailoring progress modal
│       ├── JobDescriptionDrawer.jsx # Job description input
│       ├── SortableSection.jsx     # Drag-and-drop wrapper
│       ├── PersonalInfoSection.jsx
│       ├── ProfessionalSummarySection.jsx
│       ├── ExperienceSection.jsx
│       ├── ProjectsSection.jsx
│       ├── EducationSection.jsx
│       ├── SkillsSection.jsx
│       └── CertificationsSection.jsx
├── context/
│   └── AuthContext.jsx             # User auth & state
├── hooks/
│   ├── useTailorResume.js          # Resume tailoring logic
│   └── useResumeUpload.js          # Resume upload logic
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
├── utils/
│   └── dateUtils.js                # Date formatting utilities
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
- Template preview showing expected output
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
- **Desktop/Tablet**: Sidebar (10%) + PDF (50%) + Extracted Data (40%)
- **Mobile**: Full-width PDF with slide-in drawers

**Main Features**:
- Load project data on mount
- PDF preview with zoom controls (60-200%)
- Extracted JSON data (Formatted/Raw tabs)
- Job description in slide-out drawer (450px, left-aligned)
- Download buttons (PDF, DOCX)
- Replace resume functionality
- Section drag-and-drop reordering
- Manual compile button for PDF regeneration
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

**Agent Streaming Modal** (`TailoringOverlay.jsx`):
- Real-time progress updates during tailoring
- Color-coded message cards by type (status, tool_result, final)
- Shows role focus, skills identified, and changes made
- Animated message appearance
- Auto-scrolls to latest message
- Linear progress indicator

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
- Manual PDF regeneration via Compile button
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
- **Base resume protection**: Redirects to upload if no base resume exists

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

## Custom Hooks

### useTailorResume.js
Handles complex resume tailoring with streaming.

**Features**:
- Validates job description and credits
- Manages agent messages with real-time streaming
- Handles success/error states
- Fetches cover letter and email after tailoring
- Refreshes user credits
- Includes abort controller for cleanup

**Returns**: `{ handleTailorResume, abortControllerRef }`

### useResumeUpload.js
Handles resume file upload and validation.

**Features**:
- Validates file format and size
- Uploads resume with SSE streaming
- Extracts resume JSON
- Updates project data
- Refreshes PDF preview
- Includes abort controller for cleanup

**Returns**: `{ handleResumeUpload, abortControllerRef }`

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
  <Route path="/upload-resume" element={
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

## Environment Variables

### Local Development (`.env`)
```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Production (`.env.production`)
```bash
VITE_API_URL=https://skillmap-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # or pk_live_... for real payments
```

**Note**: Vite automatically uses `.env.production` when building for production (`npm run build`).

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

## Production Deployment

### Current Deployment
- **URL**: https://skill-map-six.vercel.app
- **Platform**: Vercel
- **Auto-deploy**: On push to main branch

### Deployment Steps
1. Push to GitHub main branch
2. Vercel auto-deploys (1-2 minutes)
3. Check deployment status in Vercel dashboard

### Vercel Configuration
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Root Directory: `frontend`

### SPA Routing
Create `vercel.json` in project root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
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

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

---

## License
Proprietary - All rights reserved
