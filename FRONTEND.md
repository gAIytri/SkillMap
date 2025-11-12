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
│   │   └── resumeService.js
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
User pastes JD + clicks "Tailor" →
  Call /api/projects/{id}/tailor →
  Update JSON on right →
  Reload PDF with tailored content →
User downloads DOCX/PDF
```

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
  tailorProjectResume: async (projectId, jobDescription) => {...}
};
```

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
