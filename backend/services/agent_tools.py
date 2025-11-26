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
import re
from datetime import datetime

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


def sanitize_hyphens(text: str) -> str:
    """
    Remove hyphens from text to make it less obviously AI-generated.

    Replaces:
    - Single hyphens (-)
    - Em dashes (—)
    - En dashes (–)

    with a single space, while preserving newlines and formatting.

    Args:
        text: Input text that may contain hyphens

    Returns:
        Text with hyphens replaced by spaces, formatting preserved
    """
    if not text:
        return text

    # Replace all types of hyphens and dashes with a space
    text = text.replace('—', ' ')  # Em dash
    text = text.replace('–', ' ')  # En dash
    text = text.replace('-', ' ')  # Regular hyphen

    # Clean up multiple consecutive spaces (but NOT newlines or tabs)
    # Use [ ]+ to match only space characters, not \s which includes \n, \t, etc.
    text = re.sub(r'[ ]+', ' ', text)

    return text


def sanitize_json_hyphens(data: Any) -> Any:
    """
    Recursively remove hyphens from all string values in a JSON structure.

    Args:
        data: JSON data (dict, list, or primitive)

    Returns:
        Same structure with hyphens removed from all strings
    """
    if isinstance(data, dict):
        return {key: sanitize_json_hyphens(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [sanitize_json_hyphens(item) for item in data]
    elif isinstance(data, str):
        return sanitize_hyphens(data)
    else:
        return data


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
6. CRITICAL: DO NOT use hyphens (-), em dashes (—), or en dashes (–) in any text content. Use spaces or commas instead.

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

SMART TAILORING APPROACH:
- Analyze alignment between current resume and job requirements
- Make SUBSTANTIAL changes where there's misalignment
- Make REFINED improvements where content already aligns well
- Always elevate language quality to be clear, professional, and impactful
- Work ONLY with existing experience - never fabricate

1. PROFESSIONAL SUMMARY (paragraph format):
   - Rewrite to emphasize the role_focus from job summary
   - Lead with the most relevant experience for THIS specific role
   - Naturally weave in 2-4 keywords from required_skills
   - Use professional, confident language that matches the job's tone
   - Keep as single paragraph, 3-4 sentences, focused and compelling

2. WORK EXPERIENCE BULLET POINTS:
   - For each bullet point, assess its relevance to the job:
     * HIGH RELEVANCE (relates to required_skills or key_responsibilities):
       → Significantly enhance with specific technologies from required_skills
       → Add quantifiable metrics and impact where applicable
       → Make it technical and detailed

     * MEDIUM RELEVANCE (transferable but not direct match):
       → Refine the language to be more professional
       → Emphasize aspects that connect to job requirements
       → Add relevant technical details

     * LOW RELEVANCE (doesn't align):
       → Keep concise, improve language quality
       → Don't over-emphasize

   - Choose action verbs that best match the actual work and the job's requirements
   - Let the job description's language guide your verb choices naturally
   - Include specific technologies, frameworks, and tools from required_skills
   - Add metrics when meaningful (performance gains, scale, user impact)
   - Format: [Professional Action Verb] + [What] + [Technical Details/Tools] + [Impact/Result]

3. PROJECTS (CRITICAL - ENHANCE STRATEGICALLY):
   ⚠️ Projects often need the most work to align with job requirements

   STEP 1 - ANALYZE RELEVANCE:
   - Which projects use technologies from required_skills? → These are HIGH priority
   - Which projects demonstrate key_responsibilities? → These are HIGH priority
   - Which projects are less relevant? → These are LOWER priority

   STEP 2 - REORDER:
   - Put the most relevant projects FIRST
   - Relevance = uses required_skills technologies OR demonstrates key_responsibilities

   STEP 3 - ENHANCE DESCRIPTIONS BASED ON RELEVANCE:

   For HIGH RELEVANCE projects (uses required_skills technologies):
   - Expand description to be significantly more detailed and technical
   - Prominently feature the required_skills technologies used
   - Add architectural details (backend structure, database design, API patterns, cloud services)
   - Include scale and metrics if applicable (user count, data volume, performance benchmarks)
   - Use professional technical language that matches the job description's tone
   - Make it sound production-quality and substantial

   For MEDIUM RELEVANCE projects:
   - Enhance description with more technical detail
   - Highlight any technologies or skills that overlap with job requirements
   - Improve language to be more professional and clear
   - Emphasize transferable aspects

   For LOWER RELEVANCE projects:
   - Keep description clear and professional but concise
   - Don't over-elaborate
   - Improve language quality

   Example transformation for HIGH RELEVANCE project:
   BEFORE: "Built an e-commerce website with payment integration"
   AFTER: "Developed full-stack e-commerce platform using React, Node.js, and PostgreSQL with integrated Stripe payment processing, JWT authentication, and Redis caching layer, serving 5,000+ daily users with <200ms average response time"

   Key principle: Make the most relevant projects feel DIRECTLY aligned with what the job requires

4. SKILLS (REORGANIZE BY RELEVANCE):
   - REORDER each skill category to put required_skills FIRST
   - Then preferred_skills
   - Then other skills
   - Keep all existing skills (don't remove or add)

5. EDUCATION & CERTIFICATIONS:
   - Keep as-is unless relevant to job requirements

6. DATE FORMATTING (CRITICAL - APPLY CONSISTENTLY):
   - Analyze ALL dates in education, projects, and work experience
   - Determine the MAJORITY date format used across the resume:
     * If majority uses "MM/YYYY" format (e.g., "05/2025") → use that format for ALL dates
     * If majority uses "Month YYYY" format (e.g., "May 2025") → use that format for ALL dates
   - If there's no clear majority or you're unsure → DEFAULT to "Month YYYY" format (e.g., "May 2025")
   - CONSISTENCY RULE: Once you determine the format, apply it to EVERY date field:
     * education[].graduation_date
     * projects[].start_date and projects[].end_date
     * experience[].start_date and experience[].end_date
   - Example transformations:
     * "5/2025" → "May 2025" (if Month YYYY is chosen)
     * "May 2025" → "05/2025" (if MM/YYYY is chosen)
     * "2025-05" → "May 2025" or "05/2025" (based on majority format)

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

        # Sanitize hyphens from the tailored JSON
        tailored_json = sanitize_json_hyphens(tailored_json)

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
        candidate_email = personal_info.get('email', '')
        candidate_phone = personal_info.get('phone', '')
        candidate_location = personal_info.get('location', '')

        # Get LinkedIn or portfolio links
        header_links = personal_info.get('header_links', [])
        linkedin_link = ''
        portfolio_link = ''
        for link in header_links:
            link_text = link.get('text', '').lower()
            if 'linkedin' in link_text:
                linkedin_link = link.get('url', '')
            elif 'portfolio' in link_text or 'github' in link_text or 'website' in link_text:
                portfolio_link = link.get('url', '')

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
8. CRITICAL: DO NOT use hyphens (-), em dashes (—), or en dashes (–) anywhere in the text. Use spaces or commas instead.

STRUCTURE:
- Opening paragraph: Express interest, mention specific role
- Body (2-3 paragraphs): Highlight relevant qualifications and achievements
- Closing paragraph: Call to action, express enthusiasm for next steps

TONE: Professional, confident, specific, and genuine."""

        # Build contact info block
        contact_info_lines = [candidate_name]
        if candidate_location:
            contact_info_lines.append(candidate_location)
        if candidate_phone:
            contact_info_lines.append(candidate_phone)
        if candidate_email:
            contact_info_lines.append(candidate_email)
        if linkedin_link:
            contact_info_lines.append(linkedin_link)
        if portfolio_link:
            contact_info_lines.append(portfolio_link)

        contact_info = '\n'.join(contact_info_lines)

        # Get today's date in mm/dd/yy format
        today_date = datetime.now().strftime("%m/%d/%y")

        user_prompt = f"""Generate a cover letter for this application:

CANDIDATE INFORMATION:
Name: {candidate_name}
Email: {candidate_email}
Phone: {candidate_phone}
Location: {candidate_location}
LinkedIn: {linkedin_link}
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

FORMAT REQUIREMENTS:
Use proper business letter format with the following structure:

[Candidate's Full Contact Information Block - include name, location, phone, email, and LinkedIn/portfolio if available]

{today_date}

[Company Information Block - include company name and "Hiring Team" or hiring manager if known]

Dear {hiring_manager or 'Hiring Manager'},

[Opening paragraph - express interest in the specific role]

[Body paragraphs - 2-3 paragraphs highlighting:
 - How your skills and experience match the required skills
 - Specific achievements that align with key responsibilities
 - Technical expertise relevant to the role
 - Genuine interest in the company/role]

[Closing paragraph - call to action and enthusiasm for next steps]

Sincerely,
{candidate_name}

IMPORTANT:
- Include ALL available contact information in the header (location, phone, email, LinkedIn)
- Use the actual date {today_date} in the letter (NOT a placeholder like [Today's Date])
- Add a company address block after the date
- Keep professional formatting and spacing
- Make it compelling and specific to the role

Generate the complete cover letter now:"""

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

        # Sanitize hyphens from the cover letter text
        cover_letter_text = sanitize_hyphens(cover_letter_text)

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
@traceable(name="edit_resume_content")
def edit_resume_content(edit_instructions: str) -> dict:
    """
    Edits specific sections of the resume based on user instructions.

    This tool:
    - Analyzes the user's edit instructions
    - Identifies which section(s) to modify (experience, summary, skills, projects, education)
    - Makes targeted edits to those specific sections
    - Returns the updated resume JSON
    - Does NOT generate cover letter or email (editing only)

    Args:
        edit_instructions: User's instructions for what to edit in the resume

    Returns:
        dict: {
            "success": bool,
            "edited_json": dict (the updated resume JSON),
            "message": str,
            "sections_modified": list[str] (which sections were changed),
            "changes_description": str (summary of changes made)
        }
    """
    try:
        logger.info("Editing resume content based on user instructions...")

        # Get runtime context (contains resume_json)
        context = get_runtime_context()
        resume_json = context.get("resume_json")

        if not resume_json:
            return {
                "success": False,
                "edited_json": {},
                "message": "Resume JSON not found in context",
                "sections_modified": [],
                "changes_description": ""
            }

        # First, identify which sections to modify
        section_analysis_prompt = """You are a resume editing assistant. Analyze the user's edit instructions and identify which resume sections need to be modified.

Resume sections available:
- personal_info: Name, contact details, location, links
- professional_summary: The summary paragraph at the top
- experience: Work experience entries
- projects: Project entries
- skills: Skills organized by category
- education: Education entries
- certifications: Certifications/awards

Return JSON with:
{
    "sections_to_modify": ["section1", "section2", ...],
    "edit_type": "add" | "update" | "remove" | "reorder",
    "specific_target": "description of what specifically to change",
    "reasoning": "brief explanation"
}"""

        section_messages = [
            SystemMessage(content=section_analysis_prompt),
            HumanMessage(content=f"User's edit instructions: {edit_instructions}\n\nIdentify which sections need to be modified.")
        ]

        section_llm = _llm_mini.bind(response_format={"type": "json_object"})
        section_response = section_llm.invoke(section_messages)
        section_analysis = json.loads(section_response.content)

        sections_to_modify = section_analysis.get("sections_to_modify", [])
        edit_type = section_analysis.get("edit_type", "update")
        specific_target = section_analysis.get("specific_target", "")

        logger.info(f"Sections to modify: {sections_to_modify}, Edit type: {edit_type}")

        # Now perform the actual editing
        system_prompt = """You are an expert resume editor specializing in technical resumes.

CORE PRINCIPLES:
1. Make ONLY the changes requested by the user
2. Work with existing information - do not fabricate details
3. Maintain the EXACT same JSON structure
4. Keep all other sections unchanged
5. Be precise and targeted in your edits
6. Maintain professional language and formatting
7. Keep date formats consistent with the rest of the resume

YOUR TASK:
Edit the specific sections identified based on the user's instructions."""

        user_prompt = f"""CURRENT RESUME (JSON):
{json.dumps(resume_json, indent=2)}

USER'S EDIT INSTRUCTIONS:
{edit_instructions}

SECTIONS TO MODIFY:
{', '.join(sections_to_modify)}

EDIT TYPE: {edit_type}
SPECIFIC TARGET: {specific_target}

INSTRUCTIONS:
1. Focus ONLY on the sections that need modification: {', '.join(sections_to_modify)}
2. Apply the user's requested changes precisely
3. If adding content, integrate it naturally with existing content
4. If updating content, make targeted changes while preserving other details
5. If removing content, ensure the structure remains valid
6. Keep all other sections exactly as they are
7. Maintain consistent date formatting throughout
8. Return the complete resume JSON with modifications applied

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON matching the exact structure provided
- Every section must be present (even if unchanged)
- All arrays must maintain same structure
- Ensure all quotes are properly escaped in JSON

Apply the requested edits now:"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Create editing LLM
        editing_llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
            max_tokens=4096
        )

        # Bind JSON response format
        structured_llm = editing_llm.bind(response_format={"type": "json_object"})

        # Invoke and get response
        response = structured_llm.invoke(messages)

        # Extract token usage
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"edit_resume_content token usage: {token_usage}")

        # Parse edited JSON
        edited_json = json.loads(response.content)

        # Create change description
        changes_description = f"Modified {', '.join(sections_to_modify)} section(s) based on your instructions: {specific_target}"

        logger.info("Resume edited successfully")

        return {
            "success": True,
            "edited_json": edited_json,
            "message": "Resume successfully edited",
            "sections_modified": sections_to_modify,
            "changes_description": changes_description,
            "token_usage": token_usage
        }

    except Exception as e:
        logger.error(f"Resume editing failed: {e}")
        return {
            "success": False,
            "edited_json": resume_json if 'resume_json' in locals() else {},
            "message": f"Failed to edit resume: {str(e)}",
            "sections_modified": [],
            "changes_description": ""
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

        # Extract candidate info
        personal_info = resume_data.get('personal_info', {})
        candidate_name = personal_info.get('name', 'Candidate Name')

        # Get recent experience details
        experience = resume_data.get('experience', [])
        recent_exp = experience[0] if experience else {}
        recent_title = recent_exp.get('title', 'N/A')
        recent_company = recent_exp.get('company', 'N/A')

        # Get top skills
        skills = []
        for skill_cat in resume_data.get('skills', []):
            skills.extend(skill_cat.get('skills', []))

        # Get notable projects
        projects = resume_data.get('projects', [])
        top_project = projects[0] if projects else {}

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
Generate a tailored, impactful email to send to a recruiter after applying for a position.

REQUIREMENTS:
1. Concise length (120-140 words) - brief but tailored
2. Professional but personable tone
3. Mention that application has been submitted
4. Express genuine enthusiasm for the role and company
5. Highlight 2 key qualifications with specific details (experience or skills)
6. Show clear alignment between candidate's background and job requirements
7. Mention 1-2 specific technical skills relevant to the role
8. Include clear call to action
9. Make it feel personalized and thoughtful, not generic
10. CRITICAL: DO NOT use hyphens (-), em dashes (—), or en dashes (–) anywhere in the text. Use spaces or commas instead.

STRUCTURE:
Subject: [Create compelling, specific subject line mentioning role and key qualification]

Body:
Dear Hiring Manager,

[Opening - mention application submission and express enthusiasm for role]

[Body - In 2-3 concise sentences, highlight key qualifications that align with job requirements:
 - Mention current role and relevant experience
 - Reference 1-2 specific technical skills or achievements
 - Show fit with the role]

[Closing - Express interest in discussing further and next steps]

Best regards,
[Name]

TONE: Professional, confident, specific, genuine, and enthusiastic."""

        user_prompt = f"""Generate a recruiter email for this application:

CANDIDATE INFORMATION:
Name: {candidate_name}
Current/Recent Role: {recent_title} at {recent_company}
Top Skills: {', '.join(skills[:15])}
Notable Project: {top_project.get('name', 'N/A')} - {top_project.get('description', '')[:100] if top_project.get('description') else 'N/A'}

JOB APPLICATION:
Job Title: {job_title}
Company: {company_name}
Role Focus: {role_focus}

KEY JOB REQUIREMENTS (from analysis):
Required Skills: {', '.join(required_skills[:10])}
Key Responsibilities: {', '.join(summary_data.get('key_responsibilities', [])[:3])}

INSTRUCTIONS:
- Make the email feel personalized to this specific role and company
- Highlight how the candidate's experience with {recent_company} and skills align with {company_name}'s needs
- Mention 1-2 specific technical skills from the required skills that the candidate has
- Keep it brief but impactful - don't be too wordy
- Keep it professional but show genuine enthusiasm
- Length: 120-140 words maximum

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

        # Sanitize hyphens from the email subject and body
        subject = sanitize_hyphens(subject)
        body = sanitize_hyphens(body)

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
