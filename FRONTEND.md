# SkillMap Frontend Documentation

## Overview
SkillMap frontend is a React application built with Vite that provides an intuitive interface for resume management and AI-powered tailoring.

## Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Authentication**: JWT + Google OAuth
- **Styling**: MUI Theme + Custom CSS

## Project Structure
```
frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   └── common/
│   │       ├── Navbar.jsx
│   │       └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── pages/
│   │   ├── Landing.jsx
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── UploadResume.jsx
│   │   └── ProjectEditor.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── projectService.js
│   │   └── resumeService.js              # Includes agent streaming method
│   ├── styles/
│   │   ├── theme.js
│   │   └── globalStyles.js
│   ├── App.jsx
│   └── main.jsx
├── .env
├── package.json
└── vite.config.js
```

## Core Pages

### 1. Landing Page (`Landing.jsx`)
Marketing/landing page for unauthenticated users.

**Features**:
- Hero section with value proposition
- Call-to-action buttons
- Feature highlights
- Redirects logged-in users to dashboard

### 2. Authentication (`Login.jsx`, `Register.jsx`)
User authentication with email/password or Google OAuth.

**Features**:
- Email/password login
- Google OAuth integration
- Form validation
- Error handling
- Auto-redirect after successful auth

### 3. Dashboard (`Dashboard.jsx`)
Main project management interface.

**Features**:
- List all user projects
- Create new project dialog
- Search/filter projects
- Quick actions (edit, delete)
- Upload resume flow (first-time users)

**Flow**:
```
User logs in →
Check if base_resume exists →
  No? → Redirect to /upload-resume
  Yes? → Show projects list
```

### 4. Upload Resume (`UploadResume.jsx`)
Initial resume upload for new users.

**Features**:
- Drag-and-drop file upload
- File validation (.docx only, max 10MB)
- Upload progress indicator
- Auto-redirect to dashboard after upload

**Flow**:
```
Select .docx file →
Upload to backend →
LLM extracts JSON →
Store in base_resumes →
Navigate to /dashboard
```

### 5. Project Editor (`ProjectEditor.jsx`)
Main editing interface for tailoring resumes.

**Layout** (3-column):
- **Left**: Job Description input + Tailor button
- **Middle**: PDF preview with zoom controls
- **Right**: Extracted JSON data (Formatted/Raw tabs)

**Features**:
- Load project data on mount
- Display extracted resume JSON
- PDF preview of current resume state
- Paste job description
- Click "Tailor" to update resume
- Download buttons (PDF, DOCX)
- Zoom controls for PDF viewer
- Tabs for formatted vs raw JSON view

**Workflow**:
```
Enter project →
  Load project.resume_json →
  Show base resume JSON on right →
  Show base resume PDF in middle →
User pastes JD + clicks "Tailor with Agent" →
  Open streaming modal →
  Call /api/projects/{id}/tailor-with-agent →
  Stream progress messages in real-time →
  Update JSON on right →
  Close modal, show success alert →
  Reload PDF with tailored content →
User downloads DOCX/PDF
```

**Agent Streaming Modal**:
```javascript
// State for streaming
const [tailoring, setTailoring] = useState(false);
const [agentMessages, setAgentMessages] = useState([]);

// Handle tailor with agent
const handleTailorResume = async () => {
  setTailoring(true);
  setAgentMessages([]);

  const finalResult = await resumeService.tailorProjectResumeWithAgent(
    projectId,
    jobDescription,
    (message) => {
      // Force immediate render using flushSync
      flushSync(() => {
        setAgentMessages(prev => [...prev, message]);
      });
    }
  );

  if (finalResult?.success) {
    setTailoring(false);
    // Reload project data and PDF
  }
};

// Modal UI
<Dialog open={tailoring} maxWidth="sm" fullWidth disableEscapeKeyDown>
  <DialogTitle>
    <CircularProgress size={24} />
    Tailoring Resume
    <LinearProgress />
  </DialogTitle>
  <DialogContent>
    {agentMessages.map((msg, idx) => (
      <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5' }}>
        <Typography>{msg.message}</Typography>
      </Box>
    ))}
  </DialogContent>
</Dialog>
```

**Message Types**:
- `{type: "status", message: "...", step: "initialization"}` - Progress update
- `{type: "tool_result", tool: "validate_intent", data: {...}}` - Tool completion
- `{type: "final", success: true, tailored_json: {...}}` - Final result

**History UI (Accordion Cards)**:
```javascript
// Formatted view with version history
const history = project?.tailoring_history || [];

<Accordion defaultExpanded>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography>Professional Summary</Typography>
    {history.length > 0 && (
      <Chip icon={<HistoryIcon />} label={`${history.length} versions`} />
    )}
  </AccordionSummary>
  <AccordionDetails>
    {/* Current Version */}
    <Paper sx={{ bgcolor: '#e8f5e9', border: '1px solid #4caf50' }}>
      <Chip label="CURRENT" color="success" />
      <Typography>{extractedData.professional_summary}</Typography>
    </Paper>

    {/* Previous Versions */}
    {history.map((version, idx) => (
      <Accordion key={idx}>
        <AccordionSummary>
          <Typography>Version {idx + 1}</Typography>
          <Typography>{formatTimestamp(version.timestamp)}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>{version.resume_json?.professional_summary}</Typography>
        </AccordionDetails>
      </Accordion>
    ))}
  </AccordionDetails>
</Accordion>
```

**History Features**:
- Collapsible sections for each resume part
- Current version highlighted in green
- Previous versions show timestamp
- Easy comparison between versions
- Version count badge (e.g., "2 versions")

## Services

### api.js
Axios instance with interceptors for authentication.

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// Add JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (logout)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### authService.js
Authentication-related API calls.

```javascript
const authService = {
  register: async (data) => {...},
  login: async (credentials) => {...},
  loginWithGoogle: async (googleToken) => {...},
  getCurrentUser: async () => {...},
  logout: () => {...}
};
```

### resumeService.js
Resume management API calls.

```javascript
const resumeService = {
  uploadResume: async (file) => {...},
  getBaseResume: async () => {...},
  downloadRecreatedDOCX: async () => {...},
  tailorProjectResume: async (projectId, jobDescription) => {...},  // Legacy

  // NEW: Agent-based streaming tailoring
  tailorProjectResumeWithAgent: async (projectId, jobDescription, onMessage) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${baseURL}/api/projects/${projectId}/tailor-with-agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_description: jobDescription }),
    });

    // Stream SSE messages
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (onMessage) onMessage(data);  // Call callback for each message
          if (data.type === 'final') finalResult = data;
        }
      }
    }

    return finalResult;
  }
};
```

**Key Features**:
- Server-Sent Events (SSE) for real-time updates
- Callback function for each message
- Handles connection buffering and line parsing
- Returns final result after stream completes

### projectService.js
Project management API calls.

```javascript
const projectService = {
  getAllProjects: async () => {...},
  createProject: async (projectData) => {...},
  getProject: async (projectId) => {...},
  updateProject: async (projectId, projectData) => {...},
  deleteProject: async (projectId) => {...},
  downloadProjectPDF: async (projectId) => {...},
  downloadProjectDOCX: async (projectId) => {...}
};
```

## Context

### AuthContext
Manages authentication state globally.

```javascript
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authService.getCurrentUser()
        .then(setUser)
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    localStorage.setItem('token', data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Routing

```javascript
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />

  {/* Protected Routes */}
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
  <Route
    path="/upload-resume"
    element={
      <ProtectedRoute>
        <UploadResume />
      </ProtectedRoute>
    }
  />
  <Route
    path="/project/:projectId"
    element={
      <ProtectedRoute>
        <ProjectEditor />
      </ProtectedRoute>
    }
  />
</Routes>
```

## Theme Configuration

### Color Palette
```javascript
export const colorPalette = {
  primary: {
    brightGreen: '#29B770',
    darkGreen: '#4CAF50',
  },
  secondary: {
    lightGreen: '#E8F5E9',
    mediumGreen: '#66BB6A',
  },
  neutral: {
    lightGray: '#F5F5F5',
    gray: '#9E9E9E',
  },
};
```

### MUI Theme
```javascript
const theme = createTheme({
  palette: {
    primary: {
      main: colorPalette.primary.darkGreen,
    },
    secondary: {
      main: colorPalette.primary.brightGreen,
    },
  },
  typography: {
    fontFamily: 'Poppins, sans-serif',
  },
});
```

## Environment Variables (.env)

```bash
# Backend API URL
VITE_API_URL=http://localhost:8000

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create `.env` file with required variables (see above).

### 3. Start Development Server
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

Output will be in `dist/` directory.

## Key Features

### Protected Routes
Routes require authentication. Unauthenticated users redirect to `/login`.

```javascript
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <CircularProgress />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};
```

### File Upload
Drag-and-drop or click to upload .docx files.

```javascript
<input
  accept=".docx"
  type="file"
  onChange={handleFileSelect}
/>
```

**Validation**:
- File extension must be `.docx`
- Maximum size: 10MB
- Shows error messages for invalid files

### PDF Preview
Embedded PDF viewer with zoom controls.

```javascript
<iframe
  src={`${pdfUrl}#zoom=${pdfZoom}&toolbar=0&navpanes=0`}
  style={{ width: '100%', height: '100%' }}
  title="Resume PDF Preview"
/>
```

**Features**:
- Inline display (no download)
- Zoom in/out controls (60% - 200%)
- Updates after tailoring
- Full-screen capable

### JSON Display
Toggle between formatted and raw JSON views.

```javascript
const [activeTab, setActiveTab] = useState(0);

<Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
  <Tab label="Formatted View" />
  <Tab label="Raw JSON" />
</Tabs>

{activeTab === 0 ? (
  // Formatted cards view
  <FormattedView data={extractedData} />
) : (
  // Raw JSON monospace view
  <pre>{JSON.stringify(extractedData, null, 2)}</pre>
)}
```

## User Flows

### First-Time User
```
1. Register/Login
2. Redirect to /upload-resume
3. Upload DOCX resume
4. LLM extracts JSON
5. Redirect to /dashboard
6. Create first project
```

### Returning User
```
1. Login
2. View /dashboard with projects
3. Click existing project OR create new
4. Enter project editor
5. View base resume data
6. Paste JD and tailor
7. Download tailored resume
```

### Tailoring Flow
```
1. Enter project (/project/{id})
2. Base resume JSON loads on right
3. Base resume PDF shows in middle
4. Paste job description on left
5. Click "Tailor" button
6. Backend tailors resume with AI
7. Updated JSON displays on right
8. PDF refreshes with tailored content
9. Download DOCX with tailored content
```

## Common Issues

### CORS Errors
**Problem**: API requests blocked by CORS
**Solution**: Add frontend URL to backend `CORS_ORIGINS` in `.env`

### Google OAuth Not Working
**Problem**: Google login button doesn't work
**Solution**:
1. Check `VITE_GOOGLE_CLIENT_ID` in `.env`
2. Verify Google OAuth credentials in Google Cloud Console
3. Add authorized origins and redirect URIs

### PDF Not Showing
**Problem**: PDF preview blank or downloading
**Solution**:
1. Check backend has LibreOffice installed
2. Verify PDF endpoint returns `Content-Disposition: inline`
3. Check browser console for errors

### Token Expired
**Problem**: User logged out unexpectedly
**Solution**: JWT token expired (default 24h). User needs to re-login.

## Production Build

### 1. Update Environment
Create `.env.production` with production API URL:
```bash
VITE_API_URL=https://api.yourdomain.com
```

### 2. Build
```bash
npm run build
```

### 3. Preview Locally
```bash
npm run preview
```

### 4. Deploy
Deploy `dist/` folder to hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

### 5. Configure Routing
For SPAs, configure server to redirect all routes to `index.html`:

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

## Performance Optimization

### Code Splitting
Vite automatically splits code by route.

### Lazy Loading
```javascript
const ProjectEditor = lazy(() => import('./pages/ProjectEditor'));

<Suspense fallback={<CircularProgress />}>
  <ProjectEditor />
</Suspense>
```

### Image Optimization
- Use WebP format
- Lazy load images
- Compress before upload

### API Caching
```javascript
// Cache user data
const cachedUser = localStorage.getItem('cached_user');
if (cachedUser) {
  setUser(JSON.parse(cachedUser));
}
```

## Security Best Practices

- Never store sensitive data in localStorage
- Validate all user inputs
- Sanitize displayed content
- Use HTTPS in production
- Implement CSP headers
- Keep dependencies updated
- Use environment variables for secrets

## Maintenance

### Update Dependencies
```bash
npm update
npm audit fix
```

### Check Bundle Size
```bash
npm run build
# Check dist/ folder size
```

### Analyze Bundle
```bash
npm install -D rollup-plugin-visualizer
# Add to vite.config.js
```

## Testing (Future)

### Unit Tests
```bash
npm install -D vitest @testing-library/react
npm run test
```

### E2E Tests
```bash
npm install -D cypress
npm run cypress
```

## Accessibility

- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast ratios
- Provide text alternatives for images

## Version Control

### Repository
- **GitHub**: https://github.com/gAIytri/SkillMap
- **Branch**: main

### .gitignore Configuration
The frontend `.gitignore` excludes:
- `node_modules/` (Dependencies)
- `dist/`, `build/` (Build outputs)
- `.env`, `.env.local` (Environment variables)
- `.DS_Store` (System files)
- `npm-debug.log`, `yarn-error.log` (Log files)

### Working with the Repository

```bash
# Clone the repository
git clone https://github.com/gAIytri/SkillMap.git
cd SkillMap/frontend

# Install dependencies
npm install

# Create .env file (not in repo)
cp .env.example .env
# Update VITE_API_URL if needed (defaults to http://localhost:8000)

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Contributing to Frontend

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/ui-improvement`
3. Make your changes to components/pages
4. Test in browser (Chrome, Firefox, Safari)
5. Check for console errors
6. Ensure responsive design works
7. Commit: `git commit -m 'Add UI improvement'`
8. Push: `git push origin feature/ui-improvement`
9. Open a Pull Request

### Code Style

- Use functional components with hooks
- Follow React best practices
- Use Material-UI components when possible
- Keep components small and focused
- Use descriptive variable names
- Add comments for complex logic
- Use proper error handling

## Recent Updates

### Latest Changes (Current Version)

**Agent Streaming Modal** (NEW):
- Real-time progress updates during resume tailoring
- Shows each tool execution: validate → summarize → tailor
- Uses flushSync() for immediate rendering
- Material-UI Dialog with LinearProgress
- Auto-scrolls to show latest messages
- Disables closing during processing

**History UI with Accordions** (NEW):
- Collapsible cards for each resume section
- Current version highlighted in green with "CURRENT" badge
- Previous versions shown as nested accordions
- Timestamps in readable format (e.g., "Nov 14, 08:30 PM")
- Version count badges (e.g., "2 versions")
- Easy comparison between versions

**Agent Integration**:
- New `tailorProjectResumeWithAgent()` method in resumeService
- Server-Sent Events (SSE) streaming
- Callback-based message handling
- Automatic token authentication
- Error handling and recovery

**PDF Preview Enhancements**:
- Fixed auto-download issue by installing LibreOffice
- PDF now displays inline in browser instead of downloading
- Added zoom controls (60% - 200%)
- Proper iframe implementation with URL parameters
- Clean PDF viewer without toolbars or navigation panes

**Project Editor Improvements**:
- Fixed data loading: project.resume_json loads on mount
- Removed redundant base_resume fetching
- Download button now uses project endpoint
- PDF refreshes automatically after tailoring
- Extracted data visible immediately upon entering project
- Tailoring updates both JSON display and PDF preview

**Upload Workflow**:
- Direct navigation to dashboard after upload
- Removed /resume-viewer route (no longer needed)
- Streamlined user flow: upload → dashboard → create project → tailor

**Tailoring Integration**:
- Connected to enhanced backend tailoring service
- Professional summary updates visible in UI
- Work experience bullets show transformed content
- Projects reorder by relevance to job description
- Skills reorganize to prioritize JD matches
- Real-time JSON updates in formatted/raw tabs

**UI/UX Refinements**:
- 3-column layout: Job Description | PDF Preview | Extracted Data
- Tabs for Formatted/Raw JSON views
- Compact professional header with action buttons
- Color-coded sections with consistent styling
- Loading states and error handling
- Responsive design for different screen sizes

**Service Architecture**:
- Clean API service structure
- Proper error handling in all services
- Axios interceptors for authentication
- Token management in localStorage
- Auto-logout on 401 errors

## Upcoming Features

### Planned Improvements

**User Experience**:
- [ ] Dark mode toggle
- [ ] Keyboard shortcuts
- [ ] Drag-and-drop file upload improvements
- [ ] Resume template selection
- [ ] Side-by-side before/after comparison
- [ ] Export to multiple formats (PDF, TXT, MD)

**Editing Features**:
- [ ] Inline JSON editing
- [ ] Manual bullet point reordering
- [ ] Skills filtering and tagging
- [ ] Custom sections support
- [ ] Multiple resume versions per project

**Collaboration**:
- [ ] Share project links
- [ ] Comments and feedback
- [ ] Version history
- [ ] Collaborative editing

**Analytics & Insights**:
- [ ] Resume strength score
- [ ] ATS compatibility check
- [ ] Keyword density analysis
- [ ] Job match percentage
- [ ] Improvement suggestions

**Performance**:
- [ ] Lazy loading components
- [ ] Code splitting by route
- [ ] Image optimization
- [ ] Service worker for offline support
- [ ] Bundle size optimization

**Mobile**:
- [ ] Mobile-responsive improvements
- [ ] Touch gestures for PDF viewer
- [ ] Mobile-optimized forms
- [ ] Progressive Web App (PWA)

## Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Testing Checklist
- [ ] PDF preview works in all browsers
- [ ] File upload functions correctly
- [ ] Authentication flow works
- [ ] Responsive design on mobile (375px - 1920px)
- [ ] Keyboard navigation accessible
- [ ] No console errors
- [ ] API calls successful
- [ ] PDF zoom controls functional

## Troubleshooting

### Common Frontend Issues

**Issue**: PDF not showing, seeing blank iframe
**Solution**:
1. Check backend is running on port 8000
2. Verify LibreOffice is installed on backend
3. Check browser console for errors
4. Try different browser (some block inline PDFs)

**Issue**: API calls failing with CORS errors
**Solution**:
1. Check `VITE_API_URL` in `.env` matches backend URL
2. Verify backend `CORS_ORIGINS` includes frontend URL
3. Restart both servers

**Issue**: Login redirects not working
**Solution**:
1. Check `AuthContext` is wrapping App
2. Verify token is stored in localStorage
3. Check protected routes have `ProtectedRoute` wrapper

**Issue**: Tailoring button disabled
**Solution**:
1. Ensure job description has at least 10 characters
2. Verify project has resume_json data
3. Check backend is responding (network tab)

**Issue**: Download button not working
**Solution**:
1. Check using correct service method (projectService, not resumeService)
2. Verify project ID is valid
3. Check backend endpoint returns blob

## Development Tips

### Fast Development Workflow

```bash
# Terminal 1: Backend (auto-reloads on changes)
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend (hot module replacement)
cd frontend
npm run dev

# Terminal 3: Quick tests
cd frontend
npm run build  # Test production build
```

### Debugging

**React DevTools**: Install browser extension for component inspection
**Redux DevTools**: Not used (Context API instead)
**Network Tab**: Monitor API calls and responses
**Console**: Check for warnings and errors

### Quick Component Generation

```bash
# Create new page
touch src/pages/NewPage.jsx

# Create new component
touch src/components/NewComponent.jsx

# Add route in App.jsx
# Import and add <Route> element
```

## Credit System UI (NEW - Latest)

### Navbar Credit Display

**Location**: `components/common/Navbar.jsx`

**Features**:
- Displays user's current credit balance
- Updates in real-time after tailoring
- Styled chip with wallet icon
- Format: "93.5 Credits" (1 decimal place)

**Implementation**:
```javascript
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

<Chip
  icon={<AccountBalanceWalletIcon sx={{ color: '#ffffff !important' }} />}
  label={`${user?.credits?.toFixed(1) || '0.0'} Credits`}
  sx={{
    bgcolor: 'rgba(255, 255, 255, 0.15)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.875rem',
  }}
/>
```

**Design**:
- Semi-transparent white background on gradient navbar
- White text and icon
- Positioned between Dashboard button and user avatar
- Always visible to authenticated users

### Credit Validation Before Tailoring

**Location**: `pages/ProjectEditor.jsx`

**Check Before Starting**:
```javascript
// Check if user has sufficient credits
if (user && user.credits < 5.0) {
  alert(
    `Insufficient credits to tailor resume.\n\n` +
    `You have ${user.credits.toFixed(1)} credits.\n` +
    `Minimum 5 credits required to tailor resume.`
  );
  return;
}
```

**Features**:
- Prevents tailoring if credits < 5.0
- Shows current balance in error message
- Clear explanation of requirement
- Stops before calling backend

### Credit Refresh After Tailoring

**Location**: `pages/ProjectEditor.jsx:370-373`

**Auto-Refresh**:
```javascript
// After successful tailoring
if (finalResult && finalResult.success) {
  // ... update extracted data, reload PDF ...

  // Refresh user data to update credits in navbar
  if (refreshUser) {
    await refreshUser();
  }
}
```

**Flow**:
1. Tailoring completes successfully
2. Call `refreshUser()` from AuthContext
3. Fetch `/api/users/me` endpoint
4. Update user state with new credit balance
5. Navbar automatically re-renders with new credits

### Navbar Redesign

**Height**: 64px → 48px (more compact)

**Gradient Background**:
```javascript
background: 'linear-gradient(135deg, #072D1F 0%, #29B770 100%)'
```

**Logo**: Added favicon.svg before "SkillMap" text (28px × 28px)

**Colors**: All text and buttons changed to white for dark background

## Personal Information Section (NEW - Latest)

### Overview
Added "Personal Information" as a draggable section in the formatted view to display name, email, phone, location, and links.

### Implementation

**State** (`pages/ProjectEditor.jsx:76-92`):
```javascript
const [sectionOrder, setSectionOrder] = useState([
  'personal_info',  // NEW
  'professional_summary',
  'experience',
  'projects',
  'education',
  'skills',
  'certifications',
]);

const [expandedSections, setExpandedSections] = useState({
  personal_info: false,  // NEW
  professional_summary: false,
  // ... other sections ...
});
```

**Rendering** (`pages/ProjectEditor.jsx:532-584`):
```javascript
case 'personal_info':
  return extractedData.personal_info ? (
    <SortableSection key={sectionKey} id={sectionKey}>
      <Accordion
        expanded={expandedSections[sectionKey] || false}
        onChange={() => handleToggleSection(sectionKey)}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={700}>
            Personal Information
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 1.5, bgcolor: '#e8f5e9' }}>
            <Chip label="CURRENT" color="success" />
            <Box>
              <Typography fontWeight={600}>
                {extractedData.personal_info.name}
              </Typography>
              {extractedData.personal_info.email && (
                <Typography variant="caption">
                  Email: {extractedData.personal_info.email}
                </Typography>
              )}
              {extractedData.personal_info.phone && (
                <Typography variant="caption">
                  Phone: {extractedData.personal_info.phone}
                </Typography>
              )}
              {extractedData.personal_info.location && (
                <Typography variant="caption">
                  Location: {extractedData.personal_info.location}
                </Typography>
              )}
              {extractedData.personal_info.header_links?.map((link, idx) => (
                <Typography key={idx} variant="caption">
                  • {link.text} {link.url && `(${link.url})`}
                </Typography>
              ))}
            </Box>
          </Paper>
        </AccordionDetails>
      </Accordion>
    </SortableSection>
  ) : null;
```

**Features**:
- Collapsible accordion like other sections
- Shows name in bold
- Displays email, phone, location if available
- Lists header links (LinkedIn, GitHub, etc.)
- Green "CURRENT" badge
- Drag-and-drop reorderable with @dnd-kit

## Section Reordering Improvements (NEW - Latest)

### Drag-and-Drop with @dnd-kit

**Library**: `@dnd-kit/core`, `@dnd-kit/sortable`

**Setup**:
```javascript
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // 5px movement required to start drag
    },
  })
);
```

**SortableSection Component**:
```javascript
const SortableSection = ({ id, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};
```

**Drag End Handler**:
```javascript
const handleDragEnd = async (event) => {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const oldIndex = sectionOrder.indexOf(active.id);
  const newIndex = sectionOrder.indexOf(over.id);

  // Update local state immediately for smooth UX
  const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
  setSectionOrder(newOrder);

  try {
    setReorderingPdf(true);

    // Update backend
    await projectService.updateSectionOrder(projectId, newOrder);

    // Force PDF reload
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    setTimeout(async () => {
      await loadPdfPreview();
      setReorderingPdf(false);
    }, 500);
  } catch (err) {
    console.error('Failed to update section order:', err);
    setSectionOrder(sectionOrder); // Revert on error
    alert('Failed to update section order. Please try again.');
  }
};
```

**Features**:
- Optimistic UI update (instant visual feedback)
- Backend persistence via API call
- Auto PDF regeneration with new order
- Loading spinner during reorder
- Error handling with state revert
- Requires 5px drag distance to prevent accidental drags

### PDF Reload After Reorder

**Issue**: PDF showed "Failed to preview" briefly during reorder.

**Solution**:
- Added `reorderingPdf` state
- Shows "Reordering..." spinner instead of error
- Small delay (500ms) ensures backend generated new PDF
- Revokes old PDF URL and loads new one

### Accordion State Management

**Problem**: Sections kept expanding after drag-drop.

**Solution**:
- Changed from `defaultExpanded` to controlled `expanded` prop
- Track expansion state in `expandedSections` object
- Each section toggles independently
- State preserved during reorder
- All sections start collapsed by default

```javascript
const handleToggleSection = (sectionKey) => {
  setExpandedSections(prev => ({
    ...prev,
    [sectionKey]: !prev[sectionKey]
  }));
};

<Accordion
  expanded={expandedSections[sectionKey] || false}
  onChange={() => handleToggleSection(sectionKey)}
>
```

## Layout Redesign (NEW - Latest)

### 2-Column Layout

**Previous**: 3 columns (Job Desc | PDF | Extracted Data)
**Current**: 2 columns (PDF 60% | Extracted Data 40%) + Drawer for Job Desc

**Reason**: PDF was cut off at 100% zoom with 3-column layout.

**Implementation**:
```javascript
<Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
  {/* PDF Viewer - 60% */}
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    {/* PDF Preview */}
  </Box>

  {/* Extracted Data - 40% */}
  <Box sx={{ width: '40%', display: 'flex', flexDirection: 'column' }}>
    {/* Formatted/Raw tabs */}
  </Box>
</Box>
```

### Job Description Drawer

**Position**: Slides in from left
**Width**: 450px
**Trigger**: "Tailor Resume" button in header

**Implementation**:
```javascript
const [jobDescDrawerOpen, setJobDescDrawerOpen] = useState(false);

<Drawer
  anchor="left"
  open={jobDescDrawerOpen}
  onClose={() => setJobDescDrawerOpen(false)}
  sx={{ '& .MuiDrawer-paper': { width: '450px' } }}
>
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Header */}
    <Box sx={{ px: 2, py: 2, borderBottom: '2px solid #072D1F' }}>
      <Typography variant="h6">Job Description</Typography>
    </Box>

    {/* TextField */}
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <TextField
        fullWidth
        multiline
        rows={20}
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
    </Box>

    {/* Footer */}
    <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
      <Button onClick={() => setJobDescDrawerOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="contained"
        onClick={() => {
          handleTailorResume();
          setJobDescDrawerOpen(false);
        }}
      >
        Tailor Resume
      </Button>
    </Box>
  </Box>
</Drawer>
```

**Benefits**:
- PDF gets full 60% width (no more cutoff)
- Job description accessible via button click
- Clean, focused interface
- More space for PDF preview

## Replace Resume Functionality (Fixed)

**Location**: `pages/ProjectEditor.jsx:178-230`

**Previous Issue**: Replace resume didn't update project's JSON or PDF.

**Fixed Implementation**:
```javascript
const handleResumeUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploading(true);

  try {
    // Step 1: Upload and extract resume
    const convertedData = await resumeService.uploadResume(file);

    // Step 2: Get extracted JSON
    const resumeJson = convertedData.metadata?.resume_json;
    if (!resumeJson) {
      throw new Error('Failed to extract resume data.');
    }

    setExtractedData(resumeJson);

    // Step 3: Update project with new resume JSON
    await projectService.updateProject(projectId, {
      resume_json: resumeJson,  // NEW: Now updates project
      job_description: jobDescription,
    });

    // Step 4: Reload PDF
    await loadPdfPreview();

    alert('Resume replaced successfully!');
  } catch (err) {
    console.error('Resume upload error:', err);
    const errorMsg = err.response?.data?.detail || err.message;
    alert(`Error: ${errorMsg}`);
  } finally {
    setUploading(false);
  }
};
```

**Changes**:
- Now sends `resume_json` to backend in update call
- Backend `PUT /api/projects/{id}` endpoint accepts `resume_json`
- PDF regenerates with new content
- Better error handling showing actual error message

## API Service Updates

### Project Service

**File**: `services/projectService.js`

**New Method**:
```javascript
// Update section order
updateSectionOrder: async (projectId, sectionOrder) => {
  const response = await api.put(`/api/projects/${projectId}/section-order`, {
    section_order: sectionOrder,
  });
  return response.data;
},
```

**Updated Method**:
```javascript
// Update project (now accepts resume_json)
updateProject: async (projectId, projectData) => {
  const response = await api.put(`/api/projects/${projectId}`, projectData);
  return response.data;
},
```

### Auth Context

**File**: `context/AuthContext.jsx`

**New Method**:
```javascript
const refreshUser = async () => {
  try {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  } catch (error) {
    console.error('Failed to refresh user:', error);
  }
};

return (
  <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
    {children}
  </AuthContext.Provider>
);
```

**Usage**: Called after tailoring to update credits in navbar.

## Recent UI/UX Improvements

### Formatted View Enhancements
- ✅ Personal Information section added
- ✅ All sections start collapsed by default
- ✅ Independent accordion expansion (no auto-expand on reorder)
- ✅ Drag-and-drop reordering with smooth animations
- ✅ "CURRENT" badge on active version (green background)
- ✅ Version count chips showing tailoring history
- ✅ Clean, compact design

### Navbar Improvements
- ✅ Reduced height (64px → 48px)
- ✅ Gradient background (#072D1F → #29B770)
- ✅ Favicon added before "SkillMap" text
- ✅ Credit display with wallet icon
- ✅ Real-time credit updates
- ✅ White text/buttons for dark background

### Layout Improvements
- ✅ 2-column layout (PDF 60%, Data 40%)
- ✅ Job description in slide-out drawer
- ✅ PDF no longer cut off at 100% zoom
- ✅ More spacious, focused interface
- ✅ Better use of screen real estate

### Error Handling
- ✅ Credit validation before tailoring
- ✅ Clear error messages with actual error text
- ✅ Failed state handling for section reorder
- ✅ Revert to previous state on error
- ✅ User-friendly alerts

## Testing Checklist (Updated)

### Credit System
- [ ] Credits display correctly in navbar (1 decimal)
- [ ] Credits prevent tailoring when < 5
- [ ] Credits update after successful tailor
- [ ] Alert shows current credit balance
- [ ] refreshUser() called after tailoring

### Personal Information
- [ ] Section appears in formatted view
- [ ] Shows name, email, phone, location
- [ ] Displays header links correctly
- [ ] Can be dragged and reordered
- [ ] Collapses/expands independently

### Section Reordering
- [ ] All sections draggable except header
- [ ] Smooth drag animations
- [ ] PDF regenerates after reorder
- [ ] "Reordering..." spinner shows
- [ ] State reverts on error
- [ ] No accidental drags (5px threshold)

### Replace Resume
- [ ] File upload works
- [ ] Extracted data updates
- [ ] PDF refreshes with new content
- [ ] Error messages show properly
- [ ] File input resets after upload

### Layout
- [ ] PDF displays at full width (60%)
- [ ] Extracted data takes 40% width
- [ ] Job description drawer opens from left
- [ ] Drawer closes properly
- [ ] No horizontal scroll at 100% zoom

## Browser Compatibility (Updated)

### Tested Features
- ✅ Drag-and-drop (@dnd-kit) in Chrome, Firefox, Safari
- ✅ MUI Drawer animations smooth
- ✅ PDF iframe rendering correct
- ✅ Gradient backgrounds display properly
- ✅ Credit chip displays correctly

### Known Issues
None reported as of latest version.

## License

This project is proprietary software. All rights reserved.
