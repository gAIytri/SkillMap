# SkillMap Frontend Documentation

## Overview
React-based frontend for AI-powered resume tailoring with Stripe credit system and real-time agent streaming.

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

**Layout**: 2-column (PDF 60%, Extracted Data 40%) + Job Description Drawer

**Main Features**:
- Load project data on mount
- PDF preview with zoom controls (60-200%)
- Extracted JSON data (Formatted/Raw tabs)
- Job description in slide-out drawer (450px, left-aligned)
- Download buttons (PDF, DOCX)
- Replace resume functionality
- Section drag-and-drop reordering

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
- Dashboard link
- Credit balance chip (always visible)
- User menu with profile dropdown
- White text/buttons for dark background

**Credit Chip**:
```javascript
<Chip
  icon={<AccountBalanceWalletIcon />}
  label={`${user?.credits?.toFixed(1) || '0.0'} Credits`}
  sx={{
    bgcolor: 'rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontWeight: 600
  }}
/>
```

### 7. Dashboard

**Features**:
- Project cards with company/position
- Tailored status indicator
- Edit/delete actions with confirmations
- Create new project button
- Empty state for new users
- Toast notifications for actions
- Loading states during operations

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
- `refreshUser()` - Fetch fresh user data from API
- `isAuthenticated` - Boolean auth status

**Critical Feature**: `refreshUser()` syncs both React state AND localStorage:
```javascript
const refreshUser = async () => {
  const profile = await userService.getCurrentProfile();
  setUser(profile);  // Update React state
  localStorage.setItem('user', JSON.stringify(profile));  // Sync localStorage
  return profile;
};
```

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

## Deployment

### Production Build
```bash
npm run build
# Deploy dist/ folder to hosting service
```

### Hosting Options
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### Environment Variables (Production)
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-production-client-id
```

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

## License
Proprietary - All rights reserved
