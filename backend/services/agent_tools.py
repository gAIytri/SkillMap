"""
Resume Tailoring Agent Tools
Tools for LangChain agent to handle resume tailoring workflow
"""

from typing import Dict, Any, Literal, Optional
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langsmith import traceable
from config.settings import settings
import logging
import json

logger = logging.getLogger(__name__)

# Global context storage for runtime data
_runtime_context = {}

# Shared LLM instances for tools (will be traced by LangSmith)
_llm_mini = ChatOpenAI(
    model="gpt-4o-mini",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.0
)

_llm_gpt4o = ChatOpenAI(
    model="gpt-4o",
    api_key=settings.OPENAI_API_KEY,
    temperature=0.2
)


@tool
@traceable(name="validate_intent")
def validate_intent(user_message: str) -> dict:
    """
    Guardrail tool that validates user intent for resume tailoring.

    This tool checks if the user's message is:
    - A job description to tailor the resume against
    - A request to modify specific parts of the resume
    - Or something unrelated (reject)

    Args:
        user_message: The message from the user to validate

    Returns:
        dict: {
            "valid": bool,
            "intent_type": "job_description" | "resume_modification" | "invalid",
            "message": str,
            "details": str (optional)
        }
    """
    try:
        logger.info("Validating user intent...")

        # Use LangChain ChatOpenAI for LangSmith tracing
        messages = [
            SystemMessage(content="""You are a guardrail that validates user intent for a resume tailoring system.

Classify the user's message into one of these categories:
1. "job_description" - User has provided a job posting/description to tailor resume against
2. "resume_modification" - User wants to modify specific parts of their resume
3. "invalid" - Message is unrelated to resume tailoring (chitchat, questions, etc.)

Return your response as JSON with:
{
    "intent_type": "job_description" | "resume_modification" | "invalid",
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation"
}"""),
            HumanMessage(content=f"Classify this message: {user_message}")
        ]

        # Create a structured output LLM
        structured_llm = _llm_mini.bind(response_format={"type": "json_object"})

        # Invoke and get response
        response = structured_llm.invoke(messages)

        # Parse the JSON response
        result = json.loads(response.content)
        intent_type = result.get("intent_type", "invalid")
        confidence = result.get("confidence", 0.0)
        reasoning = result.get("reasoning", "")

        # Extract token usage from response metadata
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"validate_intent token usage: {token_usage}")

        if intent_type == "invalid":
            return {
                "valid": False,
                "intent_type": "invalid",
                "message": "Please provide a job description to tailor your resume, or specify changes you want to make to your resume.",
                "details": reasoning,
                "token_usage": token_usage
            }

        # Valid intent
        return {
            "valid": True,
            "intent_type": intent_type,
            "message": f"Intent validated: {intent_type}",
            "details": reasoning,
            "confidence": confidence,
            "token_usage": token_usage
        }

    except Exception as e:
        logger.error(f"Intent validation failed: {e}")
        return {
            "valid": False,
            "intent_type": "error",
            "message": f"Failed to validate intent: {str(e)}"
        }


@tool
@traceable(name="summarize_job_description")
def summarize_job_description(job_description: str) -> dict:
    """
    Analyzes and summarizes a job description to extract key requirements.

    Extracts:
    - Required technical skills
    - Preferred technical skills
    - Required experience (years, domain)
    - Key responsibilities
    - Nice-to-have qualifications
    - Keywords for ATS optimization

    Args:
        job_description: The full job posting/description text

    Returns:
        dict: {
            "success": bool,
            "summary": {
                "required_skills": list[str],
                "preferred_skills": list[str],
                "experience_required": str,
                "key_responsibilities": list[str],
                "nice_to_have": list[str],
                "ats_keywords": list[str],
                "role_focus": str
            },
            "message": str
        }
    """
    try:
        logger.info("Summarizing job description...")

        # Use LangChain ChatOpenAI for LangSmith tracing
        messages = [
            SystemMessage(content="""You are an expert job description analyzer for technical roles.

Analyze the job description and extract:
1. Required technical skills (programming languages, frameworks, tools)
2. Preferred/nice-to-have technical skills
3. Experience requirements (years, specific domains)
4. Key responsibilities of the role
5. Nice-to-have qualifications
6. ATS keywords (important terms that should appear in resume)
7. Overall role focus (e.g., "Backend Development", "Full Stack", "Data Engineering")

Return as JSON:
{
    "required_skills": ["skill1", "skill2", ...],
    "preferred_skills": ["skill1", "skill2", ...],
    "experience_required": "description of experience needed",
    "key_responsibilities": ["resp1", "resp2", ...],
    "nice_to_have": ["qual1", "qual2", ...],
    "ats_keywords": ["keyword1", "keyword2", ...],
    "role_focus": "primary focus of the role"
}"""),
            HumanMessage(content=f"Analyze this job description:\n\n{job_description}")
        ]

        # Create a structured output LLM
        structured_llm = _llm_gpt4o.bind(response_format={"type": "json_object"})

        # Invoke and get response
        response = structured_llm.invoke(messages)

        # Parse the JSON response
        summary = json.loads(response.content)

        # Extract token usage from response metadata
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"summarize_job_description token usage: {token_usage}")

        logger.info("Job description summarized successfully")

        return {
            "success": True,
            "summary": summary,
            "message": f"Job description analyzed. Role focus: {summary.get('role_focus', 'N/A')}",
            "token_usage": token_usage
        }

    except Exception as e:
        logger.error(f"Job summarization failed: {e}")
        return {
            "success": False,
            "summary": {},
            "message": f"Failed to summarize job description: {str(e)}"
        }


def set_runtime_context(resume_json: dict, job_description: str):
    """Set the runtime context for tools to access"""
    global _runtime_context
    _runtime_context = {
        "resume_json": resume_json,
        "job_description": job_description
    }


def get_runtime_context() -> dict:
    """Get the current runtime context"""
    return _runtime_context


@tool
@traceable(name="tailor_resume_content")
def tailor_resume_content(job_summary: dict) -> dict:
    """
    Tailors the resume JSON based on the summarized job requirements.

    This tool:
    - Gets the resume JSON from runtime context
    - Applies the tailoring logic using job summary
    - Returns the updated resume JSON

    Args:
        job_summary: The summary from summarize_job_description tool

    Returns:
        dict: {
            "success": bool,
            "tailored_json": dict (the updated resume JSON),
            "message": str,
            "changes_made": list[str] (description of changes)
        }
    """
    try:
        logger.info("Tailoring resume content...")

        # Get runtime context (contains resume_json and job_description)
        context = get_runtime_context()

        resume_json = context.get("resume_json")
        job_description = context.get("job_description")

        if not resume_json:
            return {
                "success": False,
                "tailored_json": {},
                "message": "Resume JSON not found in context",
                "changes_made": []
            }

        # Extract summary data
        summary_data = job_summary.get("summary", {}) if isinstance(job_summary, dict) else job_summary

        # Create tailoring prompt with job summary
        system_prompt = """You are an expert technical resume tailoring assistant specializing in software engineering and tech roles.

CORE PRINCIPLES:
1. Work ONLY with existing information - NEVER fabricate projects, skills, or experience
2. Make SUBSTANTIAL improvements - don't just tweak, transform the content
3. Use highly technical language appropriate for the role
4. Maintain the EXACT same JSON structure for recreation
5. Every change must be impactful and relevant to the job requirements

YOUR TASK:
Use the provided JOB SUMMARY to tailor the resume effectively."""

        # Build detailed user prompt
        user_prompt = f"""JOB SUMMARY:
{json.dumps(summary_data, indent=2)}

FULL JOB DESCRIPTION:
{job_description}

CURRENT RESUME (JSON):
{json.dumps(resume_json, indent=2)}

TAILORING INSTRUCTIONS:

1. PROFESSIONAL SUMMARY (paragraph format):
   - Rewrite to directly address the role focus and required skills from job summary
   - Highlight most relevant skills and experience from the resume
   - Use strong, confident language
   - Keep as a single paragraph (3-4 sentences)
   - Incorporate ATS keywords naturally

2. WORK EXPERIENCE BULLET POINTS (CRITICAL - MAJOR CHANGES):
   - Transform EVERY bullet point to be more technical and impactful
   - Prioritize bullets that align with required_skills and key_responsibilities
   - Use strong action verbs (Architected, Engineered, Optimized, Implemented, Led, Designed,etc- not limited to this) 
   - Add technical depth: mention frameworks, tools from required_skills
   - Quantify impact: performance improvements, user numbers, efficiency gains
   - Format: [Action Verb] + [What] + [How/Technology] + [Impact/Result]

3. PROJECTS (REORGANIZE + ENHANCE):
   - REORDER projects: Most relevant to required_skills and role_focus should come FIRST
   - Enhance descriptions with technologies from required_skills and preferred_skills
   - Highlight aspects that match key_responsibilities
   - Add ATS keywords naturally in project descriptions

4. SKILLS (REORGANIZE BY RELEVANCE):
   - REORDER each skill category to put required_skills FIRST
   - Then preferred_skills
   - Then other skills
   - Keep all existing skills (don't remove or add)

5. EDUCATION & CERTIFICATIONS:
   - Keep as-is unless relevant to job requirements

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching the exact structure provided
- Every section must be present with same field names
- Professional summary must be a single paragraph string
- All arrays must maintain same structure
- Ensure all quotes are properly escaped in JSON

Make the changes SUBSTANTIAL and IMPACTFUL."""

        # Use LangChain ChatOpenAI for LangSmith tracing
        logger.info("Calling LLM for tailoring...")

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Create tailoring LLM with higher temperature and max_tokens
        tailoring_llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.4,
            max_tokens=4096
        )

        # Bind JSON response format
        structured_llm = tailoring_llm.bind(response_format={"type": "json_object"})

        # Invoke and get response
        response = structured_llm.invoke(messages)

        # Extract token usage from response metadata
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"tailor_resume_content token usage: {token_usage}")

        # Parse tailored JSON
        tailored_json = json.loads(response.content)

        # Identify changes made (simplified)
        changes_made = [
            "Professional summary rewritten to match role focus",
            "Work experience bullets enhanced with relevant technologies",
            "Projects reordered by relevance to job requirements",
            "Skills reorganized to prioritize job-required skills",
            "ATS keywords incorporated throughout resume"
        ]

        logger.info("Resume tailored successfully")

        return {
            "success": True,
            "tailored_json": tailored_json,
            "message": "Resume successfully tailored to job requirements",
            "changes_made": changes_made,
            "token_usage": token_usage
        }

    except Exception as e:
        logger.error(f"Resume tailoring failed: {e}")
        return {
            "success": False,
            "tailored_json": resume_json if 'resume_json' in locals() else {},
            "message": f"Failed to tailor resume: {str(e)}",
            "changes_made": []
        }


@tool
@traceable(name="generate_cover_letter")
def generate_cover_letter(
    resume_json: str,
    job_summary: dict,
    job_description: str,
    company_name: Optional[str] = None,
    hiring_manager: Optional[str] = None
) -> dict:
    """
    Generate a professional cover letter based on resume and job summary.

    This tool:
    - Uses the job summary (from summarize_job_description) for efficiency
    - Extracts key qualifications that match the job
    - Creates a compelling cover letter highlighting relevant experience
    - Uses professional tone and standard business format

    Args:
        resume_json: JSON string of the resume data
        job_summary: Job summary dict from summarize_job_description tool
        job_description: Full job posting (for context only)
        company_name: Company name (optional, extracted from JD if not provided)
        hiring_manager: Hiring manager name (optional, uses "Hiring Manager" if not provided)

    Returns:
        dict: {
            "success": bool,
            "cover_letter": str (full cover letter text),
            "key_points": list[str] (main selling points highlighted),
            "company_name": str (extracted/provided company name),
            "message": str
        }
    """
    try:
        logger.info("Generating cover letter...")

        # Parse resume JSON
        resume_data = json.loads(resume_json) if isinstance(resume_json, str) else resume_json

        # Extract key info from resume
        personal_info = resume_data.get('personal_info', {})
        candidate_name = personal_info.get('name', 'Candidate Name')

        # Get skills from all categories
        skills = []
        for skill_cat in resume_data.get('skills', []):
            skills.extend(skill_cat.get('skills', []))

        # Get recent experience
        experience = resume_data.get('experience', [])
        recent_exp = experience[0] if experience else {}

        # Extract job summary data
        summary_data = job_summary.get("summary", {}) if isinstance(job_summary, dict) else {}
        role_focus = summary_data.get("role_focus", "the position")
        required_skills = summary_data.get("required_skills", [])
        key_responsibilities = summary_data.get("key_responsibilities", [])

        # Extract company name if not provided
        if not company_name:
            logger.info("Extracting company name from job description...")
            extract_messages = [
                SystemMessage(content="Extract the company name from the job description. Return ONLY the company name as plain text, nothing else."),
                HumanMessage(content=f"Job Description:\n\n{job_description[:800]}")
            ]
            company_response = _llm_mini.invoke(extract_messages)
            company_name = company_response.content.strip()

        # Build cover letter generation prompt
        system_prompt = """You are an expert career coach specializing in technical roles.
Generate a professional, compelling cover letter for a job application.

REQUIREMENTS:
1. Professional tone - enthusiastic but not overeager
2. Highlight 3-4 key qualifications that match the job
3. Show genuine interest in the company/role
4. Keep under 400 words
5. Use standard business letter format
6. Demonstrate knowledge of role requirements
7. Create a clear narrative connecting candidate's experience to the role

STRUCTURE:
- Opening paragraph: Express interest, mention specific role
- Body (2-3 paragraphs): Highlight relevant qualifications and achievements
- Closing paragraph: Call to action, express enthusiasm for next steps

TONE: Professional, confident, specific, and genuine."""

        user_prompt = f"""Generate a cover letter for this application:

CANDIDATE INFORMATION:
Name: {candidate_name}
Top Skills: {', '.join(skills[:12])}
Recent Position: {recent_exp.get('title', 'N/A')} at {recent_exp.get('company', 'N/A')}

JOB REQUIREMENTS (from analysis):
Role: {role_focus}
Required Skills: {', '.join(required_skills[:10])}
Key Responsibilities: {', '.join(key_responsibilities[:5])}

COMPANY NAME: {company_name}
HIRING MANAGER: {hiring_manager or 'Hiring Manager'}

CONTEXT (brief job description excerpt for tone):
{job_description[:500]}...

FORMAT:
{candidate_name}
[Date]

Dear {hiring_manager or 'Hiring Manager'},

[Opening paragraph - express interest in {role_focus}]

[Body paragraphs - highlight how skills match required skills and experience aligns with responsibilities]

[Closing paragraph - call to action and next steps]

Sincerely,
{candidate_name}

Generate the cover letter now in this exact format:"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Invoke LLM for generation
        response = _llm_gpt4o.invoke(messages)
        cover_letter_text = response.content.strip()

        # Extract token usage
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"generate_cover_letter token usage: {token_usage}")

        # Identify key points (simplified)
        key_points = [
            "Relevant technical experience highlighted",
            "Skills alignment with job requirements demonstrated",
            "Enthusiasm for role and company expressed",
            "Clear call to action for next steps"
        ]

        logger.info("Cover letter generated successfully")

        return {
            "success": True,
            "cover_letter": cover_letter_text,
            "key_points": key_points,
            "company_name": company_name,
            "message": f"Cover letter generated successfully for {company_name}",
            "token_usage": token_usage
        }

    except Exception as e:
        logger.error(f"Cover letter generation failed: {e}")
        return {
            "success": False,
            "cover_letter": "",
            "key_points": [],
            "company_name": company_name or "Unknown Company",
            "message": f"Failed to generate cover letter: {str(e)}"
        }


@tool
@traceable(name="generate_recruiter_email")
def generate_recruiter_email(
    resume_json: str,
    job_summary: dict,
    job_description: str,
    company_name: Optional[str] = None,
    job_title: Optional[str] = None
) -> dict:
    """
    Generate a professional email to send to recruiter for job application.

    This tool:
    - Uses the job summary (from summarize_job_description) for efficiency
    - Creates a concise, professional email
    - Mentions the application and key qualifications
    - Expresses enthusiasm for the role
    - Includes clear call to action

    Args:
        resume_json: JSON string of the resume data
        job_summary: Job summary dict from summarize_job_description tool
        job_description: Full job posting (for context only)
        company_name: Company name (optional, extracted from JD if not provided)
        job_title: Job title (optional, uses role_focus from summary if not provided)

    Returns:
        dict: {
            "success": bool,
            "subject": str (email subject line),
            "body": str (email body text),
            "tone": str (professional/friendly),
            "message": str
        }
    """
    try:
        logger.info("Generating recruiter email...")

        # Parse resume JSON
        resume_data = json.loads(resume_json) if isinstance(resume_json, str) else resume_json

        # Extract candidate name
        personal_info = resume_data.get('personal_info', {})
        candidate_name = personal_info.get('name', 'Candidate Name')

        # Extract job summary data
        summary_data = job_summary.get("summary", {}) if isinstance(job_summary, dict) else {}
        role_focus = summary_data.get("role_focus", "Software Engineer")
        required_skills = summary_data.get("required_skills", [])

        # Use role_focus as job title if not provided
        if not job_title:
            job_title = role_focus
            logger.info(f"Using role_focus as job title: {job_title}")

        # Extract company name if not provided
        if not company_name:
            logger.info("Extracting company name from job description...")
            extract_messages = [
                SystemMessage(content="Extract the company name from the job description. Return ONLY the company name as plain text, nothing else."),
                HumanMessage(content=f"Job Description:\n\n{job_description[:800]}")
            ]
            company_response = _llm_mini.invoke(extract_messages)
            company_name = company_response.content.strip()

        # Build email generation prompt
        system_prompt = """You are an expert at crafting professional job application emails.
Generate a concise, impactful email to send to a recruiter after applying for a position.

REQUIREMENTS:
1. Short and concise (under 150 words)
2. Professional but personable tone
3. Mention that application has been submitted
4. Express enthusiasm for the role
5. Highlight 1-2 key qualifications very briefly
6. Request consideration and next steps
7. Include clear call to action

STRUCTURE:
Subject: [Create compelling subject line]

Body:
Dear Hiring Manager,

[Opening - mention application submission]
[Brief highlight of 1-2 key qualifications]
[Express enthusiasm for role/company]
[Call to action - request next steps]

Best regards,
[Name]

TONE: Professional, confident, concise, and genuine."""

        user_prompt = f"""Generate a recruiter email for this application:

CANDIDATE: {candidate_name}
JOB TITLE: {job_title}
COMPANY: {company_name}

KEY JOB REQUIREMENTS (from analysis):
Required Skills: {', '.join(required_skills[:8])}

Generate the email with subject line and body now:"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Invoke LLM for generation
        response = _llm_gpt4o.invoke(messages)
        email_text = response.content.strip()

        # Extract token usage
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"generate_recruiter_email token usage: {token_usage}")

        # Parse subject and body
        subject = f"Application for {job_title} Position"
        body = email_text

        # Try to extract subject if present
        if "Subject:" in email_text or "SUBJECT:" in email_text:
            parts = email_text.split('\n\n', 1)
            if len(parts) == 2:
                subject_line = parts[0].strip()
                # Remove "Subject:" prefix
                subject = subject_line.replace('Subject:', '').replace('SUBJECT:', '').strip()
                body = parts[1].strip()

        logger.info("Recruiter email generated successfully")

        return {
            "success": True,
            "subject": subject,
            "body": body,
            "tone": "professional",
            "message": f"Email generated successfully for {job_title} at {company_name}",
            "token_usage": token_usage
        }

    except Exception as e:
        logger.error(f"Recruiter email generation failed: {e}")
        return {
            "success": False,
            "subject": f"Application for {job_title or 'Position'}",
            "body": "",
            "tone": "professional",
            "message": f"Failed to generate email: {str(e)}"
        }
