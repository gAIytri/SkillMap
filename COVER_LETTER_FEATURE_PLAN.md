# Cover Letter + Email Feature - Implementation Plan

## 🎯 Feature Overview

**Goal:** Generate professional cover letter and recruiter email alongside tailored resume

**User Flow:**
1. User enters project (sees Resume tab with base resume)
2. Cover Letter and Email tabs show "Tailor to create"
3. User clicks "Tailor Resume"
4. System generates: Resume + Cover Letter + Email (all at once)
5. User can switch between tabs to view each document

---

## 📊 Database Schema Changes

### 1. Add Columns to `projects` Table

```sql
-- Run this migration
ALTER TABLE projects
ADD COLUMN cover_letter_text TEXT DEFAULT NULL,
ADD COLUMN email_body_text TEXT DEFAULT NULL,
ADD COLUMN cover_letter_generated_at TIMESTAMP DEFAULT NULL,
ADD COLUMN email_generated_at TIMESTAMP DEFAULT NULL;

-- Optional: Add indices for faster queries
CREATE INDEX idx_projects_cover_letter ON projects(cover_letter_generated_at) WHERE cover_letter_text IS NOT NULL;
CREATE INDEX idx_projects_email ON projects(email_generated_at) WHERE email_body_text IS NOT NULL;
```

### 2. Update Alembic Migration

```python
# backend/alembic/versions/xxx_add_cover_letter_email.py

def upgrade():
    op.add_column('projects',
        sa.Column('cover_letter_text', sa.Text(), nullable=True)
    )
    op.add_column('projects',
        sa.Column('email_body_text', sa.Text(), nullable=True)
    )
    op.add_column('projects',
        sa.Column('cover_letter_generated_at', sa.DateTime(), nullable=True)
    )
    op.add_column('projects',
        sa.Column('email_generated_at', sa.DateTime(), nullable=True)
    )

def downgrade():
    op.drop_column('projects', 'email_generated_at')
    op.drop_column('projects', 'cover_letter_generated_at')
    op.drop_column('projects', 'email_body_text')
    op.drop_column('projects', 'cover_letter_text')
```

---

## 🔧 Backend Implementation

### 1. Create LLM Tool: `generate_cover_letter`

**File:** `backend/services/agent_tools.py`

```python
@tool
def generate_cover_letter(
    resume_json: str,
    job_description: str,
    company_name: str = None,
    hiring_manager: str = None
) -> dict:
    """
    Generate a professional cover letter based on resume and job description.

    Args:
        resume_json: JSON string of resume data
        job_description: Job posting description
        company_name: Company name (optional, extracted from JD if not provided)
        hiring_manager: Hiring manager name (optional)

    Returns:
        dict: {
            'cover_letter': str,  # Full cover letter text
            'key_points': list,   # Main selling points highlighted
            'company_name': str,  # Extracted/provided company name
        }
    """
    resume_data = json.loads(resume_json)

    # Extract key info
    candidate_name = resume_data['personal_info']['name']
    skills = [item for cat in resume_data.get('skills', []) for item in cat.get('skills', [])]
    recent_exp = resume_data.get('experience', [{}])[0]

    # Build prompt for LLM
    prompt = f"""
    Generate a professional cover letter for a job application.

    CANDIDATE INFORMATION:
    Name: {candidate_name}
    Key Skills: {', '.join(skills[:10])}
    Recent Position: {recent_exp.get('title', '')} at {recent_exp.get('company', '')}

    JOB DESCRIPTION:
    {job_description}

    REQUIREMENTS:
    1. Professional tone, enthusiastic but not overeager
    2. Highlight 3-4 key qualifications that match the job
    3. Show genuine interest in the company/role
    4. Keep it under 400 words
    5. Use standard business letter format
    6. Address to "Hiring Manager" if no name provided
    7. Include: Opening, Body (2-3 paragraphs), Closing

    FORMAT:
    [Your Name]
    [Date]

    Dear [Hiring Manager/Name],

    [Opening paragraph - express interest and mention role]

    [Body paragraphs - highlight qualifications and achievements]

    [Closing paragraph - call to action]

    Sincerely,
    [Your Name]

    Generate the cover letter now:
    """

    # Call LLM
    response = llm.invoke(prompt)
    cover_letter_text = response.content.strip()

    # Extract company name if not provided
    if not company_name:
        extract_prompt = f"Extract the company name from this job description. Return ONLY the company name, nothing else:\n\n{job_description[:500]}"
        company_response = llm.invoke(extract_prompt)
        company_name = company_response.content.strip()

    # Extract key points mentioned
    key_points = [
        "Relevant experience highlighted",
        "Skills alignment demonstrated",
        "Enthusiasm for role expressed"
    ]

    return {
        'cover_letter': cover_letter_text,
        'key_points': key_points,
        'company_name': company_name,
        'generated_at': datetime.now().isoformat()
    }
```

---

### 2. Create LLM Tool: `generate_recruiter_email`

**File:** `backend/services/agent_tools.py`

```python
@tool
def generate_recruiter_email(
    resume_json: str,
    job_description: str,
    company_name: str = None,
    job_title: str = None
) -> dict:
    """
    Generate a professional email to recruiter for job application.

    Args:
        resume_json: JSON string of resume data
        job_description: Job posting description
        company_name: Company name (optional)
        job_title: Job title (optional)

    Returns:
        dict: {
            'subject': str,      # Email subject line
            'body': str,         # Email body text
            'tone': str          # Email tone (professional/friendly)
        }
    """
    resume_data = json.loads(resume_json)
    candidate_name = resume_data['personal_info']['name']

    # Extract job title if not provided
    if not job_title:
        extract_prompt = f"Extract the job title from this job description. Return ONLY the job title:\n\n{job_description[:300]}"
        title_response = llm.invoke(extract_prompt)
        job_title = title_response.content.strip()

    # Build prompt
    prompt = f"""
    Generate a professional email to send to a recruiter after applying for a job.

    CONTEXT:
    - Candidate: {candidate_name}
    - Job Title: {job_title}
    - Company: {company_name or '[Company Name]'}

    REQUIREMENTS:
    1. Short and concise (under 150 words)
    2. Professional but personable tone
    3. Mention that you've applied
    4. Express enthusiasm
    5. Highlight 1-2 key qualifications briefly
    6. Request consideration
    7. Include clear call to action

    FORMAT:
    Subject: [Create compelling subject line]

    Body:
    Dear Hiring Manager,

    [Opening - mention application]
    [Brief highlight of qualifications]
    [Express enthusiasm]
    [Call to action]

    Best regards,
    [Name]

    Generate the email now:
    """

    response = llm.invoke(prompt)
    email_text = response.content.strip()

    # Split subject and body
    parts = email_text.split('\n\n', 1)
    if len(parts) == 2 and parts[0].startswith('Subject:'):
        subject = parts[0].replace('Subject:', '').strip()
        body = parts[1].strip()
    else:
        subject = f"Application for {job_title} Position"
        body = email_text

    return {
        'subject': subject,
        'body': body,
        'tone': 'professional',
        'generated_at': datetime.now().isoformat()
    }
```

---

### 3. Update Tailoring Service

**File:** `backend/services/resume_tailoring_service.py`

Add cover letter and email generation to the agent workflow:

```python
# In agent graph, add new steps:

# After resume tailoring
cover_letter_result = await agent.run_tool('generate_cover_letter', {
    'resume_json': json.dumps(tailored_resume_json),
    'job_description': job_description
})

email_result = await agent.run_tool('generate_recruiter_email', {
    'resume_json': json.dumps(tailored_resume_json),
    'job_description': job_description
})

# Return all three
return {
    'resume_json': tailored_resume_json,
    'cover_letter': cover_letter_result['cover_letter'],
    'email_subject': email_result['subject'],
    'email_body': email_result['body']
}
```

---

### 4. Update API Endpoint

**File:** `backend/routers/projects.py`

```python
@router.post("/{project_id}/tailor")
async def tailor_project_resume(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Tailor resume, generate cover letter and email for project"""

    # ... existing code ...

    # Call tailoring service (now returns all 3 documents)
    result = await tailor_resume_with_agent(
        resume_json=project.resume_json,
        job_description=project.job_description
    )

    # Update project with all generated content
    project.resume_json = result['resume_json']
    project.cover_letter_text = result['cover_letter']
    project.email_body_text = result['email_body']
    project.cover_letter_generated_at = datetime.now()
    project.email_generated_at = datetime.now()

    db.commit()

    return {
        'success': True,
        'resume_updated': True,
        'cover_letter_generated': True,
        'email_generated': True,
        'changes_made': result.get('changes_made', [])
    }
```

---

### 5. Add Download Endpoints

```python
@router.get("/{project_id}/cover-letter")
async def get_cover_letter(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cover letter text for project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.cover_letter_text:
        raise HTTPException(status_code=404, detail="Cover letter not generated yet")

    return {
        'cover_letter': project.cover_letter_text,
        'generated_at': project.cover_letter_generated_at
    }


@router.get("/{project_id}/email")
async def get_email_body(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get email body for project"""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.email_body_text:
        raise HTTPException(status_code=404, detail="Email not generated yet")

    return {
        'email_body': project.email_body_text,
        'generated_at': project.email_generated_at
    }
```

---

## 🎨 Frontend Implementation

### 1. Create Tab Component

**File:** `frontend/src/pages/ProjectEditor.jsx`

```jsx
const [activeTab, setActiveTab] = useState(0); // 0=Resume, 1=Cover Letter, 2=Email
const [coverLetter, setCoverLetter] = useState(null);
const [emailBody, setEmailBody] = useState(null);

// Tab component
<Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
  <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
    <Tab label="Resume" icon={<DescriptionIcon />} />
    <Tab label="Cover Letter" icon={<EmailIcon />} />
    <Tab label="Email" icon={<SendIcon />} />
  </Tabs>
</Box>

// Tab panels
{activeTab === 0 && (
  <Box>
    {/* Existing PDF viewer */}
  </Box>
)}

{activeTab === 1 && (
  <Box>
    {coverLetter ? (
      <Paper sx={{ p: 3, whiteSpace: 'pre-wrap' }}>
        {coverLetter}
      </Paper>
    ) : (
      <Box textAlign="center" py={10}>
        <Typography variant="h6" color="text.secondary">
          Click "Tailor Resume" to generate cover letter
        </Typography>
      </Box>
    )}
  </Box>
)}

{activeTab === 2 && (
  <Box>
    {emailBody ? (
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Subject:
        </Typography>
        <Typography variant="body1" fontWeight={600} mb={2}>
          {emailBody.subject}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" color="text.secondary" mb={1}>
          Body:
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {emailBody.body}
        </Typography>
      </Paper>
    ) : (
      <Box textAlign="center" py={10}>
        <Typography variant="h6" color="text.secondary">
          Click "Tailor Resume" to generate email
        </Typography>
      </Box>
    )}
  </Box>
)}
```

---

### 2. Update Tailor Function

```jsx
const handleTailorResume = async () => {
  setTailoring(true);
  setAgentMessages([]);

  try {
    // Call tailor API
    const result = await projectService.tailorResume(projectId);

    // Fetch all three documents
    const [resumeResult, coverLetterResult, emailResult] = await Promise.all([
      loadPdfPreview(),
      projectService.getCoverLetter(projectId),
      projectService.getEmail(projectId)
    ]);

    // Update state
    setCoverLetter(coverLetterResult.cover_letter);
    setEmailBody({
      subject: emailResult.email_subject,
      body: emailResult.email_body
    });

    toast.success('Resume tailored! Cover letter and email generated!');
  } catch (err) {
    toast.error('Failed to tailor resume');
  } finally {
    setTailoring(false);
  }
};
```

---

### 3. Add Download Buttons

```jsx
// Cover Letter tab
<Button
  startIcon={<DownloadIcon />}
  onClick={() => downloadCoverLetter(projectId)}
>
  Download Cover Letter
</Button>

// Email tab
<Button
  startIcon={<ContentCopyIcon />}
  onClick={() => copyEmailToClipboard(emailBody)}
>
  Copy Email
</Button>
```

---

## 📝 Implementation Checklist

### Backend:
- [ ] Create database migration (add 4 columns)
- [ ] Add `generate_cover_letter` LLM tool
- [ ] Add `generate_recruiter_email` LLM tool
- [ ] Update tailoring service to call both tools
- [ ] Add `/cover-letter` API endpoint
- [ ] Add `/email` API endpoint
- [ ] Update `/tailor` endpoint to save all 3 documents
- [ ] Test LLM generation locally

### Frontend:
- [ ] Create tab component (Resume | Cover Letter | Email)
- [ ] Add state management for tabs
- [ ] Implement cover letter display
- [ ] Implement email display
- [ ] Update tailor button to fetch all documents
- [ ] Add download/copy buttons
- [ ] Show "Tailor to create" placeholders
- [ ] Update loading spinner messages
- [ ] Test tab switching

### Testing:
- [ ] Test full flow: Upload → Create Project → Tailor → View all 3 tabs
- [ ] Test cover letter quality
- [ ] Test email quality
- [ ] Test error handling
- [ ] Test loading states

---

## 🎯 Timeline

- **Day 1 (4-5 hours):** Database + Backend LLM tools
- **Day 2 (4-5 hours):** API endpoints + Integration
- **Day 3 (4-5 hours):** Frontend tabs + Display
- **Day 4 (2-3 hours):** Testing + Polish

**Total:** ~16-20 hours of development

---

## 🚀 Ready to Start?

This is the complete implementation plan. We'll:
1. Start with database migration
2. Build backend tools
3. Create frontend tabs
4. Test everything
5. Then migrate to Neon

**Shall we begin with Step 1 (Database migration)?** 🚀
