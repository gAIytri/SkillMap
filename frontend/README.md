# SkillMap Frontend

React-based frontend for AI-powered resume tailoring with Stripe credit system.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Notifications**: react-hot-toast
- **OAuth**: @react-oauth/google
- **PDF Viewer**: @react-pdf/renderer
- **Icons**: Material Icons

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create `.env` file:

```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id  # Optional
```

### Development Server

```bash
# Start dev server with hot reload
npm run dev

# App will be available at http://localhost:5173
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/src/
├── assets/              # Images, logos, favicons
│   ├── logo.png
│   └── favicon.svg
├── components/          # Reusable components
│   ├── common/
│   │   ├── Navbar.jsx              # Main navigation bar
│   │   └── ProtectedRoute.jsx     # Auth guard
│   ├── credits/
│   │   └── RechargeDialog.jsx     # Credit purchase dialog
│   ├── Footer.jsx
│   └── LoginBox.jsx
├── context/             # React Context providers
│   └── AuthContext.jsx             # User auth & state
├── pages/               # Page components
│   ├── AuthPage.jsx                # Unified auth page
│   ├── Dashboard.jsx               # Projects list
│   ├── Landing.jsx                 # Landing page
│   ├── Login.jsx                   # Login page
│   ├── Profile.jsx                 # User profile & transactions
│   ├── ProjectEditor.jsx           # Tailor resume interface
│   ├── Register.jsx                # Registration page
│   ├── ResumeViewer.jsx            # PDF preview
│   └── UploadResume.jsx            # Resume upload
├── services/            # API clients
│   ├── api.js                      # Axios instance
│   ├── authService.js              # Authentication API
│   ├── creditsService.js           # Credits API
│   ├── projectService.js           # Projects API
│   ├── resumeService.js            # Resumes API
│   └── userService.js              # User profile API
├── styles/              # Styling
│   ├── globalStyles.jsx
│   └── theme.js                    # MUI theme & colors
├── App.jsx              # Root component with routing
└── main.jsx             # Entry point
```

## Key Components

### AuthContext

Manages user authentication state across the app.

**Features**:
- Login/logout/register functions
- Google OAuth integration
- JWT token management
- User state with credits
- `refreshUser()` - Fetch fresh user data from API

**Critical Fix**: `refreshUser()` now syncs both React state AND localStorage to ensure navbar shows updated credits.

```javascript
const refreshUser = async () => {
  try {
    const profile = await userService.getCurrentProfile();
    setUser(profile);
    // CRITICAL: Update localStorage so it stays in sync
    localStorage.setItem('user', JSON.stringify(profile));
    return profile;
  } catch (error) {
    console.error('Failed to refresh user:', error);
    return null;
  }
};
```

### Navbar

Main navigation component with credit display.

**Features**:
- Logo and branding
- Dashboard link
- Credit balance chip (always visible)
- User menu with profile dropdown

**Credit Display**:
```javascript
<Chip
  icon={<AccountBalanceWalletIcon />}
  label={`${user?.credits?.toFixed(1) || '0.0'} Credits`}
  sx={{ bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' }}
/>
```

### Profile Page

User profile with credit balance and transaction history.

**Features**:
- User info (name, email, avatar)
- Current credit balance (large display)
- Recharge Credits button
- Transaction history table with:
  - Date
  - Type (Purchase/Tailor/Grant/Refund/Bonus)
  - Description
  - Amount (+/-)
  - Balance after
  - Tokens used

**Auto-refresh**: Calls `refreshUser()` on page load to ensure fresh data.

**Payment Redirect Handling**:
- Detects `?payment=success` or `?payment=cancelled` query params
- Shows success/error toast notification
- Cleans up URL after showing notification
- Uses `useRef` to prevent duplicate toasts in React StrictMode

### RechargeDialog

Modal dialog for purchasing credits via Stripe.

**Features**:
- Displays current credit balance
- Shows available packages (50, 100, 250, 500 credits)
- Package selection with pricing
- Savings badges for bulk packages
- Stripe Checkout redirect
- Blocking mode (when credits too low)
- Non-blocking mode (optional recharge)

**Usage**:
```javascript
<RechargeDialog
  open={rechargeDialogOpen}
  onClose={() => setRechargeDialogOpen(false)}
  currentCredits={user.credits}
  blocking={false}
/>
```

### ProjectEditor

Main interface for tailoring resumes.

**Features**:
- Job description input
- Company/position fields
- Tailor button (triggers AI agent)
- Real-time streaming progress
- Server-Sent Events (SSE) for live updates
- Credit refresh after tailoring
- Low balance warning dialog
- PDF/DOCX download buttons
- Cover letter & email generation

**Tailoring Flow**:
1. User enters job description
2. Clicks "Tailor with AI Agent"
3. SSE stream shows real-time progress:
   - "Validating input..."
   - "Summarizing job description..."
   - "Tailoring resume..."
4. On completion, refreshes user credits
5. Shows low balance warning if credits < 10

**Credit Refresh**:
```javascript
// After successful tailoring
if (refreshUser) {
  const freshUser = await refreshUser();
  if (freshUser && freshUser.credits < 10.0) {
    setShowRechargeDialog(true);  // Show low balance warning
  }
}
```

### Dashboard

Lists all user's projects.

**Features**:
- Project cards with company/position
- Tailored status indicator
- Edit/delete actions
- Create new project button
- Empty state for new users

## Services

### authService

Handles authentication operations.

**Functions**:
- `register(userData)` - Create account
- `login(credentials)` - Email/password login
- `googleLogin(idToken)` - Google OAuth login
- `logout()` - Clear tokens
- `getCurrentUser()` - Get user from localStorage
- `isAuthenticated()` - Check if logged in

### creditsService

Manages credit operations.

**Functions**:
- `getBalance()` - Get current credit balance
- `getTransactions(limit, offset)` - Get transaction history (paginated)
- `getPackages()` - Get available credit packages
- `createCheckoutSession(credits)` - Create Stripe checkout session

### userService

User profile operations.

**Functions**:
- `getCurrentProfile()` - Get fresh user data from API (includes updated credits)
- `updateProfile(profileData)` - Update user info
- `deleteAccount()` - Delete user account

### projectService

Project CRUD operations.

**Functions**:
- `getAllProjects()` - List user's projects
- `getProject(id)` - Get project details
- `createProject(data)` - Create new project
- `updateProject(id, data)` - Update project
- `deleteProject(id)` - Delete project
- `tailorResume(id, jobDescription)` - Tailor resume (old)
- `tailorResumeWithAgent(id, updates)` - Tailor with agent (SSE stream)
- `getProjectPDF(id)` - Get PDF URL
- `downloadDOCX(id)` - Download DOCX file

### resumeService

Resume upload and management.

**Functions**:
- `uploadResume(file)` - Upload .docx resume
- `getBaseResume()` - Get user's base resume

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
  <Route path="/resume-viewer/:id" element={
    <ProtectedRoute><ResumeViewer /></ProtectedRoute>
  } />
  <Route path="/profile" element={
    <ProtectedRoute><Profile /></ProtectedRoute>
  } />
</Routes>
```

## State Management

Uses React Context API for global state.

### AuthContext

```javascript
const {
  user,           // Current user object
  loading,        // Initial load state
  login,          // Login function
  register,       // Register function
  googleLogin,    // Google login function
  logout,         // Logout function
  refreshUser,    // Refresh user data
  isAuthenticated // Boolean auth status
} = useAuth();
```

## Styling

### MUI Theme

Defined in `styles/theme.js`:

```javascript
export const colorPalette = {
  primary: '#29B770',
  primaryDark: '#072D1F',
  secondary: '#F4F4F4',
  // ... more colors
};
```

### Global Styles

Defined in `styles/globalStyles.jsx` using MUI's `GlobalStyles` component.

## User Flows

### 1. First-Time User

```
Landing Page
  ↓
Register
  ↓
Upload Resume
  ↓
Dashboard (empty)
  ↓
Create Project
  ↓
Enter Job Description
  ↓
Tailor Resume
  ↓
Download DOCX/PDF
```

### 2. Returning User

```
Login
  ↓
Dashboard (with projects)
  ↓
Select Project
  ↓
Tailor / View / Download
```

### 3. Credit Purchase

```
Profile Page
  ↓
Click "Recharge Credits"
  ↓
Select Package
  ↓
Redirect to Stripe Checkout
  ↓
Complete Payment
  ↓
Redirect back to Profile
  ↓
See Success Notification
  ↓
Credits Updated in Navbar
```

## Important Implementation Details

### localStorage Sync Issue (FIXED)

**Problem**: Credits updated in database but navbar still showed old value.

**Root Cause**:
- Navbar reads `user.credits` from AuthContext
- AuthContext loads initial user from localStorage
- `refreshUser()` updated React state but NOT localStorage
- On page refresh, old localStorage data was loaded

**Solution**:
```javascript
// In AuthContext.jsx
const refreshUser = async () => {
  const profile = await userService.getCurrentProfile();
  setUser(profile);  // Update React state
  localStorage.setItem('user', JSON.stringify(profile));  // Sync localStorage
  return profile;
};
```

### Infinite Loop Prevention

**Problem**: Profile page made infinite API calls after payment redirect.

**Root Cause**: `refreshUser` function in useEffect dependency array caused infinite re-renders.

**Solution**:
```javascript
useEffect(() => {
  // ... payment handling
  if (payment && !hasShownToast.current) {
    hasShownToast.current = true;  // Prevent duplicate toasts
    if (refreshUser) {
      refreshUser();  // Called but not in dependencies
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [searchParams]);  // ONLY searchParams in dependencies
```

### React StrictMode Double Toast

**Problem**: Success notification shown twice in development.

**Solution**: Use `useRef` to track if toast already shown:
```javascript
const hasShownToast = useRef(false);

if (payment && !hasShownToast.current) {
  hasShownToast.current = true;
  toast.success('Payment successful!');
}
```

## Common Issues

### Credits Not Updating in Navbar

**Problem**: Credits added to database but navbar shows old value.

**Solution**: Fixed by updating `refreshUser()` to sync localStorage (see above).

### CORS Errors

**Problem**: API requests blocked by browser.

**Solution**: Ensure backend `CORS_ORIGINS` includes `http://localhost:5173`.

### PDF Not Loading

**Problem**: PDF preview shows blank or downloads instead of previewing.

**Solution**: Check that backend LibreOffice is installed and PDF endpoint returns correct Content-Type.

### Google OAuth Not Working

**Problem**: "Invalid client ID" error.

**Solution**:
1. Get client ID from Google Cloud Console
2. Add `http://localhost:5173` to authorized origins
3. Set `VITE_GOOGLE_CLIENT_ID` in `.env`

## Testing

### Manual Testing

```bash
# Start development server
npm run dev

# Test flows:
1. Register new account
2. Upload resume
3. Create project
4. Tailor resume
5. Purchase credits
6. View transaction history
```

### Stripe Testing

Use Stripe test cards in checkout:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

## Build & Deployment

### Production Build

```bash
# Create optimized build
npm run build

# Output: dist/ folder
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or connect GitHub repo to Vercel dashboard
```

### Deploy to Netlify

```bash
# Build command
npm run build

# Publish directory
dist

# Environment variables
VITE_API_URL=https://your-api-domain.com
```

### Environment Variables (Production)

Update `.env.production`:
```bash
VITE_API_URL=https://api.yourdomain.com
VITE_GOOGLE_CLIENT_ID=your-production-client-id
```

## Performance Optimizations

- **Code Splitting**: React.lazy() for route-based splitting
- **Memoization**: Use React.memo() for expensive components
- **Debouncing**: Debounce search/filter inputs
- **Image Optimization**: Use WebP format for images
- **Bundle Size**: Vite automatically tree-shakes unused code

## Security

- **XSS Protection**: React automatically escapes JSX
- **CSRF Protection**: JWT tokens in headers (not cookies)
- **Secure Storage**: JWT stored in localStorage (HTTPS only in production)
- **Input Validation**: Client-side validation before API calls
- **Sensitive Data**: Never log user credentials or tokens

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Keyboard navigation support
- Color contrast compliance
- Screen reader friendly

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Create feature branch
2. Make changes
3. Test manually
4. Create pull request
5. Get code review

## License

Proprietary - All rights reserved
