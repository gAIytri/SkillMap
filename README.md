# SkillMap - AI-Powered Resume Tailoring Platform

SkillMap is an intelligent resume tailoring platform that uses AI to customize your resume for specific job applications while preserving original formatting.

## Overview

Upload your resume once, and SkillMap will:
1. **Extract** structured data using AI (OpenAI GPT-4)
2. **Store** your base resume for reuse
3. **Tailor** content for specific job descriptions
4. **Generate** professionally formatted DOCX/PDF outputs

## Key Features

- 🤖 **AI-Powered Extraction**: OpenAI Structured Outputs for accurate resume parsing
- 🎯 **Smart Tailoring**: LangChain agent with guardrails and real-time streaming
- 📝 **Format Preservation**: Maintains original styling, fonts, colors, and hyperlinks
- 📁 **Project Management**: Create multiple tailored versions for different jobs
- 🔄 **Real-time Preview**: See changes immediately with PDF preview
- 📜 **Version History**: Track and compare previous tailored versions
- 📡 **Live Streaming**: Watch agent progress in real-time during tailoring
- 📊 **Agent Monitoring**: LangSmith integration for debugging and tracing
- 📥 **Multiple Exports**: Download as DOCX or PDF

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite / PostgreSQL
- **AI**: OpenAI GPT-4 (Structured Outputs)
- **Agent Framework**: LangChain + LangGraph (ReAct agent)
- **Monitoring**: LangSmith (agent tracing)
- **Streaming**: Server-Sent Events (SSE)
- **Document Processing**: python-docx
- **PDF Conversion**: LibreOffice

### Frontend
- **Framework**: React + Vite
- **UI**: Material-UI (MUI)
- **Routing**: React Router v6
- **State**: Context API
- **Auth**: JWT + Google OAuth

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API Key
- LibreOffice (for PDF conversion)

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
```

### Access the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Documentation

📖 **[Backend Documentation](./BACKEND.md)** - Complete backend guide including:
- API endpoints
- Database schema
- Services architecture
- Deployment instructions

📖 **[Frontend Documentation](./FRONTEND.md)** - Complete frontend guide including:
- Component structure
- User flows
- State management
- UI components

## Core Workflow

```
1. Sign Up / Login
   ↓
2. Upload Resume (.docx)
   ↓
3. AI Extracts Structured Data
   ↓
4. Create Project
   ↓
5. Paste Job Description
   ↓
6. Click "Tailor"
   ↓
7. AI Optimizes Content
   ↓
8. Download Tailored Resume (DOCX/PDF)
```

## Project Structure

```
SkillMap/
├── backend/              # FastAPI backend
│   ├── config/          # Settings & database
│   ├── models/          # SQLAlchemy models
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   ├── schemas/         # Pydantic schemas
│   └── main.py          # Entry point
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API clients
│   │   ├── context/     # React context
│   │   └── styles/      # Theming
│   └── vite.config.js
├── BACKEND.md           # Backend documentation
├── FRONTEND.md          # Frontend documentation
└── README.md            # This file
```

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL=sqlite:///./skillmap.db
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
OPENAI_API_KEY=sk-proj-your-key      # REQUIRED
CORS_ORIGINS=http://localhost:5173

# LangSmith (optional but recommended for agent monitoring)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_your-key
LANGCHAIN_PROJECT=SkillMap
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your-google-client-id  # Optional
```

## Key Features Explained

### AI Resume Extraction
- Uses OpenAI Structured Outputs API
- Extracts: personal info, experience, education, skills, projects
- Returns validated JSON matching strict schema
- No manual parsing required

### Smart Tailoring
- Analyzes job description for requirements
- Restructures bullet points for relevance
- Reorganizes skills to match JD priorities
- Quantifies achievements where possible
- Updates professional summary
- **Never adds fake information**

### Format Preservation
- Stores original DOCX bytes
- Modifies only content (not structure)
- Preserves: fonts, colors, spacing, hyperlinks
- Recreates DOCX from JSON + original styling

### PDF Conversion
- Uses LibreOffice in headless mode
- Generates PDF from tailored DOCX
- Inline preview in browser
- Download as PDF or DOCX

## Database Schema

### Users
- Authentication and profile data

### Base Resumes
- Original uploaded resume
- Extracted JSON data
- Metadata and styling info

### Projects
- Tailored resume versions
- Job descriptions
- Independent JSON data per project

See [BACKEND.md](./BACKEND.md) for complete schema details.

## API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Resumes
- `POST /api/resumes/upload`
- `GET /api/resumes/base`

### Projects
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects/{id}/tailor`
- `GET /api/projects/{id}/pdf`
- `GET /api/projects/{id}/docx`

See [BACKEND.md](./BACKEND.md) for complete API documentation.

## Common Issues

### OpenAI API Key Error
**Problem**: `api_key must be set`
**Solution**: Add `OPENAI_API_KEY` to backend `.env` and restart server

### PDF Preview Not Working
**Problem**: PDF not showing or downloads instead
**Solution**: Install LibreOffice (`brew install --cask libreoffice` on macOS)

### CORS Errors
**Problem**: Frontend can't reach backend
**Solution**: Add frontend URL to `CORS_ORIGINS` in backend `.env`

## Deployment

### Backend
```bash
# Production server
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Or use Docker
docker build -t skillmap-backend .
docker run -p 8000:8000 skillmap-backend
```

### Frontend
```bash
npm run build
# Deploy dist/ folder to Vercel, Netlify, or any static host
```

## Security

- JWT authentication with secure tokens
- Password hashing with bcrypt
- CORS protection
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- XSS protection with React

## Repository

**GitHub**: https://github.com/gAIytri/SkillMap

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/gAIytri/SkillMap.git
cd SkillMap

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Setup frontend (new terminal)
cd frontend
npm install
cp .env.example .env
# Update VITE_API_URL if needed
```

## Recent Updates

### Latest Features (Current Version)

**LangChain Agent System** (NEW):
- ReAct agent architecture with 3 tools: validate, summarize, tailor
- Real-time streaming via Server-Sent Events (SSE)
- Guardrail checkpoint validates user input intent
- Job description summarization before tailoring
- Frontend shows live progress during agent execution
- LangSmith integration for debugging and monitoring

**Version History Tracking** (NEW):
- Stores last 10 tailored versions with timestamps
- Accordion-based UI for easy version comparison
- Current version highlighted, previous versions collapsible
- Track changes made in each tailoring session

**DOCX Recreation Improvements**:
- Smart bullet point splitting (handles various formats)
- Enhanced section detection (ALL CAPS, font size)
- Improved bullet detection (11 bullet characters)
- 80-90% success rate for updating work experience and projects

**Enhanced AI Tailoring**:
- Significantly improved tailoring with substantial content transformation
- Work experience bullets rewritten with technical depth and quantified impact
- Projects automatically reordered by relevance to job description
- Skills reorganized to prioritize job-matching skills first
- Professional summary completely rewritten to address job requirements

**PDF Preview**:
- LibreOffice integration for DOCX to PDF conversion
- Inline browser preview (no auto-downloads)
- Zoom controls (60% - 200%)
- Clean viewer without toolbars

**Workflow Improvements**:
- Streamlined upload flow: upload → dashboard → create project → tailor
- Fixed data loading and display issues
- Real-time PDF updates after tailoring
- Better error handling and user feedback

**Code Quality**:
- Removed 6 unused services
- Eliminated LaTeX dependencies
- Simplified to DOCX + JSON workflow
- Comprehensive documentation in BACKEND.md and FRONTEND.md

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [BACKEND.md](./BACKEND.md#version-control) and [FRONTEND.md](./FRONTEND.md#version-control) for detailed contribution guidelines.

## License

This project is proprietary software. All rights reserved.

## Support

For issues and questions:
- Check [BACKEND.md](./BACKEND.md) for backend issues
- Check [FRONTEND.md](./FRONTEND.md) for frontend issues
- Open an issue on [GitHub](https://github.com/gAIytri/SkillMap/issues)

## Roadmap

- [ ] Multiple file format support (PDF upload)
- [ ] Collaborative editing
- [ ] Template library
- [ ] Analytics dashboard
- [ ] Mobile app
- [ ] Browser extension

## Credits

Built with:
- OpenAI GPT-4 for AI capabilities
- FastAPI for robust backend
- React for reactive UI
- Material-UI for beautiful components
