# SkillMap Backend Documentation

## Recent Changes (2025-01-25)

### Major Backend Cleanup
Removed all deprecated and unused code to improve maintainability:

**Deleted Service Files:**
- `services/websocket_manager.py` - WebSocket was never fully working, removed entirely
- `services/docx_recreation_service.py` - Replaced by `docx_generation_service.py`
- `services/resume_tailoring_service.py` - Replaced by `resume_agent_service.py` (LangChain agent)
- `services/template_generation_service.py` - Unused file

**Removed API Endpoints:**
- `POST /api/projects/{project_id}/tailor` - Replaced by `/tailor-with-agent`
- `POST /api/resumes/base/tailor` - Deprecated, use project-based tailoring

**Cleaned Up Imports:**
- Removed all WebSocket-related imports from routers
- Removed deprecated service imports from `routers/projects.py` and `routers/resumes.py`
- Removed WebSocket calls from `services/pdf_cache_service.py`

**Frontend Cleanup:**
- Deleted `frontend/src/hooks/useWebSocket.js` - Not imported anywhere

**Preserved (Still Active):**
- `message_history` field - Used for chat history in tailoring drawer
- `pdf_generating`, `pdf_generation_progress`, `pdf_generation_started_at` - Used for PDF compilation progress
- `/api/resumes/base/recreated-docx` endpoint - Still used in frontend

## Recent Changes (2025-01-19)

### AI Tailoring Improvements
1. **Dynamic Action Verb Selection** (`services/agent_tools.py`)
   - Removed fixed list of action verbs (Architected, Engineered, etc.)
   - LLM now intelligently selects verbs based on job description and actual work
   - Added "Critical Balance Principle" to prevent over-engineering or excessive changes

2. **Balance Guidelines Added**
   - Every change must be justified by job description
   - Avoid over-engineering or reducing content too much
   - Stay authentic to candidate's experience while optimizing

### DOCX Generation Updates
1. **Consistent Font Sizing** (`services/docx_generation_service.py`)
   - Changed bullet points from 9pt to 10pt to match professional summary
   - All body text now consistent at 10pt

### Template Preview Generation
1. **John Doe Template Generator** (`generate_template_preview.py`)
   - Created script to generate sample resume for UI preview
   - Uses programmatic template (no base resume dependency)
   - Generates clean, one-page resume with all sections populated

### Code Cleanup
1. **Removed Hardcoded Personal Data**
   - Cleaned up test files that referenced developer's personal resume
   - All test data now uses generic "John Doe" samples
   - No fallback to developer's resume for any users

## Overview
SkillMap backend is a FastAPI application that handles resume processing, AI-powered tailoring, project management, and credit-based payment system.

## Tech Stack
- **Framework**: FastAPI
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **AI**: OpenAI GPT-4 (Structured Outputs)
- **Agent Framework**: LangChain + LangGraph (ReAct agent)
- **Monitoring**: LangSmith (agent tracing and debugging)
- **Document Processing**: python-docx, PyMuPDF, pytesseract (OCR)
- **PDF Conversion**: LibreOffice (headless mode)
- **Authentication**: JWT + Google OAuth
- **Streaming**: Server-Sent Events (SSE)
- **Payments**: Stripe (Checkout + Webhooks)

## Project Structure
```
backend/
├── config/
│   ├── database.py          # Database connection
│   └── settings.py          # Environment settings
├── models/
│   ├── user.py             # User model (with credits)
│   ├── base_resume.py      # Base resume model
│   ├── project.py          # Project model (with history)
│   └── credit_transaction.py  # Credit transaction model
├── routers/
│   ├── auth.py             # Authentication endpoints
│   ├── resumes.py          # Resume upload/extraction (multi-format + OCR)
│   ├── projects.py         # Project CRUD + tailoring
│   ├── users.py            # User profile endpoints
│   └── credits.py          # Credit system & Stripe
├── services/
│   ├── resume_extractor.py          # Multi-format extraction (DOCX/PDF/Image + OCR)
│   ├── resume_agent_service.py      # LangChain agent orchestration
│   ├── agent_tools.py               # LangChain tools (validate, summarize, tailor)
│   ├── docx_generation_service.py   # Programmatic DOCX generation from JSON
│   └── pdf_service.py               # PDF conversion (LibreOffice)
├── middleware/
│   └── auth_middleware.py  # JWT middleware
├── schemas/
│   └── resume_schemas.py   # Pydantic models
└── main.py                 # FastAPI app entry point
```

## Database Schema

### Users Table
- `id`: Integer (PK)
- `email`: String (unique)
- `password_hash`: String
- `full_name`: String
- `google_id`: String (optional)
- `credits`: Float (default 100.0)
- `created_at`: DateTime
- `updated_at`: DateTime

### Base Resumes Table
- `id`: Integer (PK)
- `user_id`: Integer (FK, unique)
- `original_filename`: String
- `original_docx`: LargeBinary (DOCX bytes)
- `resume_json`: JSON (extracted data)
- `created_at`: DateTime
- `updated_at`: DateTime

### Projects Table
- `id`: Integer (PK)
- `user_id`: Integer (FK)
- `project_name`: String
- `job_description`: Text
- `base_resume_id`: Integer (FK)
- `original_docx`: LargeBinary
- `resume_json`: JSON (base or tailored)
- `tailoring_history`: JSON (array, max 10)
- `created_at`: DateTime
- `updated_at`: DateTime

### Credit Transactions Table
- `id`: Integer (PK)
- `user_id`: Integer (FK)
- `project_id`: Integer (FK, nullable)
- `amount`: Float (+/-)
- `balance_after`: Float
- `transaction_type`: Enum (PURCHASE, TAILOR, GRANT, REFUND, BONUS)
- `tokens_used`: Integer (nullable)
- `prompt_tokens`: Integer (nullable)
- `completion_tokens`: Integer (nullable)
- `description`: String (nullable)
- `stripe_session_id`: String (unique, indexed)
- `created_at`: DateTime

## Core Features

### 1. Multi-Format Resume Extraction

**Supported Formats**: DOCX, DOC, PDF, JPG, JPEG, PNG, BMP, TIFF

**Extraction Flow**:
```
1. Validate file format
2. Try fast text extraction (< 1 second)
3. If extraction < 100 chars → Switch to OCR (5-10 seconds)
4. Parse extracted text with OpenAI Structured Outputs
5. Return validated JSON
```

**Service**: `resume_extractor.py`
- Text box extraction (for headers in text boxes)
- Hybrid extraction (text-based + OCR fallback)
- Real-time streaming status updates via SSE
- Automatic format detection

**Dependencies**:
- `pymupdf`: Fast PDF text extraction
- `pdf2image`: PDF to image conversion for OCR
- `pytesseract`: OCR engine wrapper
- `docx2txt`: Alternative DOCX extraction

### 2. LangChain Agent System

**Architecture**: ReAct agent with 3 specialized tools

**Agent Tools** (`agent_tools.py`):
1. **validate_intent**: Guardrail that validates user input intent
2. **summarize_job_description**: Extracts job requirements, skills, keywords
3. **tailor_resume_content**: Applies resume transformations

**Tailoring Flow**:
```
User submits JD → Guardrail validates intent →
Agent summarizes JD → Agent tailors resume →
Save current version to history → Update project JSON →
Stream progress to frontend
```

**Streaming**: Real-time updates via Server-Sent Events (SSE)

**Service**: `resume_agent_service.py`
- Sequential tool execution
- Token usage tracking for credits
- LangSmith integration for debugging
- Error handling and graceful degradation

### 3. DOCX Generation Service

**Method**: Programmatic generation from JSON (no templates)

**Process**:
```
1. Load base resume DOCX (for style reference)
2. Clear existing content
3. Add header (name, contact, links)
4. Add sections in custom order
5. Return DOCX bytes
```

**Service**: `docx_generation_service.py`

**Features**:
- Preserves margins (0.5" all around)
- US Letter page size (8.5" × 11")
- Section headers with edge-to-edge underlines
- Proper spacing (no gaps after headers)
- Smart bullet alignment (0.18" hanging indent)
- Date alignment at 7.5" from left
- Clickable hyperlinks preserved

**Section Ordering**: Custom section order stored in `project.resume_json['section_order']`

### 4. Credit System

**Pricing Model**: 2000 tokens = 1 credit (rounded to nearest 0.5)

**Credit Packages**:
- 50 credits: $5.00
- 100 credits: $9.00 (10% savings)
- 250 credits: $20.00 (20% savings)
- 500 credits: $35.00 (30% savings)

**Transaction Types**:
- PURCHASE: Stripe payment
- TAILOR: Resume tailoring (deduct)
- GRANT: Manual addition (admin)
- REFUND: Credits returned
- BONUS: Promotional credits

**Implementation**:
- Pre-check: Requires 5 credits minimum to tailor
- Token tracking: Monitors OpenAI API usage
- Post-deduction: Credits deducted based on actual tokens used
- Transaction history: Complete audit trail

**Service**: `routers/credits.py`
- Stripe Checkout session creation
- Webhook processing (checkout.session.completed)
- Idempotency using stripe_session_id
- Balance queries and transaction history

### 5. Version History Tracking

**Storage**: `project.tailoring_history` (JSON array)

**History Entry Structure**:
```json
{
  "timestamp": "2025-11-14T20:30:00Z",
  "resume_json": { /* previous version */ },
  "job_description": "Full job posting text",
  "changes_made": [
    "Professional summary rewritten",
    "Skills reorganized",
    "Work experience bullets enhanced"
  ]
}
```

**Features**:
- Stores last 10 versions
- Oldest removed when exceeded
- Accessible via `/api/projects/{id}` endpoint

### 6. PDF Conversion

**Method**: LibreOffice in headless mode

**Service**: `pdf_service.py`

**Features**:
- Inline browser preview (not download)
- Content-Disposition: inline
- Fallback to DOCX if LibreOffice unavailable

### 7. Google OAuth Integration

**Status**: ✅ Implemented (with known configuration issues)

**Endpoints**:
- `POST /api/auth/google`: Accepts Google id_token
- Verifies token with Google's servers
- Creates or authenticates user
- Returns JWT access token

**Known Issues**:
- Requires authorized origins configuration in Google Cloud Console
- Frontend may need CORS adjustments

## Environment Variables

### Local Development (.env)

```bash
# Database (uses LIVE Neon database shared with production)
DATABASE_URL=postgresql://neondb_owner:npg_GoAXaFcxLQ61@ep-rough-cherry-ahd984kf-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Security
SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173

# File Upload
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=./uploads

# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-proj-your-key
OPENAI_MODEL=gpt-4o-2024-08-06

# LangSmith (Optional but recommended)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-key
LANGCHAIN_PROJECT=SkillMap

# Stripe (REQUIRED for credits)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-key  # Get from 'stripe listen'
STRIPE_SUCCESS_URL=http://localhost:5173/profile?payment=success
STRIPE_CANCEL_URL=http://localhost:5173/profile?payment=cancelled

# Credit System Settings
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0
TOKENS_PER_CREDIT=2000
```

### Production Environment Variables (Railway)

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_GoAXaFcxLQ61@ep-rough-cherry-ahd984kf-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Security
SECRET_KEY=sjnkx_hgEFwxCZMmno5kLHob52rmYjfTybqSCbjFDA4xEmzekxx6D66zHweASMeS
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# OpenAI
OPENAI_API_KEY=sk-proj-your-production-key
OPENAI_MODEL=gpt-4o-2024-08-06

# LangSmith (Agent Monitoring)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-production-key
LANGCHAIN_PROJECT=SkillMap-Production

# Stripe (Production - use LIVE keys)
STRIPE_SECRET_KEY=sk_live_your-production-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-production-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret
STRIPE_SUCCESS_URL=https://skill-map-six.vercel.app/profile?payment=success
STRIPE_CANCEL_URL=https://skill-map-six.vercel.app/profile?payment=cancelled

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# CORS
FRONTEND_URL=https://skill-map-six.vercel.app

# Credits
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0
TOKENS_PER_CREDIT=2000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login with Google OAuth
- `GET /api/auth/me` - Get current user

### Resumes
- `POST /api/resumes/upload` - Upload resume (DOCX/PDF/Image) with SSE streaming
- `GET /api/resumes/base` - Get base resume

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `PUT /api/projects/{id}/section-order` - Update section order
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/pdf` - Get PDF preview (inline)
- `GET /api/projects/{id}/docx` - Download DOCX
- `POST /api/projects/{id}/tailor-with-agent` - Agent-based tailoring with SSE streaming

### Users
- `GET /api/users/me` - Get current user (with fresh credits)
- `PUT /api/users/me` - Update user profile
- `DELETE /api/users/me` - Delete account

### Credits
- `GET /api/credits/balance` - Get credit balance with warnings
- `GET /api/credits/transactions` - Get transaction history (paginated)
- `GET /api/credits/packages` - Get available credit packages
- `POST /api/credits/create-checkout-session` - Create Stripe checkout
- `POST /api/credits/webhook` - Stripe webhook handler (internal)

## Quick Start

### Local Development
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn main:app --reload
```
**Runs on:** http://localhost:8000
**API Docs:** http://localhost:8000/docs

### Production URLs
- **Backend:** https://skillmap-production.up.railway.app
- **Frontend:** https://skill-map-six.vercel.app
- **Database:** Neon PostgreSQL (us-east-1 region, shared between local and production)

### Important Note
The Neon PostgreSQL database is shared between local development and production environments. Always activate the virtual environment before making any migrations or running backend operations.

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install System Dependencies (for OCR & PDF)
```bash
# macOS
brew install tesseract poppler libreoffice

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install tesseract-ocr poppler-utils libreoffice

# Verify
tesseract --version
pdfinfo -v
soffice --version
```

### 3. Configure Environment
Create `.env` file with required variables (see above).

### 4. Run Development Server
```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

Server available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs

### 5. Stripe Webhook Setup (Local Development)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks (keep running in separate terminal)
stripe listen --forward-to http://localhost:8000/api/credits/webhook

# Copy webhook secret to .env
# Restart backend
```

## Common Issues

### OpenAI API Key Error
**Problem**: `api_key must be set`
**Solution**: Add `OPENAI_API_KEY` to `.env` and restart server

### PDF Preview Not Working
**Problem**: PDF not showing or downloads instead
**Solution**: Install LibreOffice (`brew install --cask libreoffice` on macOS)

### OCR Returns Empty Text
**Problem**: Tesseract not installed
**Solution**: `brew install tesseract` (macOS) or `sudo apt-get install tesseract-ocr` (Linux)

### Credits Not Adding After Payment
**Problem**: Payment successful but credits don't update
**Solution**:
1. Ensure `stripe listen` is running
2. Verify webhook secret in `.env` matches CLI output
3. Check backend terminal for webhook errors
4. Restart backend after updating secret

### LangSmith 403 Forbidden
**Problem**: Failed to POST to LangSmith
**Solution**: Verify `LANGCHAIN_API_KEY` is correct and not expired

## Security
- JWT authentication with secure tokens
- Password hashing with bcrypt
- CORS protection
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- Stripe webhook signature verification
- XSS protection with React

## Deployment

### 🚀 Production Status

**Database**: ✅ Neon PostgreSQL (deployed)
- Region: `us-east-1` (AWS)
- Connection: `ep-rough-cherry-ahd984kf-pooler.c-3.us-east-1.aws.neon.tech`
- Tables: `users`, `projects`, `base_resumes`, `credit_transactions`

**Backend**: ✅ Railway (deployed)
- Production URL: https://skillmap-production.up.railway.app
- Auto-deploys from GitHub main branch
- Procfile: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`

**Frontend**: ✅ Vercel (deployed)
- Production URL: https://skill-map-six.vercel.app
- Auto-deploys from GitHub main branch

---

## Neon PostgreSQL Database Setup

### Why Neon?
- **Serverless PostgreSQL** with instant branching
- **No cold starts** (unlike traditional serverless databases)
- **Auto-scaling**: Automatically scales compute based on load
- **Auto-suspend**: Suspends after inactivity to save costs
- **Connection Pooling**: Built-in pooler for efficient connections
- **Point-in-time Recovery**: Automatic backups with restore capability
- **Branch Support**: Create database branches for testing
- **Generous free tier** for development
- **Seamless scaling** from dev to production

### Creating Neon Project

1. Go to https://neon.tech/ and sign up/login
2. Click "Create Project"
3. Configure project:
   - Project name: `skillmap-production`
   - Region: `us-east-1` (choose closest to your users)
   - PostgreSQL version: 16 (latest)
4. Click "Create Project"

### Connection String Format

After creation, copy your connection string from the Neon dashboard:
```
postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Running Migrations

```bash
cd backend
source venv/bin/activate

# Update DATABASE_URL in .env with your Neon connection string

# Create all database tables
python -c "
from config.database import engine, Base
from models.user import User
from models.project import Project
from models.credit_transaction import CreditTransaction
Base.metadata.create_all(bind=engine)
print('✓ Database tables created!')
"

# Verify tables were created
psql "YOUR_NEON_CONNECTION_STRING" -c "\dt"
```

### Database Schema

The following tables will be created:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    full_name VARCHAR,
    google_id VARCHAR,
    credits FLOAT DEFAULT 100.0,
    auto_recharge_enabled BOOLEAN DEFAULT FALSE,
    auto_recharge_credits INTEGER,
    auto_recharge_threshold FLOAT DEFAULT 10.0,
    stripe_customer_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Base Resumes table
CREATE TABLE base_resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR,
    original_docx BYTEA,
    resume_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR NOT NULL,
    job_description TEXT,
    base_resume_id INTEGER REFERENCES base_resumes(id),
    original_docx BYTEA,
    resume_json JSONB,
    tailoring_history JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit Transactions table
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    amount FLOAT NOT NULL,
    balance_after FLOAT NOT NULL,
    transaction_type VARCHAR NOT NULL,
    tokens_used INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    description VARCHAR,
    stripe_session_id VARCHAR UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_stripe_session_id ON credit_transactions(stripe_session_id);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
```

### Database Backup Configuration

1. Go to Neon dashboard
2. Navigate to "Backups" tab
3. Enable automatic daily backups
4. Set retention period (7-30 days recommended)
5. Configure point-in-time recovery settings

### Testing Database Connection

```bash
# Test connection with Python
python -c "
import psycopg2
conn = psycopg2.connect('YOUR_NEON_CONNECTION_STRING')
print('✓ Database connection successful!')
conn.close()
"
```

---

## Railway Production Deployment

### Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app/)
- Neon database connection string
- All required API keys (OpenAI, Stripe, Google OAuth)

### Required Deployment Files

#### 1. Procfile
Create `backend/Procfile`:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

#### 2. requirements.txt
Generate from your virtual environment:
```bash
cd backend
source venv/bin/activate
pip freeze > requirements.txt
```

#### 3. runtime.txt (Optional)
Specify Python version:
```
python-3.11
```

### Railway Deployment Steps

1. **Sign up for Railway**: https://railway.app/
2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select your SkillMap repository
   - Choose the `backend` directory as root

3. **Configure Environment Variables**:
   Click "Variables" tab and add all production variables (see Environment Variables section above)

4. **Deploy**:
   - Railway will auto-deploy
   - Wait for build to complete (5-10 minutes first time)
   - Monitor deployment logs for any errors

5. **Get Backend URL**:
   - After successful deployment, copy your Railway URL
   - Format: `https://your-app-name.up.railway.app`

6. **Test Backend**:
   ```bash
   curl https://your-app-name.up.railway.app/
   # Should return: {"message": "SkillMap API is running"}
   ```

### Deployment Workflow

The production deployment follows this workflow:

```bash
# 1. Develop and test locally
cd backend
source venv/bin/activate
uvicorn main:app --reload

# 2. Test changes thoroughly with Neon database

# 3. Commit changes to git
git add .
git commit -m "Your descriptive commit message"
git push origin main

# 4. Auto-deploy
# Railway automatically detects the push and deploys backend (~2-5 min)
# Vercel automatically deploys frontend (~1-2 min)

# 5. Monitor deployment
# Check Railway logs for any errors
# Verify deployment at production URL
```

### Vercel Frontend Deployment

1. **Sign up for Vercel**: https://vercel.com/
2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite project

3. **Configure Project**:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables**:
   Go to Settings → Environment Variables:
   ```bash
   VITE_API_URL=https://your-backend.up.railway.app
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
   ```

5. **Deploy**: Click "Deploy" and wait 2-3 minutes

---

## Production Configuration

### Google OAuth Setup

1. Go to https://console.cloud.google.com/
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add **Authorized JavaScript origins**:
   ```
   https://your-frontend.vercel.app
   ```
5. Add **Authorized redirect URIs**:
   ```
   https://your-frontend.vercel.app
   https://your-frontend.vercel.app/login
   ```
6. Save changes

### Stripe Webhook Configuration

1. Go to https://dashboard.stripe.com/
2. Switch to **Live Mode** (toggle in top-right)
3. Navigate to Developers → Webhooks
4. Click "Add endpoint"
5. Configure webhook:
   - Endpoint URL: `https://your-backend.up.railway.app/api/credits/webhook`
   - Description: "SkillMap Production Webhook"
   - Events to send:
     - `checkout.session.completed`
     - `payment_intent.payment_failed`
6. Copy the **Webhook Signing Secret** (format: `whsec_xxxxx`)
7. Update Railway environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_SECRET_KEY=sk_live_xxxxx  # Use LIVE key for production
   ```

### Testing Stripe Webhook

```bash
# Use Stripe CLI to test webhook locally first
stripe listen --forward-to https://your-backend.up.railway.app/api/credits/webhook

# In another terminal, trigger test event
stripe trigger checkout.session.completed
```

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] Test all features locally with Neon database
- [ ] Verify all environment variables are set correctly
- [ ] Generate requirements.txt and Procfile
- [ ] Run database migrations on Neon
- [ ] Test Stripe webhooks locally

### Backend Deployment (Railway)
- [x] Railway project created
- [x] GitHub repository connected
- [x] Environment variables configured
- [x] Backend deployed successfully
- [x] Health check endpoint returns 200
- [ ] Production Stripe keys configured
- [ ] Stripe webhook endpoint configured in Stripe Dashboard

### Frontend Deployment (Vercel)
- [x] Vercel project created
- [x] GitHub repository connected
- [x] Environment variables configured
- [x] Frontend deployed successfully
- [x] Frontend can connect to backend API

### Database (Neon)
- [x] Neon project created
- [x] Database tables created and indexed
- [ ] Automatic backups enabled
- [ ] Backup retention configured (7-30 days)
- [ ] Connection pooling verified

### Security
- [x] Strong SECRET_KEY set (32+ random characters)
- [x] CORS configured for production domain
- [x] PostgreSQL connection uses SSL
- [ ] Stripe webhook signature verification working
- [ ] Google OAuth redirect URIs configured

### Monitoring
- [ ] Railway metrics dashboard enabled
- [ ] Vercel Analytics enabled
- [ ] LangSmith monitoring configured
- [ ] Stripe email notifications enabled
- [ ] Error tracking configured (e.g., Sentry)

### Optional
- [ ] Custom domain configured
- [ ] SSL certificate configured
- [ ] Rate limiting implemented
- [ ] CDN configured for static assets

---

## Troubleshooting Deployment Issues

### Backend Returns 500 Error
```bash
# Check Railway logs
# Go to Railway dashboard → Deployments → View Logs
# Look for Python exceptions or startup errors
```

**Common causes:**
- Missing environment variables
- Database connection failed
- OpenAI API key invalid
- Module import errors

### Frontend Can't Connect to Backend
```bash
# Check browser console for CORS errors
# Verify VITE_API_URL is correct
# Check backend FRONTEND_URL matches Vercel URL exactly
```

**Solution:** Ensure `FRONTEND_URL` in Railway has no trailing slash

### Stripe Webhook Not Working
```bash
# Go to Stripe Dashboard → Developers → Webhooks
# Check webhook logs for errors
# Verify webhook secret matches Railway environment variable
```

**Common causes:**
- Wrong webhook secret
- Webhook endpoint URL incorrect
- Events not selected in Stripe Dashboard

### Database Connection Error
```bash
# Verify DATABASE_URL is correct in Railway
# Check Neon database is active (auto-suspends after inactivity)
# Go to Neon dashboard → should show "Active" status
```

**Solution:** Wake up database by visiting Neon dashboard

### Google OAuth Fails
**Cause:** Redirect URIs not configured properly

**Solution:** Verify authorized redirect URIs in Google Console match exactly (no trailing slashes)

### LibreOffice PDF Conversion Fails
**Cause:** LibreOffice not installed in Railway container

**Solution:** Add to Railway buildpack or use Dockerfile with LibreOffice installed

### High Memory Usage
**Cause:** Large resume files or concurrent processing

**Solution:**
- Upgrade Railway plan
- Implement file size limits
- Add request queuing

---

## Monitoring & Maintenance

### Railway Monitoring
- **View Logs**: Railway Dashboard → Deployments → View Logs
- **Monitor Metrics**: CPU usage, memory usage, response time
- **Set Up Alerts**: Configure alerts for:
  - High CPU usage (>80%)
  - High memory usage (>80%)
  - Error rate (>5%)
  - Response time degradation

### Vercel Monitoring
- **Enable Analytics**: Vercel Dashboard → Analytics
- **Monitor**:
  - Page load times
  - Core Web Vitals (LCP, FID, CLS)
  - Error tracking
  - Geographic distribution of users

### Neon Database Monitoring
- **Connection Stats**: View in Neon dashboard
- **Query Performance**: Monitor slow queries
- **Storage Usage**: Track database size growth
- **Automatic Backups**: Verify backups are running
- **Branch Usage**: Monitor database branches

### LangSmith Monitoring
- **Track Agent Execution**: View all agent traces
- **Monitor Token Usage**: Track OpenAI API costs
- **Debug Reasoning**: Analyze agent decision-making
- **Performance Metrics**: Monitor response times
- **Access**: https://smith.langchain.com/

### Stripe Monitoring
- **Dashboard**: https://dashboard.stripe.com/
- **Enable Notifications** for:
  - Failed payments
  - Webhook failures
  - Chargebacks and disputes
  - Unusual activity

---

## Cost Estimation

### Free Tier (Testing/Development)
- **Neon**: Free tier (512 MB storage, 0.5 GB RAM)
- **Railway**: $5 credit free per month
- **Vercel**: Free tier (100 GB bandwidth)
- **OpenAI**: Pay-per-use
- **Stripe**: Free (2.9% + $0.30 per transaction)
- **Total**: ~$0-10/month

### Production Tier (Low-Medium Traffic)
- **Neon**: ~$10-20/month (Pro plan)
- **Railway**: ~$20-30/month (Pro plan)
- **Vercel**: Free tier (sufficient for <100GB bandwidth)
- **OpenAI**: ~$20-100/month (depends on usage)
- **Stripe**: Free (pay per transaction)
- **Total**: ~$50-150/month

### Scaling Considerations
- **High Traffic**: Consider upgrading Railway and Neon plans
- **Database Growth**: Monitor storage and upgrade as needed
- **API Costs**: OpenAI costs scale with usage
- **CDN**: Consider adding Cloudflare for static asset caching

---

## Production Checklist Summary

- [x] Set strong `SECRET_KEY` (32+ random characters)
- [x] Use PostgreSQL (Neon) instead of SQLite
- [x] Database tables created and indexed
- [x] Backend deployed to Railway
- [x] Frontend deployed to Vercel
- [x] CORS configured for production domain
- [x] Environment variables configured
- [ ] Set production Stripe keys (currently using test keys)
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Enable Neon automatic backups
- [ ] Set up monitoring (Railway, Vercel, LangSmith)
- [ ] Configure custom domain (optional)
- [ ] Implement rate limiting
- [ ] Set up error tracking (Sentry)

## License
Proprietary - All rights reserved

---

## Auto-Recharge System (Added 2025-11-19)

### Overview
Implemented a complete auto-recharge system that automatically charges users when their credit balance falls below a threshold (default: 10 credits).

### Database Schema Changes

**File:** `backend/models/user.py`

Added 5 new columns to User model:
```python
auto_recharge_enabled = Column(Boolean, nullable=False, default=False)
auto_recharge_credits = Column(Integer, nullable=True)
auto_recharge_threshold = Column(Float, nullable=False, default=10.0)
stripe_customer_id = Column(String(255), nullable=True, index=True)
stripe_payment_method_id = Column(String(255), nullable=True)
```

**Migration:** `backend/migrations/add_auto_recharge.py`
```bash
cd backend && source venv/bin/activate
python migrations/add_auto_recharge.py
```

### New API Endpoints

#### GET `/api/credits/auto-recharge`
Get user's auto-recharge settings
```json
{
  "enabled": true,
  "credits": 100,
  "threshold": 10.0
}
```

#### POST `/api/credits/auto-recharge`
Update auto-recharge settings
```json
{
  "enabled": true,
  "credits": 100,
  "threshold": 10.0
}
```

### Modified Endpoints

#### POST `/api/credits/create-checkout-session`
Added `enable_auto_recharge` parameter:
- Creates Stripe Customer if enabled
- Sets `setup_future_usage: 'off_session'`
- Saves payment method for future charges

#### POST `/api/credits/webhook`
Enhanced to handle auto-recharge setup:
- Saves payment method ID from payment intent
- Enables auto-recharge when flag is true
- Adds 20 bonus credits for enabling auto-recharge
- Creates separate BONUS transaction

### Background Job

**File:** `backend/jobs/auto_recharge_job.py`

**Purpose:** Monitors users and auto-charges when credits fall below threshold

**How it works:**
1. Queries users where:
   - `auto_recharge_enabled = TRUE`
   - `credits < auto_recharge_threshold`  
   - Has `stripe_payment_method_id`
2. Creates off-session payment via Stripe
3. Adds credits + 20 bonus
4. Creates PURCHASE and BONUS transactions

**Running:**
```bash
# Manual test
cd backend && source venv/bin/activate
python jobs/auto_recharge_job.py

# Cron (production)
0 * * * * cd /path/to/backend && source venv/bin/activate && python jobs/auto_recharge_job.py
```

### Credit Packages & Bonuses

**Packages:**
- 50 credits: $5.00 (8-12 tailorings)
- 100 credits: $9.00 (16-25 tailorings)
- 250 credits: $20.00 (41-62 tailorings)
- 500 credits: $35.00 (83-125 tailorings)

**Auto-Recharge Bonus:** +20 credits on every auto-recharge

**Tailoring Cost:** 4-6 credits per resume tailor

### Files Modified
1. `backend/models/user.py` - Auto-recharge fields
2. `backend/routers/credits.py` - Endpoints + webhook
3. `backend/migrations/add_auto_recharge.py` - Migration

### Files Created
1. `backend/jobs/auto_recharge_job.py` - Background job
2. `backend/AUTO_RECHARGE_SETUP.md` - Setup guide

### Production Setup
1. Run migration on Neon DB
2. Set up cron job (hourly recommended)
3. Monitor logs for first 24 hours
4. See `AUTO_RECHARGE_SETUP.md` for details

### Testing
```bash
# 1. Enable auto-recharge on frontend
# 2. Make test purchase with Stripe test card
# 3. Verify payment method saved:
SELECT stripe_payment_method_id FROM users WHERE id = YOUR_ID;

# 4. Test auto-charge by lowering credits:
UPDATE users SET credits = 5 WHERE id = YOUR_ID;

# 5. Run background job:
python jobs/auto_recharge_job.py
```
