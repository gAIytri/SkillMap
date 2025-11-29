# SkillMap Backend Documentation

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Core Features & Architecture](#core-features--architecture)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [AI & Agent System](#ai--agent-system)
8. [Services Layer](#services-layer)
9. [Authentication & Security](#authentication--security)
10. [Email System](#email-system)
11. [Credit System & Payments](#credit-system--payments)
12. [Document Processing](#document-processing)
13. [Environment Setup](#environment-setup)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

---

## Overview

SkillMap backend is a FastAPI application that provides AI-powered resume tailoring services. It uses OpenAI GPT-4 with LangChain/LangGraph for intelligent resume optimization, supports multiple resume formats with OCR capabilities, and integrates Stripe for payment processing.

**Key Capabilities**:
- Multi-format resume extraction (DOCX, PDF, Images + OCR)
- AI-powered resume tailoring with LangChain ReAct agent
- Automated cover letter and recruiter email generation
- DOCX generation with format preservation
- PDF conversion using LibreOffice
- Stripe-based credit system
- Email verification with Resend
- Real-time progress streaming via SSE

---

## Tech Stack

### Core Framework
- **FastAPI** - Modern async web framework
- **Python 3.12** - Latest Python version
- **Uvicorn** - ASGI server for production
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation and settings management

### Database
- **Development**: SQLite (local)
- **Production**: PostgreSQL (Neon serverless)
- **Connection Pooling**: Built-in with Neon
- **Auto-scaling**: Neon compute scales automatically

### AI & LLM
- **OpenAI GPT-4o** - Primary LLM (model: `gpt-4o-2024-08-06`)
- **Structured Outputs** - For resume extraction
- **LangChain** - LLM application framework
- **LangGraph** - Agent workflow orchestration (ReAct pattern)
- **LangSmith** - Agent tracing and debugging

### Document Processing
- **python-docx** - DOCX file manipulation
- **PyMuPDF (fitz)** - PDF text extraction
- **pdf2image** - PDF to image conversion
- **pytesseract** - OCR engine wrapper
- **Tesseract** - OCR engine (system dependency)
- **LibreOffice** - DOCX to PDF conversion (headless mode)

### Email
- **Resend** - Email delivery service
- **HTML Templates** - Beautiful email templates

### Payments
- **Stripe** - Payment processing
- **Stripe CLI** - Local webhook testing
- **Webhooks** - Real-time payment notifications

### Other Dependencies
- **python-jose** - JWT token generation
- **passlib[bcrypt]** - Password hashing
- **python-multipart** - File upload handling
- **google-auth** - Google OAuth verification

---

## Project Structure

```
backend/
├── config/
│   ├── database.py          # Database connection & session
│   └── settings.py          # Environment settings (Pydantic BaseSettings)
├── models/
│   ├── user.py              # User model (with credits, email verification)
│   ├── base_resume.py       # Base resume model
│   ├── project.py           # Project model (with version history)
│   └── credit_transaction.py # Credit transaction model
├── routers/
│   ├── auth.py              # Authentication endpoints (login, register, verify)
│   ├── resumes.py           # Resume upload/extraction (SSE streaming)
│   ├── projects.py          # Project CRUD + tailoring (SSE streaming)
│   ├── users.py             # User profile endpoints
│   └── credits.py           # Credit system & Stripe webhooks
├── services/
│   ├── resume_extractor.py          # Multi-format extraction (DOCX/PDF/Image + OCR)
│   ├── resume_agent_service.py      # LangChain agent orchestration
│   ├── agent_tools.py               # LangChain tools (validate, summarize, tailor)
│   ├── auth_service.py              # Authentication logic
│   ├── email_service.py             # Resend email integration
│   ├── docx_generation_service.py   # Programmatic DOCX generation
│   ├── docx_to_pdf_service.py       # PDF conversion (LibreOffice)
│   └── __init__.py
├── middleware/
│   └── auth_middleware.py   # JWT middleware (get_current_user, get_current_verified_user)
├── schemas/
│   ├── user.py              # User Pydantic schemas
│   ├── resume_schemas.py    # Resume Pydantic schemas
│   └── __init__.py
├── utils/
│   ├── security.py          # Password hashing, JWT generation
│   └── helpers.py           # Utility functions
├── migrations/
│   ├── add_email_verification.py         # Email verification fields migration
│   ├── add_auto_recharge.py              # Auto-recharge fields migration
│   └── fix_credit_transactions_fkey.py   # Foreign key constraint fix
├── jobs/
│   ├── cleanup_unverified_users.py  # Background job (delete unverified users after 30 days)
│   ├── auto_recharge_job.py         # Auto-recharge credits job
│   └── README.md                    # Job setup documentation
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── Procfile                 # Railway deployment config
└── .env                     # Environment variables (DO NOT COMMIT)
```

---

## Core Features & Architecture

### 1. Multi-Format Resume Extraction

**Supported Formats**: DOCX, DOC, PDF, JPG, JPEG, PNG, BMP, TIFF

**Extraction Flow**:
```
1. Validate file format
   ↓
2. Try fast text extraction (< 1 second)
   - DOCX: python-docx + docx2txt
   - PDF: PyMuPDF (fitz)
   ↓
3. If extraction < 100 chars → Switch to OCR (5-10 seconds)
   - PDF → Images (pdf2image)
   - Images → Text (pytesseract/Tesseract)
   ↓
4. Parse extracted text with OpenAI Structured Outputs
   ↓
5. Return validated JSON (Pydantic schema)
```

**Service**: `services/resume_extractor.py`

**Key Features**:
- **Text box extraction**: Captures headers in text boxes
- **Hybrid extraction**: Text-based + OCR fallback
- **SSE streaming**: Real-time status updates
- **Automatic format detection**: Detects format from file extension
- **Error handling**: Graceful fallback to OCR on failures

**Dependencies**:
- `pymupdf` - Fast PDF text extraction
- `pdf2image` - PDF to image conversion for OCR
- `pytesseract` - OCR engine wrapper
- `docx2txt` - Alternative DOCX extraction
- System: Tesseract, Poppler (for pdf2image)

**Status Messages** (SSE):
```json
{"type": "status", "message": "Uploading file..."}
{"type": "status", "message": "Extracting text from DOCX..."}
{"type": "status", "message": "Switching to OCR for better extraction..."}
{"type": "status", "message": "Successfully extracted 2453 characters"}
{"type": "status", "message": "Analyzing resume content with AI..."}
{"type": "complete", "data": { "resume_json": {...} }}
```

---

### 2. LangChain Agent System

**Architecture**: ReAct agent with 5 specialized tools

**Critical Requirement**: This tool-based agent system MUST be preserved. Do not create separate endpoints that bypass the agent workflow.

**Agent Tools** (`services/agent_tools.py`):

1. **validate_intent**
   - Purpose: Guardrail to validate user input intent
   - Ensures job description is legitimate (not spam/malicious)
   - Returns: `{"is_valid": true/false, "reason": "..."}`

2. **summarize_job_description**
   - Purpose: Extract key requirements from job description
   - Analyzes: Required skills, responsibilities, keywords
   - Returns: `{"required_skills": [...], "key_responsibilities": [...], "ats_keywords": [...]}`

3. **tailor_resume_content**
   - Purpose: Main tailoring logic
   - Enhances: Professional summary, work experience, projects, skills
   - 3-tier relevance system (HIGH/MEDIUM/LOW)
   - Returns: `{"tailored_json": {...}, "changes_made": [...]}`

4. **generate_cover_letter**
   - Purpose: Create tailored cover letter
   - Uses job summary and tailored resume
   - Returns: `{"cover_letter": "...", "key_points": [...]}`

5. **generate_recruiter_email**
   - Purpose: Create recruiter email template
   - Short, professional, attention-grabbing
   - Returns: `{"subject": "...", "body": "..."}`

**Service**: `services/resume_agent_service.py`

**Tailoring Flow**:
```
User submits JD
   ↓
Agent validates intent (guardrail)
   ↓
Agent summarizes JD (extract requirements)
   ↓
Agent tailors resume (HIGH relevance bullets get most enhancement)
   ↓
Save current version to history
   ↓
Update project JSON
   ↓
Agent generates cover letter (parallel)
   ↓
Agent generates email (parallel)
   ↓
Stream progress to frontend (SSE)
```

**Streaming Messages** (SSE):
```json
{"type": "status", "message": "Analyzing job requirements...", "step": "initialization"}
{"type": "tool_result", "tool": "validate_intent", "data": {"is_valid": true}}
{"type": "tool_result", "tool": "summarize_job_description", "data": {...}}
{"type": "tool_result", "tool": "tailor_resume_content", "data": {...}}
{"type": "resume_complete", "tailored_json": {...}}
{"type": "cover_letter_complete", "cover_letter": "..."}
{"type": "email_complete", "email": {...}}
{"type": "final", "success": true, "tokens_used": 4200}
```

**LangSmith Integration**:
- Traces all agent executions
- Monitors token usage and costs
- Debugs agent reasoning
- Analyzes performance metrics
- Access: https://smith.langchain.com/

**Prompt Engineering**:

**Tailoring Prompt Structure** (`agent_tools.py` lines 453-606):
```
STEP 0 - ANALYZE JOB DESCRIPTION FIRST
- Extract required skills, responsibilities, keywords
- Identify technical depth areas

SMART TAILORING APPROACH
- Make SUBSTANTIAL changes where misaligned
- Make REFINED improvements where aligned
- Work ONLY with existing experience

1. PROFESSIONAL SUMMARY
- Rewrite emphasizing role focus
- Weave in 2-4 required skills keywords
- 3-4 sentences, compelling

2. WORK EXPERIENCE (3-Tier System)
- HIGH RELEVANCE: Enhance with specific tech, metrics, impact
- MEDIUM RELEVANCE: Refine language, connect to requirements
- LOW RELEVANCE: Improve quality, keep concise

3. PROJECTS (3-Step Process)
- STEP 1: Analyze relevance
- STEP 2: Reorder by relevance
- STEP 3: Enhance descriptions
  - HIGH: Expand with architectural details, scale, metrics
  - MEDIUM: Add technical detail, highlight overlaps
  - LOW: Keep clear but concise

4. SKILLS
- Reorder each category: required first, preferred, then others
- Keep all existing skills

5. EDUCATION & CERTIFICATIONS
- Keep as-is unless directly relevant

DATE FORMATTING
- Consistent format across all sections

JSON STRUCTURE REQUIREMENTS
- Projects: Use "bullets" array, NOT "description"
- Experience: Use "bullets" array
- No concatenation of multiple points
```

**Temperature**: 0.3 (balanced creativity and accuracy)

**Token Usage**:
- Average: ~4,200 tokens per tailoring
- Cost: ~$0.042 per tailoring
- Credit deduction: 4200 / 2000 = 2.1 credits (rounded to 2.5)

**URL Preservation**:
- `sanitize_hyphens()` function protects URLs
- Replaces hyphens with spaces in text
- Preserves LinkedIn/GitHub/Portfolio URLs intact

---

### 3. Version History System

**Tracked Sections**:
- Professional Summary
- Work Experience
- Projects
- Skills

**Storage** (`models/project.py`):
```python
version_history = Column(JSON, nullable=False, default=dict)
current_versions = Column(JSON, nullable=False, default=dict)

# Example structure:
{
  "version_history": {
    "professional_summary": {
      "1": "...",  # V1
      "2": "..."   # V2
    },
    "experience": {
      "1": [...],
      "2": [...]
    }
  },
  "current_versions": {
    "professional_summary": 2,
    "experience": 2,
    "projects": 1,
    "skills": 0
  }
}
```

**Selective Versioning** (`routers/projects.py` lines 498-534):
```python
for section in ["professional_summary", "experience", "projects", "skills"]:
    if section in current_resume_json and section in new_resume_json:
        # Check if section actually changed
        section_changed = current_resume_json[section] != new_resume_json[section]

        if section_changed:
            # Create new version
            current_version_num = project.current_versions.get(section, 0)
            new_version_num = current_version_num + 1
            project.version_history[section][str(new_version_num)] = new_resume_json[section]
            project.current_versions[section] = new_version_num
        else:
            # Keep current version (no change)
            logger.info(f"Section '{section}' unchanged")
```

**Benefits**:
- Only changed sections get new versions
- Reduces version clutter
- Accurate tracking of modifications
- Users can see exactly what was tailored

**API Endpoints**:
- `PUT /api/projects/{id}/restore-version` - Restore previous version
- `POST /api/projects/{id}/clear-version-history` - Reset all versions

---

### 4. DOCX Generation Service

**Method**: Programmatic generation from JSON (no templates)

**Process**:
```
1. Load base resume DOCX (for style reference)
   ↓
2. Clear existing content
   ↓
3. Add header (name, contact, links)
   ↓
4. Add sections in custom order
   ↓
5. Return DOCX bytes
```

**Service**: `services/docx_generation_service.py`

**Features**:
- **Margins**: 0.5" all around
- **Page Size**: US Letter (8.5" × 11")
- **Font**: Calibri 11pt (body text), 10pt (contact info)
- **Section Headers**: Edge-to-edge underlines
- **Spacing**: No gaps after headers
- **Bullet Alignment**: 0.18" hanging indent
- **Date Alignment**: 7.5" from left (right-aligned dates)
- **Hyperlinks**: Clickable LinkedIn/GitHub/Portfolio links

**Personal Info Header** (lines 1164-1241):
```python
# Name (left-aligned, regular weight, 11pt)
name_para = doc.add_paragraph()
name_para.alignment = WD_ALIGN_PARAGRAPH.LEFT
name_run = name_para.add_run(personal_info['name'])
name_run.font.name = 'Calibri'
name_run.font.size = Pt(11)
name_run.font.bold = False  # No bold

# Current Role, Location, Email, Phone (10pt, left-aligned)
# ...

# Header Links (2 per row, clickable hyperlinks)
for i in range(0, len(header_links), 2):
    links_in_row = header_links[i:i+2]
    link_para = doc.add_paragraph()
    link_para.alignment = WD_ALIGN_PARAGRAPH.LEFT

    for idx, link in enumerate(links_in_row):
        if idx > 0:
            sep_run = link_para.add_run(' | ')

        add_professional_hyperlink(link_para, link['url'], link['text'], 'Calibri', 11, False)
```

**Section Ordering**: Custom order stored in `project.resume_json['section_order']`

**Cover Letter Generation** (lines 1138-1302):
```python
def generate_cover_letter_docx(cover_letter_text: str, resume_json: dict = None) -> bytes:
    # STEP 1: Generate Personal Info Header from resume_json
    # (Name, Location, Email, Phone, Links - same as resume)

    # STEP 2: Add Cover Letter Body
    # (Date, Company Info, Letter Content)
```

**Benefits**:
- **No template dependency**: Generates from scratch
- **Consistent formatting**: Same header as resume
- **Hyperlinks preserved**: All URLs clickable
- **Business letter format**: Left-aligned, professional

---

### 5. PDF Conversion

**Method**: LibreOffice in headless mode

**Service**: `services/docx_to_pdf_service.py`

**Process**:
```python
def convert_docx_to_pdf(docx_bytes: bytes) -> tuple[bytes, str]:
    # 1. Save DOCX to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as temp_docx:
        temp_docx.write(docx_bytes)
        temp_docx_path = temp_docx.name

    # 2. Convert using LibreOffice
    subprocess.run([
        'soffice',
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', temp_dir,
        temp_docx_path
    ], check=True, timeout=30)

    # 3. Read PDF bytes
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    # 4. Cleanup temp files
    os.remove(temp_docx_path)
    os.remove(pdf_path)

    return pdf_bytes, 'application/pdf'
```

**Features**:
- **Inline preview**: Content-Disposition: inline
- **Fallback**: Returns DOCX if LibreOffice unavailable
- **Timeout**: 30 seconds max
- **Cleanup**: Removes temp files

**System Requirements**:
- **macOS**: `brew install --cask libreoffice`
- **Ubuntu/Debian**: `sudo apt-get install libreoffice`

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR,
    full_name VARCHAR,
    google_id VARCHAR,
    credits FLOAT DEFAULT 100.0,

    -- Email Verification
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(6),  -- 6-digit code
    verification_token_expires TIMESTAMP,
    verification_link_token VARCHAR(255) UNIQUE,  -- UUID for magic link

    -- Auto-Recharge (Future Feature)
    auto_recharge_enabled BOOLEAN DEFAULT FALSE,
    auto_recharge_credits INTEGER,
    auto_recharge_threshold FLOAT DEFAULT 10.0,
    stripe_customer_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),

    -- Profile
    profile_picture_url VARCHAR,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_link_token ON users(verification_link_token);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);
```

**Relationship**: One-to-One with `base_resumes`, One-to-Many with `projects`

---

### Base Resumes Table

```sql
CREATE TABLE base_resumes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR,
    original_docx BYTEA,  -- DOCX bytes (base64 encoded in JSON APIs)
    resume_json JSONB,    -- Extracted structured data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_base_resumes_user_id ON base_resumes(user_id);
```

**resume_json Structure**:
```json
{
  "personal_info": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 234 567 8900",
    "location": "San Francisco, CA",
    "current_role": "Senior Software Engineer",
    "header_links": [
      {"text": "LinkedIn", "url": "https://linkedin.com/in/johndoe"},
      {"text": "GitHub", "url": "https://github.com/johndoe"}
    ]
  },
  "professional_summary": "Experienced software engineer...",
  "experience": [
    {
      "company": "Google",
      "position": "Senior Software Engineer",
      "dates": "Jan 2020 - Present",
      "location": "Mountain View, CA",
      "bullets": [
        "Led development of...",
        "Architected scalable..."
      ]
    }
  ],
  "projects": [
    {
      "name": "E-commerce Platform",
      "dates": "2023",
      "bullets": [
        "Built full-stack...",
        "Integrated Stripe..."
      ]
    }
  ],
  "education": [...],
  "skills": {
    "Programming Languages": ["Python", "JavaScript"],
    "Frameworks": ["React", "Django"]
  },
  "certifications": [...],
  "section_order": ["professional_summary", "experience", "projects", "skills", "education", "certifications"]
}
```

---

### Projects Table

```sql
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_name VARCHAR NOT NULL,
    job_description TEXT,
    base_resume_id INTEGER REFERENCES base_resumes(id),
    original_docx BYTEA,
    resume_json JSONB,  -- Current tailored version

    -- Version History
    version_history JSONB DEFAULT '{}',  -- {section: {version_num: data}}
    current_versions JSONB DEFAULT '{}',  -- {section: current_version_num}
    tailoring_history JSONB DEFAULT '[]',  -- Array of tailoring sessions (max 10)

    -- Cover Letter & Email
    cover_letter_text TEXT,
    email_subject VARCHAR,
    email_body TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_base_resume_id ON projects(base_resume_id);
```

**version_history Structure**:
```json
{
  "professional_summary": {
    "1": "Experienced software engineer with 5 years...",
    "2": "Results-driven software engineer specializing in..."
  },
  "experience": {
    "1": [...],  // Array of experience objects
    "2": [...]
  }
}
```

**current_versions Structure**:
```json
{
  "professional_summary": 2,
  "experience": 2,
  "projects": 1,
  "skills": 0
}
```

**tailoring_history Structure**:
```json
[
  {
    "timestamp": "2025-11-29T10:30:00Z",
    "resume_json": {...},
    "job_description": "We are looking for...",
    "changes_made": [
      "Professional summary rewritten",
      "Skills reorganized",
      "Work experience bullets enhanced"
    ]
  }
]
```

---

### Credit Transactions Table

```sql
CREATE TABLE credit_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    amount FLOAT NOT NULL,  -- Positive for add, negative for deduct
    balance_after FLOAT NOT NULL,
    transaction_type VARCHAR NOT NULL,  -- PURCHASE, TAILOR, GRANT, REFUND, BONUS

    -- Token Tracking
    tokens_used INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,

    -- Metadata
    description VARCHAR,
    stripe_session_id VARCHAR UNIQUE,  -- For idempotency

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_stripe_session_id ON credit_transactions(stripe_session_id);
```

**Transaction Types**:
- **PURCHASE**: Stripe payment
- **TAILOR**: Resume tailoring (deduct)
- **GRANT**: Manual credit addition (admin)
- **REFUND**: Credits returned
- **BONUS**: Promotional credits

**Pricing Model**: 2000 tokens = 1 credit (rounded to nearest 0.5)

---

## API Endpoints

### Authentication (`routers/auth.py`)

#### POST /api/auth/register
Register new user with email/password

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

**Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "credits": 100.0,
    "email_verified": false,
    "base_resume_id": null
  }
}
```

---

#### POST /api/auth/login
Login with email/password

**Request**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (if verified):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": { ... }
}
```

**Response** (if unverified):
```json
{
  "access_token": "...",
  "user": {
    "email_verified": false,  // Frontend checks this
    ...
  }
}
```

**Behavior**: If unverified, generates NEW verification code and sends email

---

#### POST /api/auth/google
Google OAuth login

**Request**:
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI..."
}
```

**Response**: Same as /login

**Features**:
- Auto-verifies email
- Links account if email exists with password
- Creates new user if email doesn't exist

---

#### POST /api/auth/verify-email
Verify email with 6-digit code

**Request**:
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response**:
```json
{
  "message": "Email verified successfully!",
  "email_verified": true
}
```

---

#### GET /api/auth/verify-email/{token}
Verify email with magic link (auto-verify)

**Response**:
```json
{
  "message": "Email verified successfully!",
  "email_verified": true
}
```

---

#### POST /api/auth/resend-verification
Resend verification email

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "Verification email sent successfully!"
}
```

**Rate Limit**: 60 seconds between requests

---

### Resumes (`routers/resumes.py`)

#### POST /api/resumes/upload
Upload resume (SSE streaming)

**Request**: `multipart/form-data`
```
file: resume.docx (or .pdf, .jpg, etc.)
```

**Response**: Server-Sent Events (text/event-stream)

**SSE Events**:
```
data: {"type": "status", "message": "Uploading file..."}

data: {"type": "status", "message": "Extracting text from DOCX..."}

data: {"type": "status", "message": "Analyzing resume content with AI..."}

data: {"type": "complete", "data": {"resume_json": {...}}}
```

---

#### GET /api/resumes/base
Get user's base resume

**Response**:
```json
{
  "id": 1,
  "user_id": 1,
  "original_filename": "resume.docx",
  "original_docx": "base64_encoded_bytes",
  "resume_json": {...},
  "created_at": "2025-11-29T10:00:00Z"
}
```

---

### Projects (`routers/projects.py`)

#### GET /api/projects
List all projects for current user

**Response**:
```json
[
  {
    "id": 1,
    "project_name": "Google Software Engineer",
    "job_description": "We are looking for...",
    "resume_json": {...},
    "version_history": {...},
    "current_versions": {...},
    "cover_letter_text": "...",
    "email_subject": "...",
    "email_body": "...",
    "created_at": "2025-11-29T10:00:00Z",
    "updated_at": "2025-11-29T11:00:00Z"
  }
]
```

---

#### POST /api/projects
Create new project

**Request**:
```json
{
  "project_name": "Google Software Engineer",
  "job_description": "We are looking for a Senior Software Engineer..."
}
```

**Response**: Project object

**Duplicate Detection**: Checks for projects with same name created within last 5 seconds

---

#### GET /api/projects/{id}
Get project details

**Response**: Project object with version history

---

#### PUT /api/projects/{id}
Update project

**Request**:
```json
{
  "project_name": "Google Senior SWE",
  "resume_json": {...},
  "cover_letter_text": "..."
}
```

**Response**: Updated project object

**Version History**: Creates new versions for changed sections

---

#### PUT /api/projects/{id}/section-order
Update section order

**Request**:
```json
{
  "section_order": ["professional_summary", "experience", "projects", "skills", "education"]
}
```

**Response**: Updated project object

---

#### DELETE /api/projects/{id}
Delete project

**Response**:
```json
{
  "message": "Project deleted successfully"
}
```

**Foreign Key Handling**: Sets `project_id` to NULL in credit_transactions

---

#### POST /api/projects/{id}/tailor-with-agent
Tailor resume with LangChain agent (SSE streaming)

**Request**:
```json
{
  "job_description": "We are looking for a Senior Software Engineer..."
}
```

**Response**: Server-Sent Events (text/event-stream)

**SSE Events**:
```
data: {"type": "status", "message": "Analyzing job requirements...", "step": "initialization"}

data: {"type": "tool_result", "tool": "validate_intent", "data": {"is_valid": true}}

data: {"type": "tool_result", "tool": "summarize_job_description", "data": {...}}

data: {"type": "tool_result", "tool": "tailor_resume_content", "data": {...}}

data: {"type": "resume_complete", "tailored_json": {...}}

data: {"type": "cover_letter_complete", "cover_letter": "..."}

data: {"type": "email_complete", "email": {...}}

data: {"type": "final", "success": true, "tokens_used": 4200, "credits_deducted": 2.5}
```

**Credit Validation**: Requires 5 credits minimum
**Token Tracking**: Monitors OpenAI API usage
**Credit Deduction**: Based on actual tokens used (2000 tokens = 1 credit)

---

#### GET /api/projects/{id}/pdf
Download project resume as PDF

**Response**: `application/pdf` (inline preview)

---

#### GET /api/projects/{id}/docx
Download project resume as DOCX

**Response**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

---

#### GET /api/projects/{id}/cover-letter/pdf
Download cover letter as PDF

**Response**: `application/pdf` (inline or download based on query param)

---

#### GET /api/projects/{id}/cover-letter/docx
Download cover letter as DOCX

**Response**: DOCX file with personal info header + cover letter body

---

#### POST /api/projects/{id}/restore-version
Restore previous version of a section

**Request**:
```json
{
  "section_name": "professional_summary",
  "version_number": 1
}
```

**Response**: Updated project object

**Behavior**: Makes specified version the current version (creates new version)

---

#### POST /api/projects/{id}/clear-version-history
Clear all version history for project

**Response**: Project object with empty history

**Use Case**: Called before replacing resume to avoid confusion

---

### Users (`routers/users.py`)

#### GET /api/users/me
Get current user profile (with fresh credits)

**Response**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "credits": 93.5,
  "base_resume_id": 1,
  "email_verified": true,
  "profile_picture_url": "https://...",
  "created_at": "2025-11-29T10:00:00Z"
}
```

---

#### PUT /api/users/me
Update user profile

**Request**:
```json
{
  "full_name": "John Smith"
}
```

**Response**: Updated user object

---

#### DELETE /api/users/me
Delete user account

**Response**:
```json
{
  "message": "Account deleted successfully"
}
```

**Cascade**: Deletes base resume, projects, and credit transactions

---

### Credits (`routers/credits.py`)

#### GET /api/credits/balance
Get current credit balance

**Response**:
```json
{
  "credits": 93.5,
  "low_balance": false
}
```

**Low Balance Warning**: Triggered when credits < 10

---

#### GET /api/credits/transactions
Get transaction history (paginated)

**Query Params**:
- `limit` (default: 50)
- `offset` (default: 0)

**Response**:
```json
{
  "transactions": [
    {
      "id": 1,
      "amount": -2.5,
      "balance_after": 93.5,
      "transaction_type": "TAILOR",
      "description": "Resume tailoring for Google SWE",
      "tokens_used": 4200,
      "prompt_tokens": 3500,
      "completion_tokens": 700,
      "created_at": "2025-11-29T11:00:00Z"
    }
  ],
  "total": 15
}
```

---

#### GET /api/credits/packages
Get available credit packages

**Response**:
```json
{
  "packages": [
    {"credits": 50, "price": 5.00, "savings": "0%"},
    {"credits": 100, "price": 9.00, "savings": "10%"},
    {"credits": 250, "price": 20.00, "savings": "20%"},
    {"credits": 500, "price": 35.00, "savings": "30%"}
  ]
}
```

---

#### POST /api/credits/create-checkout-session
Create Stripe checkout session

**Request**:
```json
{
  "credits": 100
}
```

**Response**:
```json
{
  "session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Behavior**: Redirects user to Stripe Checkout

---

#### POST /api/credits/webhook
Stripe webhook handler (internal)

**Request**: Stripe webhook event (checkout.session.completed)

**Response**: `{"status": "ok"}`

**Behavior**:
1. Validates webhook signature
2. Checks if session already processed (idempotency)
3. Adds credits to user account
4. Creates PURCHASE transaction
5. Saves payment method (if auto-recharge enabled)

---

## AI & Agent System

### OpenAI Structured Outputs

**Model**: `gpt-4o-2024-08-06`

**Resume Extraction Schema** (`schemas/resume_schemas.py`):
```python
class PersonalInfo(BaseModel):
    name: str
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    current_role: Optional[str]
    header_links: List[HeaderLink] = []

class Experience(BaseModel):
    company: str
    position: str
    dates: str
    location: Optional[str]
    bullets: List[str]

class Project(BaseModel):
    name: str
    dates: Optional[str]
    bullets: List[str]  # MUST use bullets, NOT description

class ResumeData(BaseModel):
    personal_info: PersonalInfo
    professional_summary: Optional[str]
    experience: List[Experience]
    projects: List[Project]
    education: List[Education]
    skills: Dict[str, List[str]]
    certifications: List[Certification]
```

**API Call**:
```python
response = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": resume_text}
    ],
    response_format=ResumeData
)

resume_data = response.choices[0].message.parsed
```

---

### LangChain ReAct Agent

**Agent Configuration** (`services/resume_agent_service.py`):
```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=ChatOpenAI(model="gpt-4o-2024-08-06", temperature=0.3),
    tools=[
        validate_intent,
        summarize_job_description,
        tailor_resume_content,
        generate_cover_letter,
        generate_recruiter_email
    ],
    state_modifier=system_prompt
)
```

**Tool Definition Example**:
```python
@tool
def tailor_resume_content(resume_json: dict, job_summary: dict) -> dict:
    """
    Tailor resume content based on job requirements.

    Args:
        resume_json: Current resume data
        job_summary: Job description summary with requirements

    Returns:
        dict: Tailored resume JSON with changes_made list
    """
    # Detailed prompt with 3-tier system
    prompt = f"""
    SMART TAILORING APPROACH:
    - Analyze alignment between current resume and job requirements
    - Make SUBSTANTIAL changes where there's misalignment
    - Work ONLY with existing experience

    PROFESSIONAL SUMMARY:
    - Rewrite emphasizing role focus
    - Weave in 2-4 required skills keywords
    ...
    """

    response = llm.invoke([
        {"role": "system", "content": prompt},
        {"role": "user", "content": json.dumps(resume_json)}
    ])

    return {
        "tailored_json": response.content,
        "changes_made": [...]
    }
```

---

### LangSmith Integration

**Configuration** (`.env`):
```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-key
LANGCHAIN_PROJECT=SkillMap
```

**Features**:
- Traces all agent executions
- Monitors token usage and costs
- Debugs agent reasoning
- Analyzes performance metrics
- Tracks tool calls and outputs

**Access**: https://smith.langchain.com/

---

## Services Layer

### resume_extractor.py

**Key Functions**:
- `extract_resume(file: UploadFile) -> dict`
- `extract_text_from_docx(file_path: str) -> str`
- `extract_text_from_pdf(file_path: str) -> str`
- `extract_text_with_ocr(file_path: str) -> str`
- `parse_resume_with_ai(text: str) -> dict`

**OCR Fallback Logic**:
```python
def extract_resume(file: UploadFile):
    # Try fast extraction
    if file.filename.endswith('.docx'):
        text = extract_text_from_docx(file_path)
    elif file.filename.endswith('.pdf'):
        text = extract_text_from_pdf(file_path)

    # OCR fallback if extraction too short
    if len(text.strip()) < 100:
        logger.info("Switching to OCR for better extraction...")
        text = extract_text_with_ocr(file_path)

    # Parse with OpenAI Structured Outputs
    resume_json = parse_resume_with_ai(text)
    return resume_json
```

---

### resume_agent_service.py

**Key Function**:
```python
def tailor_resume_with_agent(
    project_id: int,
    job_description: str,
    resume_json: dict,
    db: Session
) -> AsyncGenerator[str, None]:
    """
    Tailor resume using LangChain ReAct agent with SSE streaming.

    Yields:
        SSE events with agent progress
    """
    # Initialize agent
    agent = create_react_agent(model, tools, state_modifier)

    # Stream agent execution
    for chunk in agent.stream({
        "messages": [
            {"role": "user", "content": f"Job Description: {job_description}"}
        ]
    }):
        # Parse agent messages and yield SSE events
        if "tool_result" in chunk:
            yield f"data: {json.dumps({'type': 'tool_result', ...})}\n\n"

    # Save tailored resume to database
    # Deduct credits based on token usage
    # Return final event
```

---

### email_service.py

**Provider**: Resend (https://resend.com)

**Key Functions**:
- `send_verification_email(email, full_name, code, magic_token)`
- `send_welcome_email(email, full_name)`
- `generate_verification_code() -> str` (6-digit random)
- `generate_verification_link_token() -> str` (UUID)
- `get_verification_expiry() -> datetime` (10 minutes)

**Verification Email Template**:
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Professional styling with gradient green theme */
  </style>
</head>
<body>
  <div class="container">
    <h1>Verify your email - SkillMap</h1>
    <p>Hi {full_name},</p>
    <p>Your verification code is:</p>
    <div class="code-box">{verification_code}</div>
    <a href="{magic_link}" class="button">Verify Email with One Click</a>
    <p class="divider">OR</p>
    <p>Enter the 6-digit code on the verification page</p>
    <p class="security">For security, this code expires in 10 minutes.</p>
  </div>
</body>
</html>
```

**Welcome Email Template**:
```html
<h1>🎉 Welcome to SkillMap!</h1>
<p>You've received <strong>100 FREE credits</strong> to get started!</p>
<a href="{frontend_url}/upload-resume">Upload Your Resume</a>
```

---

### docx_generation_service.py

**Key Functions**:
- `generate_resume_docx(resume_json: dict, original_docx_bytes: bytes) -> bytes`
- `generate_cover_letter_docx(cover_letter_text: str, resume_json: dict) -> bytes`
- `add_professional_hyperlink(paragraph, url, text, font_name, font_size, bold)`

**Helper Functions**:
- `set_paragraph_spacing(paragraph, before=0, after=0, line_spacing=1.0)`
- `add_section_header(doc, text)`
- `add_bullet_point(paragraph, text, level=0)`

**Formatting Details**:
- **Margins**: 0.5" all around
- **Page Size**: US Letter (8.5" × 11")
- **Font**: Calibri 11pt (body), 10pt (contact info)
- **Section Headers**: 11pt bold with edge-to-edge underline
- **Bullets**: 0.18" hanging indent, • character
- **Dates**: Right-aligned at 7.5" from left

---

## Authentication & Security

### JWT Token Management

**Generation** (`utils/security.py`):
```python
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=1440))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt
```

**Validation** (`middleware/auth_middleware.py`):
```python
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
```

---

### Email Verification Middleware

```python
async def get_current_verified_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    # First get authenticated user
    user = await get_current_user(credentials, db)

    # Check if email is verified
    if not user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Email not verified. Please verify your email.",
            headers={"X-Email-Verified": "false"}
        )

    return user
```

**Usage**: Replace `get_current_user` with `get_current_verified_user` on all protected routes

---

### Password Hashing

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

---

### Google OAuth Integration

**Verification** (`services/auth_service.py`):
```python
from google.oauth2 import id_token
from google.auth.transport import requests

def authenticate_google_user(db: Session, id_token_str: str) -> User:
    # Verify token with Google
    id_info = id_token.verify_oauth2_token(
        id_token_str,
        requests.Request(),
        GOOGLE_CLIENT_ID
    )

    email = id_info['email']
    google_id = id_info['sub']

    # Check if user exists by email (unique email enforcement)
    user = db.query(User).filter(User.email == email).first()

    if user:
        if user.google_id is None:
            # Link Google account to existing password account
            user.google_id = google_id
            user.email_verified = True  # Auto-verify
            user.verification_token = None
            user.verification_token_expires = None
        elif user.google_id != google_id:
            # Email exists with different Google ID - reject
            raise HTTPException(400, "Email already associated with different Google account")
    else:
        # Create new user
        user = User(
            email=email,
            google_id=google_id,
            full_name=id_info.get('name'),
            profile_picture_url=id_info.get('picture'),
            email_verified=True  # Google users pre-verified
        )
        db.add(user)

    db.commit()
    return user
```

**Unique Email Enforcement**:
- ONE email = ONE user account
- Password user can link Google account
- Google user cannot duplicate if email exists with different Google ID

---

## Email System

### Resend Integration

**Setup**:
1. Sign up at https://resend.com (3000 emails/month free)
2. Get API key from dashboard
3. Add to `.env`: `RESEND_API_KEY=re_your_key`

**Email Templates** (`services/email_service.py`):

**Verification Email**:
- Subject: "Verify your email - SkillMap"
- Contains: 6-digit code + magic link button
- Styling: Green gradient theme
- Expiry: 10 minutes

**Welcome Email**:
- Subject: "🎉 Welcome to SkillMap!"
- Contains: 100 FREE credits announcement
- CTA: "Upload Your Resume" button

**Domain Verification** (Production):
1. Add domain in Resend dashboard
2. Add DNS records (TXT for DKIM)
3. Verify domain
4. Update `FROM_EMAIL=SkillMap <noreply@yourdomain.com>`

---

## Credit System & Payments

### Pricing Model

**Token-Based Pricing**: 2000 tokens = 1 credit (rounded to nearest 0.5)

**Credit Packages**:
```python
CREDIT_PACKAGES = [
    {"credits": 50, "price": 5.00},    # $0.10 per credit
    {"credits": 100, "price": 9.00},   # $0.09 per credit (10% savings)
    {"credits": 250, "price": 20.00},  # $0.08 per credit (20% savings)
    {"credits": 500, "price": 35.00},  # $0.07 per credit (30% savings)
]
```

**Tailoring Cost**: 4-6 credits per resume (avg 4.2 credits = ~$0.42)

---

### Stripe Integration

**Checkout Flow**:
```
1. User clicks "Recharge Credits" → Select package
   ↓
2. Frontend calls POST /api/credits/create-checkout-session
   ↓
3. Backend creates Stripe checkout session
   ↓
4. Frontend redirects to Stripe Checkout URL
   ↓
5. User completes payment
   ↓
6. Stripe sends webhook to /api/credits/webhook
   ↓
7. Backend validates webhook → Adds credits → Creates transaction
   ↓
8. User redirected to /profile?payment=success
   ↓
9. Frontend auto-refreshes credits
```

**Checkout Session Creation** (`routers/credits.py`):
```python
def create_checkout_session(credits: int, user: User):
    # Get package details
    package = next(p for p in CREDIT_PACKAGES if p['credits'] == credits)

    # Create Stripe session
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f'{credits} SkillMap Credits',
                    'description': f'Get {credits} credits for resume tailoring'
                },
                'unit_amount': int(package['price'] * 100)  # Cents
            },
            'quantity': 1
        }],
        mode='payment',
        success_url=f"{FRONTEND_URL}/profile?payment=success",
        cancel_url=f"{FRONTEND_URL}/profile?payment=cancelled",
        client_reference_id=str(user.id),
        metadata={
            'user_id': user.id,
            'credits': credits
        }
    )

    return {"session_id": session.id, "url": session.url}
```

**Webhook Handler** (`routers/credits.py`):
```python
@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')

    # Verify webhook signature
    event = stripe.Webhook.construct_event(
        payload, sig_header, STRIPE_WEBHOOK_SECRET
    )

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        stripe_session_id = session['id']

        # Check idempotency (already processed?)
        existing = db.query(CreditTransaction).filter(
            CreditTransaction.stripe_session_id == stripe_session_id
        ).first()
        if existing:
            return {"status": "already_processed"}

        # Add credits to user
        user_id = session['metadata']['user_id']
        credits = int(session['metadata']['credits'])

        user = db.query(User).filter(User.id == user_id).first()
        user.credits += credits

        # Create transaction record
        transaction = CreditTransaction(
            user_id=user_id,
            amount=credits,
            balance_after=user.credits,
            transaction_type='PURCHASE',
            description=f'Purchased {credits} credits',
            stripe_session_id=stripe_session_id
        )
        db.add(transaction)
        db.commit()

    return {"status": "ok"}
```

---

### Local Webhook Testing

**Stripe CLI Setup**:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS

# Login to Stripe account
stripe login

# Forward webhooks to local backend
stripe listen --forward-to http://localhost:8000/api/credits/webhook

# Copy webhook signing secret to .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Restart backend
uvicorn main:app --reload
```

**Testing**:
```bash
# Trigger test event
stripe trigger checkout.session.completed
```

---

### Auto-Recharge System (Future Feature)

**Database Fields** (`models/user.py`):
```python
auto_recharge_enabled = Column(Boolean, default=False)
auto_recharge_credits = Column(Integer, nullable=True)
auto_recharge_threshold = Column(Float, default=10.0)
stripe_customer_id = Column(String(255))
stripe_payment_method_id = Column(String(255))
```

**Background Job** (`jobs/auto_recharge_job.py`):
```python
def auto_recharge():
    # Find users with auto-recharge enabled and low balance
    users = db.query(User).filter(
        User.auto_recharge_enabled == True,
        User.credits < User.auto_recharge_threshold,
        User.stripe_payment_method_id != None
    ).all()

    for user in users:
        # Charge saved payment method
        stripe.PaymentIntent.create(
            amount=calculate_amount(user.auto_recharge_credits),
            currency='usd',
            customer=user.stripe_customer_id,
            payment_method=user.stripe_payment_method_id,
            off_session=True,
            confirm=True
        )

        # Add credits + 20 bonus
        user.credits += (user.auto_recharge_credits + 20)
        db.commit()
```

**Cron Job** (production):
```bash
# Run hourly
0 * * * * cd /path/to/backend && /path/to/venv/bin/python -m jobs.auto_recharge_job
```

---

## Document Processing

### DOCX → PDF Conversion

**LibreOffice Headless Mode**:
```python
def convert_docx_to_pdf(docx_bytes: bytes) -> tuple[bytes, str]:
    # Save DOCX to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as f:
        f.write(docx_bytes)
        docx_path = f.name

    # Convert to PDF
    subprocess.run([
        'soffice',
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', temp_dir,
        docx_path
    ], check=True, timeout=30)

    # Read PDF bytes
    pdf_path = docx_path.replace('.docx', '.pdf')
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    # Cleanup
    os.remove(docx_path)
    os.remove(pdf_path)

    return pdf_bytes, 'application/pdf'
```

**System Installation**:
```bash
# macOS
brew install --cask libreoffice

# Ubuntu/Debian
sudo apt-get install libreoffice

# Verify
soffice --version
```

---

### OCR with Tesseract

**PDF to Images**:
```python
from pdf2image import convert_from_path

images = convert_from_path(pdf_path, dpi=300)
```

**Image to Text**:
```python
import pytesseract
from PIL import Image

text = pytesseract.image_to_string(Image.open(image_path), lang='eng')
```

**System Installation**:
```bash
# macOS
brew install tesseract poppler

# Ubuntu/Debian
sudo apt-get install tesseract-ocr poppler-utils

# Verify
tesseract --version
pdfinfo -v
```

---

## Environment Setup

### Prerequisites
- Python 3.10+
- PostgreSQL (or SQLite for dev)
- Tesseract OCR
- Poppler (for PDF to image)
- LibreOffice (for PDF conversion)

### Installation

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Environment Variables

Create `.env` file:
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db  # Production
# DATABASE_URL=sqlite:///./skillmap.db             # Development

# Security
SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
FRONTEND_URL=http://localhost:5173

# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-proj-your-key
OPENAI_MODEL=gpt-4o-2024-08-06

# LangSmith (Optional but recommended)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-key
LANGCHAIN_PROJECT=SkillMap

# Resend Email
RESEND_API_KEY=re_your_key
FROM_EMAIL=SkillMap <onboarding@resend.dev>

# Stripe (REQUIRED for credits)
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-key
STRIPE_SUCCESS_URL=http://localhost:5173/profile?payment=success
STRIPE_CANCEL_URL=http://localhost:5173/profile?payment=cancelled

# Credit Settings
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0
TOKENS_PER_CREDIT=2000
```

### Database Migration

**Create tables**:
```bash
cd backend
source venv/bin/activate
python -c "
from config.database import engine, Base
from models.user import User
from models.project import Project
from models.base_resume import BaseResume
from models.credit_transaction import CreditTransaction
Base.metadata.create_all(bind=engine)
print('✓ Database tables created!')
"
```

**Run migrations**:
```bash
python migrations/add_email_verification.py
python migrations/add_auto_recharge.py
python migrations/fix_credit_transactions_fkey.py
```

### Development Server

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Access**:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs (Swagger UI)
- ReDoc: http://localhost:8000/redoc

---

## Deployment

### Production Stack
- **Database**: Neon PostgreSQL (serverless, us-east-1)
- **Backend**: Railway (https://skillmap-production.up.railway.app)
- **Frontend**: Vercel (https://skill-map-six.vercel.app)

### Neon PostgreSQL Setup

**Why Neon?**
- Serverless PostgreSQL with instant branching
- No cold starts
- Auto-scaling compute
- Auto-suspend to save costs
- Built-in connection pooling
- Point-in-time recovery
- Generous free tier

**Create Project**:
1. Go to https://neon.tech/
2. Create project: `skillmap-production`
3. Region: `us-east-1`
4. Copy connection string

**Connection String**:
```
postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**Run Migrations**:
```bash
cd backend
source venv/bin/activate
# Update DATABASE_URL in .env
python -c "
from config.database import engine, Base
from models.user import User
from models.project import Project
from models.credit_transaction import CreditTransaction
Base.metadata.create_all(bind=engine)
"
```

---

### Railway Deployment

**Required Files**:

**Procfile**:
```
web: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**runtime.txt** (optional):
```
python-3.11
```

**Deployment Steps**:
1. Sign up at https://railway.app/
2. Create "New Project" → "Deploy from GitHub repo"
3. Select SkillMap repository
4. Root Directory: `backend`
5. Add environment variables (all production vars)
6. Deploy

**Auto-deploy**: On push to main branch

**Monitoring**:
- Railway Dashboard → Deployments → View Logs
- Monitor CPU, memory, response time

---

### Environment Variables (Production)

```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-rough-cherry-ahd984kf-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require

# Security
SECRET_KEY=sjnkx_hgEFwxCZMmno5kLHob52rmYjfTybqSCbjFDA4xEmzekxx6D66zHweASMeS
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# OpenAI
OPENAI_API_KEY=sk-proj-your-production-key
OPENAI_MODEL=gpt-4o-2024-08-06

# LangSmith
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your-production-key
LANGCHAIN_PROJECT=SkillMap-Production

# Resend
RESEND_API_KEY=re_your_production_key
FROM_EMAIL=SkillMap <noreply@yourdomain.com>

# Stripe (LIVE keys)
STRIPE_SECRET_KEY=sk_live_your-production-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-production-key
STRIPE_WEBHOOK_SECRET=whsec_your-production-webhook-secret
STRIPE_SUCCESS_URL=https://skill-map-six.vercel.app/profile?payment=success
STRIPE_CANCEL_URL=https://skill-map-six.vercel.app/profile?payment=cancelled

# Google OAuth
GOOGLE_CLIENT_ID=your-production-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-production-client-secret

# CORS
FRONTEND_URL=https://skill-map-six.vercel.app

# Credits
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0
TOKENS_PER_CREDIT=2000
```

---

### Production Checklist

#### Pre-Deployment
- [ ] Test all features locally with Neon database
- [ ] Verify all environment variables set correctly
- [ ] Run database migrations on Neon
- [ ] Test Stripe webhooks locally
- [ ] Generate requirements.txt

#### Backend (Railway)
- [x] Railway project created
- [x] GitHub repository connected
- [x] Environment variables configured
- [x] Backend deployed successfully
- [x] Health check endpoint returns 200
- [ ] Production Stripe keys configured
- [ ] Stripe webhook endpoint configured in Stripe Dashboard

#### Database (Neon)
- [x] Neon project created
- [x] Database tables created and indexed
- [ ] Automatic backups enabled
- [ ] Backup retention configured (7-30 days)
- [ ] Connection pooling verified

#### Security
- [x] Strong SECRET_KEY (32+ random characters)
- [x] CORS configured for production domain
- [x] PostgreSQL connection uses SSL
- [ ] Stripe webhook signature verification working
- [ ] Google OAuth redirect URIs configured

#### Monitoring
- [ ] Railway metrics dashboard enabled
- [ ] LangSmith monitoring configured
- [ ] Stripe email notifications enabled
- [ ] Error tracking (Sentry)

---

## Troubleshooting

### Common Issues

#### 1. OpenAI API Key Error

**Problem**: `api_key must be set`

**Solution**:
```bash
# Add to .env
OPENAI_API_KEY=sk-proj-your-key

# Restart server
uvicorn main:app --reload
```

---

#### 2. PDF Preview Not Working

**Problem**: PDF not showing or downloads instead

**Solution**:
```bash
# Install LibreOffice
brew install --cask libreoffice  # macOS
sudo apt-get install libreoffice  # Ubuntu

# Verify
soffice --version
```

---

#### 3. OCR Returns Empty Text

**Problem**: Tesseract not installed

**Solution**:
```bash
# Install Tesseract
brew install tesseract  # macOS
sudo apt-get install tesseract-ocr  # Ubuntu

# Verify
tesseract --version
```

---

#### 4. Credits Not Adding After Payment

**Problem**: Payment successful but credits don't update

**Solution**:
1. Ensure `stripe listen` is running
2. Verify webhook secret in `.env` matches CLI output
3. Check backend terminal for webhook errors
4. Restart backend after updating secret

**Check webhook logs**:
```bash
# Stripe Dashboard → Developers → Webhooks → View Logs
```

---

#### 5. LangSmith 403 Forbidden

**Problem**: Failed to POST to LangSmith

**Solution**: Verify `LANGCHAIN_API_KEY` is correct and not expired

---

#### 6. Database Connection Error

**Problem**: `could not connect to server`

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check Neon database is active (auto-suspends after inactivity)
3. Wake up database by visiting Neon dashboard

---

#### 7. CORS Errors

**Problem**: Frontend can't reach backend

**Solution**: Add frontend URL to `CORS_ORIGINS` in `.env`

```bash
CORS_ORIGINS=http://localhost:5173,https://skill-map-six.vercel.app
```

---

#### 8. Email Not Sending

**Problem**: Verification email not received

**Solution**:
1. Check `RESEND_API_KEY` is correct
2. Verify API key is active in Resend dashboard
3. Check monthly quota (3000 free emails)
4. Restart backend after updating `.env`

---

#### 9. High Memory Usage

**Problem**: Backend using too much memory

**Solution**:
- Upgrade Railway plan
- Implement file size limits
- Add request queuing
- Monitor with Railway metrics

---

#### 10. Version History Not Saving

**Problem**: Tailoring doesn't create new versions

**Solution**:
1. Check selective versioning logic (only changed sections get versions)
2. Verify `flag_modified()` called for JSON columns
3. Check database logs for errors

---

## Performance Optimization

### Database Indexing

**Indexes**:
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification_link_token ON users(verification_link_token);

-- Projects
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Credit Transactions
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_stripe_session_id ON credit_transactions(stripe_session_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
```

---

### Caching Strategies

**PDF Caching**:
```python
# Cache generated PDFs to avoid regenerating
# (Feature removed due to complexity, but can be re-implemented)
```

**Project Caching**:
- Frontend caches projects in `ProjectContext`
- Backend could implement Redis caching for frequently accessed projects

---

### Token Usage Optimization

**Prompt Optimization**:
- Detailed prompts ensure quality but increase token usage
- Current average: ~4,200 tokens per tailoring
- Cost: ~$0.042 per tailoring

**Balance**: Quality > Token Savings

---

## Security Best Practices

### Input Validation
- All user input validated with Pydantic schemas
- File upload size limits (10 MB)
- File format whitelist

### SQL Injection Prevention
- SQLAlchemy ORM (no raw SQL)
- Parameterized queries

### XSS Protection
- React handles escaping
- No dangerouslySetInnerHTML

### CSRF Protection
- JWT tokens (stateless)
- Stripe webhook signature verification

### Rate Limiting
- Email verification resend: 60 seconds cooldown
- (Can add general rate limiting with slowapi)

---

## Monitoring & Logging

### Logging Configuration

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
```

**Log Important Events**:
- User registration/login
- Resume uploads
- Tailoring sessions
- Credit transactions
- Webhook events
- Errors and exceptions

---

### LangSmith Monitoring

**Queries**:
```
# Filter by tool name
tool_name = "tailor_resume_content"

# Check token usage trends
avg(metadata.tokens_used) over last 7 days

# Monitor error rate
count(errors) / count(total) over last 24 hours
```

---

## Background Jobs

### cleanup_unverified_users.py

**Purpose**: Delete unverified users older than 30 days

**How to Run**:
```bash
cd backend
python -m jobs.cleanup_unverified_users
```

**Cron Job** (production):
```bash
# Run daily at 3 AM
0 3 * * * cd /path/to/backend && /path/to/venv/bin/python -m jobs.cleanup_unverified_users
```

---

### auto_recharge_job.py

**Purpose**: Auto-charge users when credits fall below threshold

**How to Run**:
```bash
cd backend
python -m jobs.auto_recharge_job
```

**Cron Job** (production):
```bash
# Run hourly
0 * * * * cd /path/to/backend && /path/to/venv/bin/python -m jobs.auto_recharge_job
```

---

## Testing

### Manual Testing Checklist

#### Authentication
- [ ] Register with email/password
- [ ] Receive verification email
- [ ] Verify with 6-digit code
- [ ] Verify with magic link
- [ ] Login with unverified account → Receive new code
- [ ] Google OAuth signup → Auto-verified
- [ ] Google OAuth login → Direct access

#### Resume Upload
- [ ] Upload DOCX → Extraction successful
- [ ] Upload PDF → Extraction successful
- [ ] Upload image → OCR used
- [ ] Invalid format → Error shown
- [ ] File too large → Error shown

#### Tailoring
- [ ] Create project
- [ ] Enter job description
- [ ] Tailor resume
- [ ] View agent progress (SSE messages)
- [ ] Check credit deduction
- [ ] Verify version history created
- [ ] Download PDF/DOCX

#### Credits
- [ ] Purchase credits via Stripe
- [ ] Credits update after payment
- [ ] View transaction history
- [ ] Low balance warning appears

---

### Stripe Testing

**Test Cards**:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Any future expiry, any CVC, any ZIP**

---

## API Documentation

**Swagger UI**: http://localhost:8000/docs
**ReDoc**: http://localhost:8000/redoc

**Interactive Testing**: Use Swagger UI to test all endpoints

---

## Cost Estimation

### Free Tier (Development)
- **Neon**: Free tier (512 MB storage, 0.5 GB RAM)
- **Railway**: $5 credit free per month
- **OpenAI**: Pay-per-use (~$0.042 per tailoring)
- **Stripe**: Free (2.9% + $0.30 per transaction)
- **Resend**: 3000 emails/month free
- **Total**: ~$0-10/month

### Production Tier (Low-Medium Traffic)
- **Neon**: ~$10-20/month (Pro plan)
- **Railway**: ~$20-30/month (Pro plan)
- **OpenAI**: ~$20-100/month (depends on usage)
- **Stripe**: Free (pay per transaction)
- **Resend**: Free (sufficient for <3000 emails/month)
- **Total**: ~$50-150/month

---

## Credits

**Platform**: SkillMap - AI Resume Tailoring Platform
**Repository**: https://github.com/gAIytri/SkillMap
**Backend Framework**: FastAPI
**AI Model**: OpenAI GPT-4o

---

**Last Updated**: November 29, 2025
