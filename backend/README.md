# SkillMap Backend

FastAPI-based backend for AI-powered resume tailoring with Stripe credit system.

## Tech Stack

- **Framework**: FastAPI
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: SQLAlchemy
- **AI**: OpenAI GPT-4 (Structured Outputs)
- **Agent**: LangChain + LangGraph (ReAct agent)
- **Payments**: Stripe (Checkout + Webhooks)
- **Monitoring**: LangSmith
- **Document Processing**: python-docx, PyMuPDF
- **PDF Conversion**: LibreOffice

## Setup

### Prerequisites

- Python 3.10+
- OpenAI API Key
- Stripe Account (test mode)
- Stripe CLI (for local development)
- LibreOffice (for PDF conversion)

### Installation

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

### Environment Variables

Create `.env` file with the following variables:

```bash
# Database
DATABASE_URL=sqlite:///./skillmap.db

# Security
SECRET_KEY=your-secret-key-min-32-chars
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440

# Google OAuth (Optional)
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

### Run Development Server

```bash
# Activate virtual environment
source venv/bin/activate

# Start server with auto-reload
uvicorn main:app --reload --port 8000
```

Server will be available at:
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Stripe Webhook Setup (Local Development)

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to Stripe account
stripe login

# Forward webhooks to local backend (keep this running)
stripe listen --forward-to http://localhost:8000/api/credits/webhook

# Copy the webhook signing secret (whsec_...) to .env
# Restart backend to load new secret
```

**IMPORTANT**: The Stripe CLI must stay running in a separate terminal for webhooks to work during development.

## Project Structure

```
backend/
├── config/
│   ├── database.py          # Database connection & session
│   └── settings.py          # Environment settings
├── models/
│   ├── user.py             # User model
│   ├── base_resume.py      # Base resume model
│   ├── project.py          # Project model
│   └── credit_transaction.py  # Credit transaction model
├── routers/
│   ├── auth.py             # Authentication endpoints
│   ├── resumes.py          # Resume upload & extraction
│   ├── projects.py         # Project CRUD & tailoring
│   ├── users.py            # User profile endpoints
│   └── credits.py          # Credit system & Stripe
├── services/
│   ├── resume_extractor.py      # AI resume extraction
│   ├── resume_agent_service.py  # LangChain agent
│   ├── docx_generation_service.py  # DOCX creation
│   ├── pdf_service.py           # PDF conversion
│   └── agent_tools.py           # Agent tools (validate, summarize, tailor)
├── middleware/
│   └── auth_middleware.py  # JWT authentication
├── schemas/
│   └── resume_schemas.py   # Pydantic models
├── uploads/                # Uploaded files
├── main.py                 # FastAPI app entry point
└── requirements.txt        # Python dependencies
```

## API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Create new user account
- `POST /login` - Login with email/password
- `POST /google` - Login with Google OAuth
- `GET /me` - Get current user profile

### Resumes (`/api/resumes`)

- `POST /upload` - Upload and extract resume
- `GET /base` - Get user's base resume

### Projects (`/api/projects`)

- `GET /` - List user's projects
- `POST /` - Create new project
- `GET /{id}` - Get project details
- `PUT /{id}` - Update project
- `DELETE /{id}` - Delete project
- `POST /{id}/tailor` - Tailor resume (old endpoint)
- `POST /{id}/tailor-with-agent` - Tailor with LangChain agent (SSE streaming)
- `GET /{id}/pdf` - Get PDF preview
- `GET /{id}/docx` - Download DOCX
- `GET /{id}/cover-letter` - Get cover letter
- `GET /{id}/email` - Get follow-up email

### Users (`/api/users`)

- `GET /me` - Get current user (with fresh credits)
- `PUT /me` - Update user profile
- `DELETE /me` - Delete account

### Credits (`/api/credits`)

- `GET /balance` - Get credit balance with warnings
- `GET /transactions` - Get transaction history (paginated)
- `GET /packages` - Get available credit packages
- `POST /create-checkout-session` - Create Stripe checkout
- `POST /webhook` - Stripe webhook handler (internal)

## Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| email | String(255) | Unique email |
| password_hash | String(255) | Bcrypt hashed password |
| full_name | String(255) | User's full name |
| profile_picture_url | String(500) | Profile picture URL |
| credits | Float | Credit balance (default 100.0) |
| created_at | DateTime | Account creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Base Resumes Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to users |
| file_name | String(255) | Original filename |
| file_path | String(500) | Storage path |
| extracted_data | JSON | Structured resume data |
| metadata | JSON | Additional metadata |
| created_at | DateTime | Upload timestamp |

### Projects Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to users |
| base_resume_id | Integer | Foreign key to base_resumes |
| project_name | String(255) | Project name |
| company_name | String(255) | Target company |
| position | String(255) | Target position |
| job_description | Text | Full job description |
| tailored_data | JSON | Tailored resume data |
| is_tailored | Boolean | Tailoring status |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Credit Transactions Table

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | Foreign key to users |
| project_id | Integer | Foreign key to projects (nullable) |
| amount | Float | Credit amount (+/-) |
| balance_after | Float | Balance after transaction |
| transaction_type | Enum | PURCHASE, TAILOR, GRANT, REFUND, BONUS |
| tokens_used | Integer | Total tokens (nullable) |
| prompt_tokens | Integer | Prompt tokens (nullable) |
| completion_tokens | Integer | Completion tokens (nullable) |
| description | String(500) | Transaction description |
| stripe_session_id | String(255) | Stripe session ID (unique, indexed) |
| created_at | DateTime | Transaction timestamp |

## Services

### Resume Extractor Service

Extracts structured data from uploaded resumes using OpenAI Structured Outputs.

**Features**:
- Parses personal info, experience, education, skills, projects
- Returns validated JSON matching strict Pydantic schema
- Handles errors gracefully

### Resume Agent Service (LangChain)

AI agent that tailors resumes using ReAct pattern with guardrails.

**Architecture**:
- **Guardrail Checkpoint**: Validates user intent before processing
- **Tools**: validate_input, summarize_jd, tailor_resume
- **Streaming**: Real-time progress via Server-Sent Events
- **Token Tracking**: Monitors OpenAI API usage for credits

**Agent Flow**:
1. User submits job description
2. Guardrail validates intent (no malicious requests)
3. Agent summarizes job description
4. Agent tailors resume content
5. Returns tailored JSON + token usage

### DOCX Generation Service

Creates Word documents from JSON data while preserving original formatting.

**Features**:
- Merges tailored JSON with original DOCX template
- Preserves fonts, colors, spacing, hyperlinks
- Smart bullet point detection and replacement
- Handles multiple bullet formats (•, -, ○, ▪, etc.)

### PDF Service

Converts DOCX to PDF using LibreOffice in headless mode.

**Requirements**:
- LibreOffice installed on system
- `soffice` binary in PATH

**Usage**:
```python
from services.pdf_service import convert_docx_to_pdf

pdf_path = convert_docx_to_pdf(docx_path)
```

### Credit Service

Manages credit transactions and Stripe integration.

**Features**:
- Deduct credits with token tracking
- Add credits from Stripe webhooks
- Transaction history with pagination
- Idempotency using Stripe session IDs

## Credit System Details

### Pricing

- **1 Credit = 2000 Tokens**
- Rounded to nearest 0.5 credits
- Example: 3500 tokens = 1.5 credits

### Credit Packages

| Credits | Price (USD) | Savings |
|---------|-------------|---------|
| 50 | $5.00 | Base rate |
| 100 | $9.00 | Save 10% |
| 250 | $20.00 | Save 20% |
| 500 | $35.00 | Save 30% |

### Transaction Types

- **PURCHASE**: Credits bought via Stripe
- **TAILOR**: Credits deducted for resume tailoring
- **GRANT**: Manual credit addition (admin)
- **REFUND**: Credits returned
- **BONUS**: Promotional credits

### Webhook Processing

Stripe sends `checkout.session.completed` events when payment succeeds.

**Idempotency**:
- Each webhook stores `stripe_session_id`
- Duplicate webhooks are detected and skipped
- Prevents double-crediting

**Error Handling**:
- Missing metadata logged and rejected
- User not found returns 404
- All errors rolled back with database transaction

## Stripe Integration

### Checkout Flow

1. Frontend calls `/api/credits/create-checkout-session`
2. Backend creates Stripe session with metadata:
   - `user_id`
   - `credits`
   - `email`
3. Frontend redirects to Stripe hosted checkout
4. User completes payment
5. Stripe redirects to success/cancel URL
6. Stripe sends webhook to backend
7. Backend adds credits to user account

### Webhook Security

- Signature verification using `STRIPE_WEBHOOK_SECRET`
- Protects against replay attacks
- Ensures webhooks are from Stripe

### Local Development

```bash
# Start webhook forwarding (keep running)
stripe listen --forward-to http://localhost:8000/api/credits/webhook

# Trigger test event
stripe trigger checkout.session.completed

# View events
stripe events list
```

### Production Deployment

1. Create webhook endpoint in Stripe Dashboard
2. Set endpoint URL: `https://yourdomain.com/api/credits/webhook`
3. Select event: `checkout.session.completed`
4. Copy webhook signing secret to production `.env`
5. Deploy backend with new secret

## Testing

### Manual Testing

```bash
# Test authentication
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","full_name":"Test User"}'

# Test credit balance
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/credits/balance

# Test checkout session creation
curl -X POST http://localhost:8000/api/credits/create-checkout-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credits":50}'
```

### Stripe Testing

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Any future expiry date, any CVC, any ZIP code.

## Common Issues

### Stripe Webhook Not Firing

**Problem**: Payment succeeds but credits don't add

**Solution**:
1. Check `stripe listen` is running
2. Verify webhook secret matches `.env`
3. Ensure Stripe CLI logged into correct account:
   ```bash
   stripe config --list
   ```
4. Re-login if account mismatch:
   ```bash
   stripe login
   ```

### LangSmith 403 Forbidden

**Problem**: `Failed to POST https://api.smith.langchain.com/runs/multipart`

**Solution**:
- Verify `LANGCHAIN_API_KEY` is correct (no spaces)
- Check API key hasn't expired
- Regenerate key from LangSmith dashboard if needed

### PDF Conversion Fails

**Problem**: LibreOffice not found

**Solution**:
```bash
# macOS
brew install --cask libreoffice

# Ubuntu/Debian
sudo apt-get install libreoffice

# Verify installation
which soffice
```

## Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with salting
- **SQL Injection**: Prevented by SQLAlchemy ORM
- **CORS Protection**: Configured allowed origins
- **Input Validation**: Pydantic schemas
- **Stripe Webhook Verification**: Signature checking
- **Environment Secrets**: Never committed to git

## Deployment

### Production Checklist

- [ ] Set strong `SECRET_KEY` (32+ random characters)
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set production Stripe keys (not test keys)
- [ ] Configure production webhook endpoint in Stripe Dashboard
- [ ] Disable debug mode
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring (Sentry, etc.)

### Production Server

```bash
# Using Gunicorn with Uvicorn workers
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 120
```

### Docker Deployment

```dockerfile
FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libreoffice

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Monitoring

### LangSmith

Monitor agent executions, token usage, and errors:
- https://smith.langchain.com

### Stripe Dashboard

Monitor payments, webhooks, and customer data:
- https://dashboard.stripe.com

## Contributing

1. Create feature branch from `main`
2. Make changes with clear commit messages
3. Test thoroughly (manual + automated)
4. Update documentation if needed
5. Create pull request

## License

Proprietary - All rights reserved
