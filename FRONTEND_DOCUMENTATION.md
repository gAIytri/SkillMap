# SkillMap Frontend Documentation

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Features & Workflows](#core-features--workflows)
5. [Styling & Theming](#styling--theming)
6. [State Management](#state-management)
7. [Authentication & Security](#authentication--security)
8. [API Integration](#api-integration)
9. [Component Architecture](#component-architecture)
10. [Responsive Design](#responsive-design)
11. [Development Setup](#development-setup)
12. [Deployment](#deployment)
13. [Known Issues & Solutions](#known-issues--solutions)

---

## Overview

SkillMap is an AI-powered resume tailoring platform with a React-based frontend. The application allows users to:
- Upload resumes in multiple formats (DOCX, PDF, Images)
- Create tailored versions for specific job applications
- Manage multiple projects with version history
- Purchase and track credit usage
- Download tailored resumes, cover letters, and email templates

---

## Tech Stack

### Core Framework
- **React 18** - Latest React version with concurrent features
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing

### UI & Styling
- **Material-UI (MUI) v5** - Complete component library
- **@emotion/react & @emotion/styled** - CSS-in-JS solution
- **react-hot-toast** - Toast notifications
- **Color Palette**: Custom green gradient theme (#072D1F → #29B770)

### State Management
- **Context API** - Global state (Auth, Projects, Admin)
- **useState & useEffect** - Local component state
- **useCallback & useMemo** - Performance optimization

### Authentication
- **JWT** - Token-based authentication
- **@react-oauth/google** - Google OAuth integration
- **localStorage** - Token and user persistence

### Data Fetching
- **Axios** - HTTP client with interceptors
- **Fetch API** - Server-Sent Events (SSE) for streaming
- **EventSource** - Real-time resume upload progress

### Drag & Drop
- **@dnd-kit/core** - Modern drag-and-drop toolkit
- **@dnd-kit/sortable** - Sortable list abstraction

### Additional Libraries
- **@mui/icons-material** - Material Design icons
- **react-quill** - Rich text editor (if used)
- **mammoth** - DOCX file handling

---

## Project Structure

```
frontend/src/
├── assets/                    # Static assets (images, logos, resume template preview)
├── components/
│   ├── common/               # Reusable components
│   │   ├── Navbar.jsx               # Navigation with credit display
│   │   ├── ProtectedRoute.jsx      # Auth guard for routes
│   │   ├── ProtectedAdminRoute.jsx # Admin-only guard
│   │   ├── ConfirmDialog.jsx       # Reusable confirmation dialog
│   │   └── ErrorBoundary.jsx       # Error handling wrapper
│   ├── auth/                 # Authentication components
│   │   ├── LoginForm.jsx            # Email/password + Google login
│   │   └── SignupForm.jsx           # Registration + Google signup
│   ├── credits/              # Credit system components
│   │   └── RechargeDialog.jsx       # Stripe credit purchase dialog
│   ├── project-editor/       # Main editor components
│   │   ├── ActionSidebar.jsx        # Left sidebar (navigation, actions)
│   │   ├── DocumentViewer.jsx       # PDF/Cover Letter/Email viewer
│   │   ├── ExtractedDataPanel.jsx   # Right panel (resume data, resizable)
│   │   ├── TailoringOverlay.jsx     # Full-screen tailoring progress modal
│   │   ├── JobDescriptionDrawer.jsx # Job description input drawer
│   │   ├── SortableSection.jsx      # Drag-and-drop wrapper
│   │   ├── PersonalInfoSection.jsx
│   │   ├── ProfessionalSummarySection.jsx
│   │   ├── ExperienceSection.jsx
│   │   ├── ProjectsSection.jsx
│   │   ├── EducationSection.jsx
│   │   ├── SkillsSection.jsx
│   │   └── CertificationsSection.jsx
│   └── admin/                # Admin dashboard components
│       ├── AdminSidebar.jsx
│       ├── OverviewSection.jsx
│       ├── UserAnalytics.jsx
│       ├── TokenAnalytics.jsx
│       └── CreditsAnalytics.jsx
├── context/                  # Global state management
│   ├── AuthContext.jsx              # User authentication state
│   ├── ProjectContext.jsx           # Global project caching
│   └── AdminContext.jsx             # Admin dashboard state
├── hooks/                    # Custom React hooks
│   ├── useTailorResume.jsx          # Resume tailoring with streaming (210 lines)
│   └── useResumeUpload.jsx          # Resume upload with SSE (95 lines)
├── pages/                    # Page components
│   ├── Landing.jsx                  # Landing page with CTA
│   ├── Dashboard.jsx                # Projects list with bulk operations
│   ├── ProjectEditor.jsx            # Main editor interface (833 lines)
│   ├── Profile.jsx                  # User profile & transaction history
│   ├── UploadResume.jsx             # Resume upload with template preview
│   ├── VerifyEmail.jsx              # Email verification page
│   ├── AdminLogin.jsx               # Admin authentication
│   └── AdminDashboard.jsx           # Admin analytics dashboard
├── services/                 # API service layer
│   ├── api.js                       # Axios instance with JWT interceptor
│   ├── authService.js               # Authentication API calls
│   ├── creditsService.js            # Credit system API
│   ├── projectService.js            # Project CRUD + tailoring
│   ├── resumeService.js             # Resume upload/extraction with SSE
│   ├── userService.js               # User profile management
│   └── adminAuthService.js          # Admin API calls
├── styles/                   # Global styles
│   ├── theme.js                     # MUI theme configuration
│   └── globalStyles.jsx             # Global CSS
├── utils/                    # Utility functions
│   └── dateUtils.js                 # Date formatting utilities
├── App.jsx                   # Root component with routing
└── main.jsx                  # Entry point
```

---

## Core Features & Workflows

### 1. User Registration & Authentication

#### Registration Flow
```
User fills signup form
   ↓
Backend creates user (email_verified: false)
   ↓
Verification email sent (6-digit code + magic link)
   ↓
Frontend redirects to /verify-email
   ↓
User enters code OR clicks magic link
   ↓
Email verified → Auto-login → Dashboard
```

**Components**: `SignupForm.jsx`, `VerifyEmail.jsx`, `AuthContext.jsx`

**Features**:
- Email/password registration
- Google OAuth integration
- Email validation: `/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/`
- Password validation: Minimum 8 characters
- Confirm password matching
- Real-time validation feedback

#### Login Flow
```
User enters credentials
   ↓
Backend validates password
   ↓
If unverified: Generate NEW code → Send email → Redirect to verification
   ↓
If verified: Store JWT + user → Redirect to dashboard
```

**Components**: `LoginForm.jsx`, `AuthContext.jsx`

**Features**:
- Email/password login
- Google OAuth login
- Automatic verification email resend for unverified users
- Account linking (password user can link Google account)

---

### 2. Multi-Format Resume Upload

**Supported Formats**: DOCX, DOC, PDF, JPG, JPEG, PNG, BMP, TIFF

**Upload Flow**:
```
Select file → Validate format & size →
Upload with SSE streaming →
Real-time status messages →
OCR if needed (for images/scanned PDFs) →
AI extraction with OpenAI →
Success → Navigate to Dashboard
```

**Component**: `UploadResume.jsx`

**Features**:
- Drag-and-drop file upload
- File validation (format + size)
- Real-time streaming status via SSE
- Template preview (shows expected output)
- OCR indicator for image extraction
- Progress bar and status list
- Auto-redirect on completion

**Status Messages**:
- "Uploading file..."
- "Extracting text from DOCX..."
- "Switching to OCR for better extraction..." (if needed)
- "Successfully extracted N characters"
- "Analyzing resume content with AI..."
- "Resume extraction completed successfully!"

---

### 3. Dashboard & Project Management

**Component**: `Dashboard.jsx`

**Features**:
- Project cards grid (responsive)
- Create new project with dialog
- Bulk selection mode (select multiple projects)
- Bulk delete with confirmation
- Search/filter functionality
- Welcome message for new users (100 free credits)
- Empty state for no projects
- Base resume protection (redirects to upload if missing)

**Global Project Caching**:
- Projects fetched once on first load
- Cached in `ProjectContext` across navigation
- Smart updates on create/delete/edit
- Instant loading when returning from ProjectEditor
- No flash of "No projects" screen

**Bulk Operations**:
```
Click "Select" button → Enter selection mode
   ↓
Select individual projects OR "Select All"
   ↓
Click "Delete Selected" → Confirmation → Bulk delete
   ↓
Exit selection mode
```

---

### 4. Project Editor - Main Interface

**Component**: `ProjectEditor.jsx` (833 lines, refactored from 2200+)

**Layout**:
- **Desktop/Tablet**: Sidebar (10%) + PDF (50%) + Extracted Data (40%)
- **Mobile**: Full-width PDF with slide-in drawers

**Main Features**:

#### A. Document Viewer (`DocumentViewer.jsx`)
- **Tabs**: Resume (PDF) | Cover Letter | Email
- **PDF Preview**: Zoom controls (60-200%)
- **Download**: PDF/DOCX options (context-aware per tab)
- **Copy Buttons**: Copy cover letter & email to clipboard
- **Compile Button**: Manual PDF regeneration

#### B. Extracted Data Panel (`ExtractedDataPanel.jsx`)
- **Resizable**: Drag left edge to resize (25%-45%)
- **Tabs**: Formatted View | Raw JSON
- **Drag Handle**: Green highlight on hover
- **Smooth Resizing**: Works over PDF iframe
- **Mobile**: Slide-in drawer with FAB toggle

#### C. Action Sidebar (`ActionSidebar.jsx`)
- **Desktop**: Fixed left sidebar (10% width, 140-180px)
- **Mobile**: Slide-in drawer from left
- **Actions**:
  - Back to Dashboard
  - Tailor Resume (opens job description drawer)
  - Download (PDF/DOCX - context-aware)
  - Replace Resume
  - Compile PDF

---

### 5. Resume Tailoring System

**Hook**: `useTailorResume.jsx` (210 lines)

**Tailoring Flow**:
```
User clicks "Tailor Resume" → Job Description Drawer opens
   ↓
Enter job description → Click "Tailor"
   ↓
Credit check (requires 5 credits minimum)
   ↓
Show TailoringOverlay with progress
   ↓
SSE streaming: Real-time agent messages
   ↓
Resume complete → Close overlay → Load PDF
   ↓
Cover letter & email generate (shown in tabs)
   ↓
Version history updates → Auto-switch to latest version
   ↓
Credits deducted based on token usage
```

**Agent Streaming Messages**:
- `{type: "status", message: "Analyzing job requirements...", step: "initialization"}`
- `{type: "tool_result", tool: "validate_intent", data: {...}}`
- `{type: "tool_result", tool: "summarize_job_description", data: {...}}`
- `{type: "tool_result", tool: "tailor_resume_content", data: {...}}`
- `{type: "resume_complete", tailored_json: {...}}`
- `{type: "cover_letter_complete", cover_letter: "..."}`
- `{type: "email_complete", email: {...}}`
- `{type: "final", success: true, tokens_used: 4200}`

**Components**: `TailoringOverlay.jsx`, `JobDescriptionDrawer.jsx`, `useTailorResume.jsx`

---

### 6. Version History System

**Tracked Sections**:
- Professional Summary
- Work Experience
- Projects
- Skills

**Features**:
- **Selective Versioning**: Only changed sections get new versions
- **Version Tabs**: Switch between V0, V1, V2, etc.
- **Auto-Switch**: Automatically shows latest version after tailoring
- **Restore Version**: "Make This Current" button to revert
- **Hide When Single**: Version bar hidden if only V0 exists
- **Edit Protection**: Auto-switches to current version when editing

**Components**: `ProfessionalSummarySection.jsx`, `ExperienceSection.jsx`, `ProjectsSection.jsx`, `SkillsSection.jsx`

---

### 7. Section Editing & Management

#### Personal Info Section
- **Fields**: Name, Current Role, Email, Phone, Location, Header Links
- **Delete Buttons**: All fields except Name
- **Validation**: Name is required
- **Viewing Mode**: Displays current role in italic

#### Professional Summary Section
- **Multiline Editor**: 15 rows
- **Version History**: Accordion with timestamps
- **Save/Cancel**: Inline actions

#### Experience Section
- **Edit Mode**: Company, position, dates, location
- **Bullets**: Add/delete individual bullets
- **Delete Icons**: Positioned close to text fields (8px gap)
- **Version History**: Compare changes across versions
- **Auto-Switch**: Switches to current version when editing

#### Projects Section
- **Drag & Drop Reordering**: Optimistic UI update
- **Edit Mode**: Name, dates, description, bullets
- **3-Step Reordering**: Uses @dnd-kit sortable
- **Backend Persistence**: Section order saved to API
- **Manual Compile**: Regenerate PDF after reordering

#### Skills Section
- **Categories**: Add/remove skill categories
- **Skills**: Add/remove individual skills per category
- **Validation**: Category name & at least one skill required
- **Reordering**: Drag categories within section

#### Education Section
- **Fields**: Institution, degree, field, dates, GPA
- **GPA Out of**: Number-only input with decimal support
- **Label**: Always visible (shrink: true)
- **Mobile**: Numeric keyboard for GPA fields

#### Certifications Section
- **Fields**: Name, issuing organization, date
- **Optional Section**: Can be empty

---

### 8. Credits System

**Display Locations**:
- **Navbar**: Always-visible chip showing balance (e.g., "93.5 Credits")
- **Profile Page**: Large balance display + transaction history
- **Pre-Tailor Check**: Requires 5 credits minimum

**Recharge Dialog** (`RechargeDialog.jsx`):
- **Packages**:
  - 50 credits: $5.00
  - 100 credits: $9.00 (10% savings)
  - 250 credits: $20.00 (20% savings)
  - 500 credits: $35.00 (30% savings)
- **Stripe Integration**: Checkout session redirect
- **Modes**:
  - Blocking mode (when credits < 5)
  - Optional mode (recharge anytime)

**Transaction History** (`Profile.jsx`):
- **Columns**: Date, Type, Description, Amount, Balance After, Tokens Used
- **Types**: Purchase, Tailor, Grant, Refund, Bonus
- **Pagination**: Supported for large histories
- **Auto-Refresh**: On page load and after payment

**Credit Validation**:
```javascript
if (user.credits < 5) {
  setShowRechargeDialog(true);
  return; // Block tailoring
}
```

---

### 9. Download System

**Centralized in Action Sidebar**:
- **Resume Tab**: Download resume PDF/DOCX
- **Cover Letter Tab**: Download cover letter PDF/DOCX
- **Email Tab**: Download button hidden (use "Copy Email" instead)

**Download Handlers** (`ProjectEditor.jsx`):
```javascript
handleDownloadPDF()   // Context-aware: resume or cover letter
handleDownloadDOCX()  // Context-aware: resume or cover letter
```

**Features**:
- **Context-Aware**: Downloads current tab's document
- **Proper Filenames**: `{project_name}.pdf` or `{project_name}_cover_letter.pdf`
- **Loading State**: Button shows "Downloading..." with spinner
- **Error Handling**: Toast notification on failure

---

### 10. Responsive Design

**Breakpoints** (MUI):
- **Mobile**: < 600px (xs)
- **Tablet**: 600px - 1200px (sm-md)
- **Desktop**: > 1200px (lg-xl)

**Responsive Features**:

#### Navbar
- **Desktop**: Full layout with all buttons
- **Tablet**: Same as desktop
- **Mobile**:
  - Smaller buttons (reduced padding)
  - Dashboard button hidden (moved to menu)
  - Credits chip smaller (no "Credits" text)
  - Avatar 32px
  - Very Small (<400px): Credits chip hidden

#### Landing Page
- **Auth-based CTAs**:
  - Not logged in: "Get Started Free" (signup incentive)
  - Logged in without base resume: "Upload Resume"
  - Logged in with base resume: "Go to Dashboard"
- **Signup Incentive Badges**: Shown to non-logged-in users

#### Dashboard
- **Desktop**: Projects grid (3-4 columns)
- **Tablet**: Projects grid (2 columns)
- **Mobile**:
  - Projects grid (1 column)
  - Header stacks vertically
  - "New Project" button full width
  - Reduced padding (py: 2 vs 4)

#### ProjectEditor
- **Desktop**: Sidebar (10%) + PDF (50%) + Data Panel (40%)
- **Tablet**: Same layout with resizable data panel
- **Mobile**:
  - Full-width PDF
  - Action Sidebar → Slide-in drawer
  - Data Panel → Slide-in drawer with FAB toggle
  - Header height 48px (vs 40px desktop)
  - Smaller buttons (font: 0.65rem)
  - "Tailor Resume" → "Tailor"
  - Project name truncates with ellipsis

---

## Styling & Theming

### Color Palette

**Primary Colors**:
```javascript
{
  darkGreen: '#072D1F',
  brightGreen: '#29B770',
  lightGreen: '#E7FBF0',
  mediumGreen: '#4CAF50'
}
```

**Secondary Colors**:
```javascript
{
  beige: '#F4EFE9',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080'
}
```

**Accent Colors**:
```javascript
{
  blue: '#1976d2',    // Info/links
  red: '#d32f2f',     // Errors/delete
  yellow: '#ffa000',  // Warnings
  orange: '#f57c00'   // Alerts
}
```

### MUI Theme Configuration

**File**: `src/styles/theme.js`

```javascript
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#29B770',        // Bright green
      dark: '#072D1F',        // Dark green
      light: '#E7FBF0',       // Light green
      contrastText: '#fff',
    },
    secondary: {
      main: '#4CAF50',
      contrastText: '#fff',
    },
    background: {
      default: '#F4EFE9',     // Beige
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: "'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 600, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 500, fontSize: '1.25rem' },
    h6: { fontWeight: 500, fontSize: '1rem' },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.875rem' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export default theme;
```

### Toast Notification Styling

**Library**: react-hot-toast

```javascript
<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: {
      fontFamily: 'Poppins',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    },
    success: {
      style: { background: '#4CAF50', color: '#fff' },
    },
    error: {
      style: { background: '#d32f2f', color: '#fff' },
    },
    loading: {
      style: { background: '#1976d2', color: '#fff' },
    },
  }}
/>
```

### Global Styles

**File**: `src/styles/globalStyles.jsx`

- Reset margins/padding
- Box-sizing: border-box
- Smooth scrolling
- Custom scrollbar styling (if applicable)

---

## State Management

### 1. AuthContext

**File**: `src/context/AuthContext.jsx`

**State**:
```javascript
{
  user: null | {
    id, email, full_name, credits, base_resume_id,
    email_verified, profile_picture_url, google_id
  },
  loading: true | false,
  isAuthenticated: boolean
}
```

**Methods**:
- `login(credentials)` - Email/password login
- `register(userData)` - User registration
- `googleLogin(idToken)` - Google OAuth login
- `logout()` - Clear user state and tokens
- `refreshUser()` - Fetch fresh user data from API (memoized with useCallback)

**Critical Implementation**:
```javascript
const refreshUser = useCallback(async () => {
  const profile = await userService.getCurrentProfile();
  setUser(profile);
  localStorage.setItem('user', JSON.stringify(profile));
  return profile;
}, []);
```

**Bug Fix**: Memoized to prevent infinite re-renders on Profile page

---

### 2. ProjectContext

**File**: `src/context/ProjectContext.jsx`

**State**:
```javascript
{
  projects: [],
  loading: false,
  hasFetched: false
}
```

**Methods**:
- `fetchProjects(force = false)` - Smart fetch (returns cached if already fetched)
- `addProject(project)` - Add to cache
- `updateProject(id, updates)` - Update in cache
- `deleteProject(id)` - Remove from cache
- `refreshProjects()` - Force refresh from API
- `clearCache()` - Reset cache

**Performance Benefits**:
- Projects fetched only once on first Dashboard visit
- Instant loading when navigating back from ProjectEditor
- No flash of "No projects" screen
- Smart cache updates on create/delete/edit

---

### 3. AdminContext

**File**: `src/context/AdminContext.jsx`

**State**:
```javascript
{
  admin: null | { username, role },
  loading: true | false,
  isAuthenticated: boolean
}
```

**Methods**:
- `login(credentials)` - Admin login
- `logout()` - Clear admin state
- `refreshAdmin()` - Fetch fresh admin data

---

## Authentication & Security

### JWT Token Management

**Storage**: `localStorage`
- `access_token`: JWT token
- `user`: User object (JSON string)

**Axios Interceptor** (`services/api.js`):
```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - logout user
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

### Protected Routes

**Component**: `ProtectedRoute.jsx`

```javascript
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <CircularProgress />;

  // Not logged in → redirect to landing
  if (!user) return <Navigate to="/" replace />;

  // Logged in but email not verified → redirect to verification
  if (!user.email_verified) {
    return <Navigate to="/verify-email" state={{ email: user.email }} replace />;
  }

  // User is logged in AND verified → allow access
  return children;
};
```

**Multi-Layer Protection**:
1. Frontend: ProtectedRoute blocks navigation
2. Frontend: AuthContext blocks state management
3. Frontend: authService blocks token storage for unverified users
4. Backend: Middleware blocks API calls for unverified users

### Email Verification Enforcement

**Registration Flow**:
```
Signup → User created (email_verified: false)
   ↓
Verification email sent (code + magic link)
   ↓
Frontend does NOT log user in
   ↓
Redirects to /verify-email
   ↓
User verifies → Auto-login → Dashboard
```

**Unverified Login Flow**:
```
Login attempt → Backend validates password
   ↓
Detects email_verified: false
   ↓
Generates NEW code → Sends fresh email
   ↓
Returns response with email_verified: false
   ↓
Frontend does NOT store token
   ↓
Shows toast: "New code sent"
   ↓
Redirects to /verify-email
```

**Google OAuth**: Automatically verified (no email verification needed)

---

## API Integration

### Service Layer Architecture

**Base API Client** (`services/api.js`):
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' }
});

// JWT interceptor (adds Authorization header)
// 401 handler (auto-logout on unauthorized)

export default api;
```

### Service Files

#### authService.js
```javascript
{
  register: async (userData) => POST /api/auth/register,
  login: async (credentials) => POST /api/auth/login,
  googleLogin: async (idToken) => POST /api/auth/google,
  getCurrentUser: async () => GET /api/auth/me,
  logout: () => clear localStorage
}
```

#### projectService.js
```javascript
{
  getAllProjects: async () => GET /api/projects,
  getProject: async (id) => GET /api/projects/{id},
  createProject: async (data) => POST /api/projects,
  updateProject: async (id, data) => PUT /api/projects/{id},
  updateSectionOrder: async (id, order) => PUT /api/projects/{id}/section-order,
  deleteProject: async (id) => DELETE /api/projects/{id},
  tailorResumeWithAgent: async (id, jd) => POST /api/projects/{id}/tailor-with-agent (SSE),
  getProjectPDF: async (id) => GET /api/projects/{id}/pdf,
  downloadDOCX: async (id) => GET /api/projects/{id}/docx
}
```

#### resumeService.js
```javascript
{
  uploadResume: async (file, onMessage) => POST /api/resumes/upload (SSE),
  getBaseResume: async () => GET /api/resumes/base
}
```

**SSE Upload Example**:
```javascript
const result = await resumeService.uploadResume(file, (message) => {
  if (message.type === 'status') {
    setStatusMessages(prev => [...prev, message.message]);
  }
});
```

#### creditsService.js
```javascript
{
  getBalance: async () => GET /api/credits/balance,
  getTransactions: async (limit, offset) => GET /api/credits/transactions,
  getPackages: async () => GET /api/credits/packages,
  createCheckoutSession: async (credits) => POST /api/credits/create-checkout-session
}
```

#### userService.js
```javascript
{
  getCurrentProfile: async () => GET /api/users/me,
  updateProfile: async (data) => PUT /api/users/me,
  deleteAccount: async () => DELETE /api/users/me
}
```

**Critical**: `getCurrentProfile()` syncs localStorage with API to ensure navbar shows updated credits

---

## Component Architecture

### Component Extraction Strategy

**ProjectEditor.jsx Refactoring**:
- **Before**: 2200+ lines monolithic component
- **After**: 833 lines with 12+ extracted components
- **Reduction**: 62% (1367 lines removed)

**Extracted Components**:
1. `ActionSidebar.jsx` - Sidebar navigation
2. `DocumentViewer.jsx` - PDF/Cover Letter/Email viewer
3. `ExtractedDataPanel.jsx` - Resume data panel
4. `TailoringOverlay.jsx` - Tailoring progress modal
5. `JobDescriptionDrawer.jsx` - Job input drawer
6. `SortableSection.jsx` - Drag-and-drop wrapper
7. 7 section components (Personal Info, Summary, Experience, etc.)

**Custom Hooks**:
1. `useTailorResume.jsx` (210 lines) - Tailoring logic with SSE streaming
2. `useResumeUpload.jsx` (95 lines) - Upload with validation

**Utility Functions**:
- `dateUtils.js` - `formatTimestamp(isoString)` for readable dates

---

### Reusable Components

#### ConfirmDialog.jsx
```javascript
<ConfirmDialog
  open={showDialog}
  onClose={() => setShowDialog(false)}
  onConfirm={handleDelete}
  title="Delete Project"
  message="Are you sure you want to delete this project?"
  confirmText="Delete"
  cancelText="Cancel"
  confirmColor="error"
/>
```

#### RechargeDialog.jsx
```javascript
<RechargeDialog
  open={showRechargeDialog}
  onClose={() => setShowRechargeDialog(false)}
  isBlocking={user.credits < 5}
  currentBalance={user.credits}
/>
```

#### ErrorBoundary.jsx
```javascript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Variables

Create `.env` file:
```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Development Server

```bash
npm run dev
# App available at http://localhost:5173
```

### Build for Production

```bash
npm run build
# Output in dist/
```

### Linting

```bash
npm run lint
```

---

## Deployment

### Current Deployment
- **Platform**: Vercel
- **URL**: https://skill-map-six.vercel.app
- **Auto-deploy**: On push to main branch

### Vercel Configuration

**Framework Preset**: Vite
**Build Command**: `npm run build`
**Output Directory**: `dist`
**Root Directory**: `frontend`

**Environment Variables** (Vercel Dashboard):
```bash
VITE_API_URL=https://skillmap-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=your-production-client-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

### SPA Routing

Create `vercel.json` in project root:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

### Deployment Steps

1. Push code to GitHub main branch
2. Vercel auto-deploys (1-2 minutes)
3. Check deployment status in Vercel dashboard
4. Verify production URL

---

## Known Issues & Solutions

### 1. Credits Not Updating in Navbar

**Problem**: Credits added to database but navbar shows old value

**Solution**: Fixed by updating `refreshUser()` to sync localStorage

**File**: `AuthContext.jsx`
```javascript
const refreshUser = useCallback(async () => {
  const profile = await userService.getCurrentProfile();
  setUser(profile);
  localStorage.setItem('user', JSON.stringify(profile)); // ← Sync localStorage
  return profile;
}, []);
```

---

### 2. Profile Page Infinite Refresh Loop

**Problem**: Non-stop fetches and re-renders on Profile page

**Solution**:
1. Memoized `refreshUser()` with `useCallback` in AuthContext
2. Split useEffect into two separate effects (initial load + payment redirect)
3. Initial load runs only once with empty dependencies

---

### 3. Navbar Shows Credits Before User Logs In

**Problem**: Navbar displays "0.0 Credits" before authentication

**Solution**: Changed condition from `isAuthenticated` to `isAuthenticated && user`

**File**: `Navbar.jsx`
```javascript
{isAuthenticated && user ? (
  <Chip label={`${user.credits?.toFixed(1)} Credits`} ... />
) : null}
```

---

### 4. Navbar Overflow on Mobile

**Problem**: Navbar elements overflow and cause horizontal scroll

**Solution**:
1. Reduced button sizes and padding on mobile
2. Hidden Dashboard button on mobile (moved to menu)
3. Shortened credit chip text on mobile
4. Added `overflow: hidden` to container

---

### 5. Version Switching Immediately Reverts to Latest

**Problem**: When user clicks on version 0, it immediately switches back to version 1

**Root Cause**: `onViewingVersionChange` in useEffect dependencies caused infinite loop

**Solution**: Removed `onViewingVersionChange` from dependency array

**Files**: All section components with version history
```javascript
// BEFORE (Caused infinite loop)
useEffect(() => {
  setViewingVersion(currentVersion);
  if (onViewingVersionChange) onViewingVersionChange(currentVersion);
}, [currentVersion, onViewingVersionChange]); // ❌

// AFTER (Fixed)
useEffect(() => {
  setViewingVersion(currentVersion);
  if (onViewingVersionChange) onViewingVersionChange(currentVersion);
}, [currentVersion]); // ✅
```

---

### 6. CORS Errors

**Problem**: API requests blocked by CORS policy

**Solution**: Ensure backend `CORS_ORIGINS` includes `http://localhost:5173`

---

### 7. PDF Not Loading

**Problem**: PDF preview blank or downloads instead of displaying

**Solution**: Check backend LibreOffice installation

---

### 8. Google OAuth "Error 401: invalid_client"

**Problem**: OAuth popup shows error

**Solution**: Add `http://localhost:5173` to Google Cloud Console authorized origins

---

### 9. Stripe Checkout Redirects But No Credits

**Problem**: Payment succeeds but credits don't update

**Solution**:
1. Check `stripe listen` is running
2. Verify webhook secret matches `.env`
3. Wait 5-10 seconds for webhook processing
4. Check browser console for errors

---

## Performance Optimizations

### 1. Global Project Caching
- Projects fetched once on first Dashboard visit
- Cached in `ProjectContext` across navigation
- Instant loading when returning from ProjectEditor

### 2. Memoization
- `refreshUser()` memoized with `useCallback`
- Prevents unnecessary re-renders and API calls

### 3. Lazy Loading
- Components loaded on-demand with React.lazy (if implemented)
- Code splitting with Vite

### 4. Optimistic UI Updates
- Project deletion shows immediate feedback
- Section reordering updates UI instantly
- Backend sync happens in background

### 5. Debouncing & Throttling
- Resize events throttled for smooth performance
- Search input debounced (if implemented)

---

## Testing Checklist

### Authentication
- [ ] Register new account → Receive verification email
- [ ] Verify email with code → Auto-login
- [ ] Verify email with magic link → Auto-login
- [ ] Login with unverified account → Receive new code
- [ ] Google OAuth signup → Auto-verified
- [ ] Google OAuth login → Direct access
- [ ] Logout → Redirects to landing page

### Resume Upload
- [ ] Upload DOCX → Extraction successful
- [ ] Upload PDF → Extraction successful
- [ ] Upload image (JPG/PNG) → OCR used
- [ ] Drag and drop file → Works correctly
- [ ] Invalid file format → Error shown
- [ ] File too large → Error shown

### Dashboard
- [ ] First load → Projects fetch from API
- [ ] Navigate to ProjectEditor and back → Projects load instantly
- [ ] Create project → Appears in list
- [ ] Delete project → Removes from list
- [ ] Bulk select and delete → Deletes multiple projects
- [ ] Search projects → Filters correctly

### Project Editor
- [ ] Load project → PDF displays
- [ ] Tailor resume → Progress overlay shows
- [ ] Version history → Can switch between versions
- [ ] Restore version → "Make This Current" works
- [ ] Edit section → Save updates database
- [ ] Reorder sections → PDF regenerates
- [ ] Download PDF → File downloads
- [ ] Download DOCX → File downloads

### Credits System
- [ ] Credit balance shows in navbar
- [ ] Recharge dialog opens
- [ ] Stripe payment flow works
- [ ] Credits update after payment
- [ ] Transaction history displays
- [ ] Low balance warning appears

### Responsive Design
- [ ] Mobile view (< 600px) → Drawers work
- [ ] Tablet view (600-1200px) → Layout correct
- [ ] Desktop view (> 1200px) → All features visible
- [ ] Navbar adapts to screen size
- [ ] Dashboard grid responsive
- [ ] ProjectEditor layout responsive

---

## Browser Support

- **Chrome/Edge**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Opera**: 76+

---

## Credits

**Platform**: SkillMap - AI Resume Tailoring Platform
**Repository**: https://github.com/gAIytri/SkillMap
**Frontend Framework**: React 18 + Vite
**UI Library**: Material-UI (MUI) v5

---

**Last Updated**: November 29, 2025
