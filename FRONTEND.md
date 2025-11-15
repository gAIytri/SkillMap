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

## License

This project is proprietary software. All rights reserved.
