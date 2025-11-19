# SkillMap Backend Documentation

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

## Environment Variables (.env)

```bash
# Database
DATABASE_URL=sqlite:///./skillmap.db

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

# File Upload
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=./uploads

# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-proj-your-key

# LangSmith (Optional but recommended)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-key
LANGCHAIN_PROJECT=SkillMap

# Stripe (REQUIRED for credits)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-key  # Get from 'stripe listen'

# Credit System Settings
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

### Neon PostgreSQL Configuration

**Features**:
- **Connection Pooling**: Built-in pooler for efficient connections
- **Auto-scaling**: Automatically scales compute based on load
- **Auto-suspend**: Suspends after inactivity to save costs
- **Point-in-time Recovery**: Automatic backups with restore capability
- **Branch Support**: Create database branches for testing

**Local Development**:
```bash
# Local .env uses the same Neon database as production
DATABASE_URL=postgresql://neondb_owner:npg_GoAXaFcxLQ61@ep-rough-cherry-ahd984kf-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Why Neon?**
- Serverless PostgreSQL with instant branching
- No cold starts (unlike traditional serverless DBs)
- Generous free tier for development
- Seamless scaling from dev to production

### Railway Deployment Configuration

**Environment Variables (Production)**:
```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_GoAXaFcxLQ61@ep-rough-cherry-ahd984kf-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Security
SECRET_KEY=sjnkx_hgEFwxCZMmno5kLHob52rmYjfTybqSCbjFDA4xEmzekxx6D66zHweASMeS
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# OpenAI
OPENAI_API_KEY=sk-proj-your-key
OPENAI_MODEL=gpt-4o-2024-08-06

# LangSmith (Agent Monitoring)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-key
LANGCHAIN_PROJECT=SkillMap

# Stripe (Production - use live keys)
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
STRIPE_SUCCESS_URL=https://skill-map-six.vercel.app/profile?payment=success
STRIPE_CANCEL_URL=https://skill-map-six.vercel.app/profile?payment=cancelled

# Google OAuth
GOOGLE_CLIENT_ID=xxxxxx
GOOGLE_CLIENT_SECRET=xxxxxxx

# CORS
FRONTEND_URL=https://skill-map-six.vercel.app

# Credits
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0
```

**Deployment Files**:
- `Procfile`: Uvicorn command for Railway
- `requirements.txt`: Python dependencies
- `runtime.txt`: Python version (optional)

### Production Deployment Workflow

```bash
# 1. Test locally with Neon database
cd backend
source venv/bin/activate
uvicorn main:app --reload

# 2. Commit changes
git add .
git commit -m "Your changes"
git push origin main

# 3. Auto-deploy
# Railway automatically deploys backend (2-5 min)
# Vercel automatically deploys frontend (1-2 min)
```

### Database Migration to Neon

Already completed! Tables created:
```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    full_name VARCHAR,
    google_id VARCHAR,
    credits FLOAT DEFAULT 100.0,
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
```

### Production Checklist

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
- [ ] Set up monitoring (Sentry, LangSmith)
- [ ] Configure custom domain (optional)

### Monitoring & Maintenance

**Railway Monitoring**:
- View logs: Railway Dashboard → Deployments → View Logs
- Monitor metrics: CPU, memory, response time
- Set up alerts for high error rates

**Neon Monitoring**:
- View connection stats in Neon dashboard
- Monitor query performance
- Enable automatic backups (7-30 day retention)

**LangSmith Monitoring**:
- Track agent execution traces
- Monitor token usage and costs
- Debug agent reasoning steps
- View: https://smith.langchain.com/

### Deployment Guides

For detailed deployment instructions, see:
- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Complete step-by-step guide
- **[DEPLOYMENT_QUICK_START.md](../DEPLOYMENT_QUICK_START.md)** - Quick 45-min deployment
- **[QUICK_START.md](../QUICK_START.md)** - Local development + production URLs

## License
Proprietary - All rights reserved
