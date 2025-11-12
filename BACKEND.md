# SkillMap Backend Documentation

## Overview
SkillMap backend is a FastAPI application that handles resume processing, AI-powered tailoring, and project management for tailored resumes.

## Tech Stack
- **Framework**: FastAPI
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **AI**: OpenAI GPT-4 (Structured Outputs)
- **Document Processing**: python-docx
- **PDF Conversion**: LibreOffice (headless mode)
- **Authentication**: JWT + Google OAuth

## Project Structure
```
backend/
├── config/
│   ├── database.py          # Database connection
│   └── settings.py          # Environment settings
├── models/
│   ├── user.py             # User model
│   ├── base_resume.py      # Base resume model
│   └── project.py          # Project model
├── routers/
│   ├── auth.py             # Authentication endpoints
│   ├── resumes.py          # Resume upload/management
│   └── projects.py         # Project CRUD + tailoring
├── services/
│   ├── auth_service.py              # Auth logic
│   ├── resume_extractor.py          # LLM resume extraction
│   ├── docx_recreation_service.py   # Recreate DOCX from JSON
│   ├── resume_tailoring_service.py  # AI resume tailoring
│   └── docx_to_pdf_service.py       # DOCX to PDF conversion
├── schemas/
│   ├── user.py             # User schemas
│   ├── resume.py           # Resume schemas
│   └── project.py          # Project schemas
├── middleware/
│   └── auth_middleware.py  # JWT middleware
└── main.py                 # FastAPI app entry point
```

## Database Schema

### Users Table
```python
id: Integer (PK)
email: String (unique)
hashed_password: String
full_name: String
google_id: String (optional)
created_at: DateTime
updated_at: DateTime
```

### Base Resumes Table
```python
id: Integer (PK)
user_id: Integer (FK -> users.id, unique)
original_filename: String
original_docx: LargeBinary      # Original DOCX bytes
resume_json: JSON               # Extracted structured data
doc_metadata: JSON              # Styling info (optional)
latex_content: Text (nullable)  # Legacy field
created_at: DateTime
updated_at: DateTime
```

### Projects Table
```python
id: Integer (PK)
user_id: Integer (FK -> users.id)
project_name: String
job_description: Text
base_resume_id: Integer (FK -> base_resumes.id)
original_docx: LargeBinary      # DOCX bytes (from base or tailored)
resume_json: JSON               # Structured data (base or tailored)
doc_metadata: JSON              # Metadata
original_filename: String
tailored_latex_content: Text (nullable)  # Legacy field
pdf_url: Text (nullable)        # Legacy field
created_at: DateTime
updated_at: DateTime
```

## Core Workflow

### 1. Resume Upload
```
User uploads DOCX →
Extract with LLM (GPT-4) →
Store original DOCX + JSON in base_resumes →
Return to dashboard
```

**Endpoint**: `POST /api/resumes/upload`
- Extracts structured JSON using OpenAI Structured Outputs
- Stores original DOCX bytes + JSON in database
- No LaTeX conversion (simplified workflow)

### 2. Project Creation
```
User creates project →
Copy base_resume (DOCX + JSON) to project →
Project ready for tailoring
```

**Endpoint**: `POST /api/projects`
- Copies base resume content to new project
- Each project has independent resume data
- Can be tailored without affecting base resume

### 3. Resume Tailoring
```
User pastes JD + clicks "Tailor" →
Send project JSON + JD to GPT-4 →
LLM analyzes requirements and tailors content →
Update project resume_json →
Regenerate PDF preview
```

**Endpoint**: `POST /api/projects/{id}/tailor`
- Analyzes job description for requirements
- Restructures bullet points for relevance
- Reorganizes skills to prioritize JD matches
- Quantifies achievements where possible
- Updates professional summary
- **Does NOT add fake information**

### 4. Document Generation
```
Get project resume_json →
Recreate DOCX from original + updated JSON →
Convert DOCX to PDF (LibreOffice) →
Return for preview/download
```

**Endpoints**:
- `GET /api/projects/{id}/pdf` - PDF preview (inline)
- `GET /api/projects/{id}/docx` - DOCX download

## Key Services

### resume_extractor.py
Extracts structured data from resume using OpenAI.

```python
def extract_resume(docx_bytes: bytes) -> dict:
    """
    Extract resume using GPT-4 Structured Outputs
    Returns validated JSON matching ResumeData schema
    """
```

**Schema Structure**:
- `personal_info`: name, email, phone, links
- `professional_summary`: summary text
- `experience`: list of work entries with bullets
- `education`: list of education entries
- `skills`: categorized skills
- `projects`: project entries
- `certifications`: list of certifications

### docx_recreation_service.py
Recreates DOCX from original + modified JSON, preserving styling.

```python
def recreate_docx_from_json(original_docx_bytes: bytes, resume_json: dict) -> bytes:
    """
    Load original DOCX →
    Update content from JSON →
    Preserve all formatting →
    Return updated DOCX bytes
    """
```

**Features**:
- Preserves fonts, colors, spacing
- Maintains hyperlinks (email, LinkedIn, GitHub)
- Updates section content based on JSON
- Keeps original document structure

### resume_tailoring_service.py
Tailors resume for specific job descriptions using AI with substantial, impactful changes.

```python
def tailor_resume(resume_json: dict, job_description: str) -> dict:
    """
    Analyze JD requirements →
    Transform resume content →
    Return updated JSON
    """
```

**Tailoring Process** (Advanced):
1. **Professional Summary**: Rewrite as compelling paragraph addressing job requirements
2. **Work Experience Bullets**: Transform EVERY bullet point with:
   - Strong action verbs (Architected, Engineered, Optimized, Implemented)
   - Technical depth (frameworks, tools, methodologies, scale)
   - Quantified impact (performance gains, user numbers, efficiency improvements)
   - Format: [Action] + [What] + [How/Tech] + [Impact/Result]
3. **Projects**: Reorder by relevance to JD (best match first) + enhance descriptions with:
   - Architecture patterns (microservices, MVC, serverless)
   - Scale/complexity metrics (users, data volume, API calls)
   - Technical challenges solved
   - Stay within existing technology boundaries
4. **Skills**: Reorder each category to prioritize JD-matching skills first
5. **Language Quality**: Use highly technical, ATS-optimized language
6. **Never add fake information** - only enhance existing content

### docx_to_pdf_service.py
Converts DOCX to PDF using LibreOffice.

```python
def convert_docx_to_pdf(docx_bytes: bytes) -> tuple[bytes, str]:
    """
    Try LibreOffice conversion →
    Fallback to DOCX if unavailable →
    Return (file_bytes, media_type)
    """
```

## Environment Variables (.env)

```bash
# Database
DATABASE_URL=sqlite:///./skillmap.db

# Security
SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# File Upload
MAX_UPLOAD_SIZE=10485760
UPLOAD_DIR=./uploads

# OpenAI (REQUIRED)
OPENAI_API_KEY=sk-proj-your-api-key
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install LibreOffice (for PDF conversion)
```bash
# macOS
brew install --cask libreoffice

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install libreoffice

# Verify installation
soffice --version
```

### 3. Configure Environment
Create `.env` file with required variables (see above).

### 4. Run Migrations (if needed)
```bash
# Clear database (development only)
python clear_database.py

# Or apply specific migrations
python migrate_add_project_columns.py
```

### 5. Start Server
```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login with Google OAuth
- `GET /api/auth/me` - Get current user

### Resumes
- `POST /api/resumes/upload` - Upload DOCX resume
- `GET /api/resumes/base` - Get base resume
- `GET /api/resumes/base/recreated-docx` - Download base resume DOCX

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/pdf` - Get PDF preview (inline)
- `GET /api/projects/{id}/docx` - Download DOCX
- `POST /api/projects/{id}/tailor` - Tailor resume for JD

## Database Migrations

### Clear Database (Development)
```bash
python clear_database.py
```
**Warning**: Deletes all users, resumes, and projects.

### Add New Columns
```bash
python migrate_add_project_columns.py
```
Adds DOCX + JSON fields to projects table.

## Common Issues

### OpenAI API Key Not Found
**Problem**: `The api_key client option must be set`
**Solution**:
1. Check `.env` file has `OPENAI_API_KEY=sk-proj-...`
2. Restart the server after adding the key
3. Verify settings.py loads from .env correctly

### LibreOffice Not Found
**Problem**: PDF preview shows DOCX instead
**Solution**: Install LibreOffice (see Setup Instructions)

### Database Locked
**Problem**: `database is locked`
**Solution**:
1. Close all database connections
2. Restart the server
3. Use PostgreSQL for production

## Production Deployment

### 1. Update Settings
- Change `SECRET_KEY` to secure random string
- Use PostgreSQL instead of SQLite
- Set proper CORS origins
- Use production-grade server (gunicorn)

### 2. Database Migration
```bash
# Export from SQLite
sqlite3 skillmap.db .dump > backup.sql

# Import to PostgreSQL
psql -U user -d database -f backup.sql
```

### 3. Environment Variables
Set all `.env` variables as environment secrets in deployment platform.

### 4. Run with Gunicorn
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## Security Notes

- Never commit `.env` file
- Use strong `SECRET_KEY` in production
- Validate all user inputs
- Sanitize file uploads
- Rate limit API endpoints
- Use HTTPS in production
- Implement proper CORS settings

## Maintenance

### Backup Database
```bash
sqlite3 skillmap.db .backup backup_$(date +%Y%m%d).db
```

### View Logs
```bash
tail -f logs/app.log
```

### Monitor OpenAI Usage
Check OpenAI dashboard for API usage and costs.
