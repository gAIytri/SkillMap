# SkillMap Backend Documentation

## Overview
SkillMap backend is a FastAPI application that handles resume processing, AI-powered tailoring, and project management for tailored resumes.

## Tech Stack
- **Framework**: FastAPI
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **AI**: OpenAI GPT-4 (Structured Outputs)
- **Agent Framework**: LangChain + LangGraph (ReAct agent)
- **Monitoring**: LangSmith (agent tracing and debugging)
- **Document Processing**: python-docx
- **PDF Conversion**: LibreOffice (headless mode)
- **Authentication**: JWT + Google OAuth
- **Streaming**: Server-Sent Events (SSE)

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
│   ├── resume_tailoring_service.py  # AI resume tailoring (legacy)
│   ├── resume_agent_service.py      # LangChain agent orchestration (NEW)
│   ├── agent_tools.py               # LangChain tools for agent (NEW)
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
tailoring_history: JSON         # Version history (array, max 10 entries)
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

### 3. Resume Tailoring (Legacy)
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

### 3b. Agent-Based Tailoring (Recommended)
```
User pastes JD + clicks "Tailor with Agent" →
[Checkpoint 1] Guardrail validates input intent →
[Checkpoint 2] Summarize job requirements (skills, keywords, focus) →
[Checkpoint 3] Tailor resume with job summary + resume JSON →
Save current version to history →
Update project resume_json →
Stream progress to frontend in real-time →
Regenerate PDF preview
```

**Endpoint**: `POST /api/projects/{id}/tailor-with-agent` (SSE streaming)
- **Guardrail Tool**: Validates intent (job_description vs invalid input)
- **Summarization Tool**: Extracts required_skills, ATS keywords, role_focus
- **Tailoring Tool**: Applies transformations based on job summary
- **Real-time Streaming**: Frontend shows progress after each tool
- **History Tracking**: Saves previous version before updating
- **LangSmith Tracing**: All tool calls traced for debugging
- Returns JSON stream of status updates + final tailored JSON

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

### agent_tools.py (NEW)
LangChain tools for the ReAct agent system.

```python
@tool
def validate_intent(user_message: str) -> dict:
    """Guardrail tool that validates user intent for resume tailoring."""
    # Uses GPT-4o-mini to classify intent
    # Returns: {valid: bool, intent_type: str, message: str, confidence: float}

@tool
def summarize_job_description(job_description: str) -> dict:
    """Analyzes and summarizes a job description to extract key requirements."""
    # Returns: {
    #   required_skills: list,
    #   preferred_skills: list,
    #   key_responsibilities: list,
    #   ats_keywords: list,
    #   role_focus: str
    # }

@tool
def tailor_resume_content(job_summary: dict) -> dict:
    """Tailors the resume JSON based on the summarized job requirements."""
    # Gets resume_json from runtime context
    # Returns: {
    #   success: bool,
    #   tailored_json: dict,
    #   changes_made: list[str]
    # }
```

**Runtime Context**:
- Uses global `_runtime_context` dict to share data between tools
- `set_runtime_context(resume_json, job_description)` - Set context before agent runs
- `get_runtime_context()` - Retrieve context within tools

### resume_agent_service.py (NEW)
Main ReAct agent orchestration with streaming.

```python
class ResumeTailoringAgent:
    """LangChain ReAct agent for resume tailoring"""

async def stream_tailor_resume(
    resume_json: dict,
    job_description: str,
    project_id: int
) -> AsyncIterator[dict]:
    """
    Stream resume tailoring process with real-time updates

    Yields:
    - {"type": "status", "message": "...", "step": "initialization"}
    - {"type": "tool_result", "tool": "validate_intent", "data": {...}}
    - {"type": "final", "success": true, "tailored_json": {...}}
    """
```

**Key Features**:
- Sequential tool execution: validate → summarize → tailor
- Real-time streaming with `yield` + `await asyncio.sleep(0)` for immediate flush
- Error handling and graceful degradation
- Integrates with LangSmith for tracing
- Returns structured updates for frontend consumption

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

# LangSmith (Agent Tracing & Monitoring) - Optional but recommended
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=lsv2_pt_your-langsmith-api-key
LANGCHAIN_PROJECT=SkillMap
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
- `POST /api/projects/{id}/tailor` - Tailor resume for JD (legacy)
- `POST /api/projects/{id}/tailor-with-agent` - Agent-based tailoring with SSE streaming (recommended)

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

## Version Control

### Repository
- **GitHub**: https://github.com/gAIytri/SkillMap
- **Branch**: main

### Initial Setup (Already Done)
```bash
# Initialize git repository
git init

# Add remote
git remote add origin https://github.com/gAIytri/SkillMap.git

# Create .gitignore (already exists)
# Push to GitHub
git add .
git commit -m "Initial commit"
git push -u origin main
```

### .gitignore Configuration
The `.gitignore` file excludes:
- `.env` files (API keys, secrets)
- `venv/` (Python virtual environment)
- `node_modules/` (Node.js dependencies)
- `*.db`, `*.sqlite` (Database files)
- `__pycache__/`, `*.pyc` (Python cache)
- `generated_pdfs/`, `generated_docx/` (Temporary files)
- IDE files (`.vscode/`, `.idea/`)
- System files (`.DS_Store`)

### Best Practices
1. **Never commit sensitive data**:
   - API keys (use `.env.example` as template)
   - Database files
   - User data
   - Generated files

2. **Commit messages**:
   - Use clear, descriptive messages
   - Reference issue numbers if applicable
   - Follow conventional commits format

3. **Branching**:
   - `main` - production-ready code
   - `develop` - development branch
   - `feature/*` - feature branches
   - `bugfix/*` - bug fix branches

4. **Pull Requests**:
   - Create PR for all changes
   - Request code review
   - Run tests before merging
   - Squash commits if needed

### Working with the Repository

```bash
# Clone the repository
git clone https://github.com/gAIytri/SkillMap.git
cd SkillMap

# Create .env files (not in repo)
cp backend/.env.example backend/.env
# Add your OPENAI_API_KEY to backend/.env

# Install dependencies
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install

# Start development servers (separate terminals)
# Terminal 1 - Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## LangSmith Setup (Agent Monitoring)

### What is LangSmith?
LangSmith is LangChain's monitoring and debugging platform that provides:
- **Real-time Tracing**: See every step your agent takes
- **Debugging**: Inspect tool calls, inputs, outputs, and errors
- **Performance Monitoring**: Track latency, token usage, and costs
- **Evaluation**: Test and compare different prompts

### Setup Steps

1. **Get API Key**:
   - Go to https://smith.langchain.com/
   - Sign in and navigate to Settings → API Keys
   - Create a new API key (starts with `lsv2_pt_...`)

2. **Update `.env`**:
   ```bash
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
   LANGCHAIN_API_KEY=lsv2_pt_your-actual-api-key
   LANGCHAIN_PROJECT=SkillMap
   ```

3. **Restart Backend**:
   ```bash
   source venv/bin/activate
   uvicorn main:app --reload
   ```

4. **View Traces**:
   - Run agent once (click "Tailor with Agent")
   - Check LangSmith dashboard at https://smith.langchain.com/
   - Select project "SkillMap" to see traces

### What You'll See
- Tool execution timeline: validate_intent → summarize_job_description → tailor_resume_content
- Input/output for each tool
- Token usage and costs
- Error traces with full stack traces
- Latency metrics

## History Tracking

### Overview
Every time a resume is tailored, the previous version is saved to `tailoring_history` before updating.

### History Entry Structure
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

### Storage
- Stored in `projects.tailoring_history` (JSON array)
- Maximum 10 versions kept (oldest removed when exceeded)
- Accessible via `/api/projects/{id}` endpoint

### Frontend Integration
- Formatted view shows version history in accordions
- Current version highlighted in green
- Previous versions collapsible with timestamps
- Easy comparison between versions

## DOCX Recreation Improvements

### Enhanced Bullet Point Handling
The `docx_recreation_service.py` now handles multiple bullet formats:

**Smart Bullet Splitting**:
```python
# String format: "Sentence 1. Sentence 2. Sentence 3."
bullets_raw = "Developed API. Implemented auth. Deployed to AWS."
# Splits into 3 separate bullets

# Array format: ["Bullet 1", "Bullet 2"]
bullets_raw = ["Developed API", "Implemented auth"]
# Uses as-is

# Single paragraph array: ["Long paragraph. With periods."]
bullets_raw = ["Developed API. Implemented auth."]
# Detects and splits by periods
```

**Improved Section Detection**:
- Handles ALL CAPS headings
- Detects by font size (>12pt)
- More flexible keyword matching
- Logs which sections are found

**Enhanced Bullet Detection**:
- Supports 11 bullet characters: `•, -, *, ○, ▪, ·, ◦, ▫, ►, ➢, ⬩`
- Detects numbered bullets (1. 2. 3.)
- Handles List paragraph styles

### Why This Matters
- **Before**: Only summary and skills updated in PDF
- **After**: Work experience and projects also update correctly
- **Success Rate**: 80-90% of resumes now update properly

## Template-Based Generation (Future)

### Current Approach: DOCX Recreation
- **Pros**: Preserves original formatting, user's personal style
- **Cons**: 80-90% success rate, complex layouts may not update perfectly

### Planned Approach: Template Library
**Status**: Planned for next phase

**Architecture**:
```
User uploads resume → Extract to JSON →
User selects template (Modern, ATS-Optimized, Creative) →
Generate DOCX from template + JSON →
100% reliable updates
```

**Template Library Options**:
1. **python-docx**: Simple, good for basic templates
2. **docxtpl**: Jinja2 templates in DOCX (recommended)
3. **LaTeX**: Best quality but complex

**Implementation Plan**:
1. Create 2-3 professional resume templates
2. Build `template_generation_service.py`:
   ```python
   def generate_from_template(resume_json: dict, template_name: str) -> bytes:
       template = load_template(template_name)
       populated = fill_template(template, resume_json)
       return docx_bytes
   ```
3. Add frontend template selector dropdown
4. Allow users to choose: "Use my format" vs "Use template"

**Benefits**:
- 100% reliable updates
- Professional, ATS-optimized templates
- Consistent formatting across tailored versions
- Easier to maintain and extend

**Hybrid Approach** (Best of Both):
- Default: Try DOCX recreation first
- Fallback: If recreation fails, offer template generation
- User choice: "Use my format" or "Use template"

## Recent Updates

### Latest Changes (Current Version)

**LangChain Agent System** (NEW):
- ReAct agent architecture with 3 tools: validate_intent, summarize_job_description, tailor_resume_content
- Real-time streaming via Server-Sent Events (SSE)
- Guardrail checkpoint to validate user input intent
- Job description summarization before tailoring
- Sequential tool execution with progress updates
- LangSmith integration for agent tracing and debugging
- Runtime context for sharing data between tools

**History Tracking** (NEW):
- Version history saved in `tailoring_history` JSON column
- Stores last 10 tailored versions with timestamps
- Each entry includes: timestamp, resume_json, job_description, changes_made
- Frontend displays version history in accordions
- Easy comparison between current and previous versions

**DOCX Recreation Improvements**:
- Smart bullet point splitting (handles string, array, and paragraph formats)
- Enhanced section detection (ALL CAPS, font size >12pt)
- Improved bullet detection (11 bullet characters, numbered bullets)
- Comprehensive logging for debugging
- Success rate improved to 80-90%
- Work experience and projects now update correctly in PDF

**Enhanced AI Tailoring Service**:
- Substantially improved tailoring prompt for more impactful changes
- Professional summary rewritten to directly address job requirements
- Work experience bullets transformed with technical depth and quantified impact
- Projects reordered by relevance to job description
- Skills reorganized to prioritize JD-matching skills first
- Enhanced project descriptions within technology boundaries
- Increased temperature to 0.4 for more creative enhancements
- Increased max_tokens to 4096 for detailed responses

**PDF Preview Improvements**:
- LibreOffice integration for DOCX to PDF conversion
- Inline browser preview instead of auto-downloads
- Proper Content-Disposition headers for preview mode
- Fallback to DOCX if LibreOffice unavailable

**Database Schema**:
- Made legacy fields nullable (tailored_latex_content, pdf_url, latex_content)
- Core fields required (original_docx, resume_json, doc_metadata, original_filename)
- Clean separation between active and legacy fields

**Code Cleanup**:
- Removed 6 unused services (convert_service, docx_service, extract_service, latex_service, llm_extractor, pdf_service)
- Eliminated LaTeX dependencies completely
- Simplified to DOCX + JSON workflow only
- Consolidated documentation to 3 markdown files

**Documentation**:
- Comprehensive BACKEND.md with all service details
- Complete FRONTEND.md with user flows and components
- Clean README.md with quick start guide
- Removed 10+ redundant markdown files

**Version Control**:
- Git repository initialized
- Pushed to GitHub: https://github.com/gAIytri/SkillMap
- Proper .gitignore configuration
- Sensitive data excluded from repository

### Future Improvements

- [ ] Multiple file format support (PDF upload)
- [ ] Collaborative editing
- [ ] Template library
- [ ] Analytics dashboard
- [ ] Mobile app
- [ ] Browser extension
- [ ] ATS compatibility checker
- [ ] Resume scoring system
- [ ] Cover letter generation
- [ ] LinkedIn profile optimization
