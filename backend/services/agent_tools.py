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


def _validate_resume_modification(user_message: str) -> dict:
    """
    Internal helper to validate if a resume modification request is supported.

    Checks if the user is asking for:
    - Supported: Content changes (text, bullets, dates, adding/removing entries)
    - Unsupported: Structural changes (section order, section names, template changes, formatting)

    Returns:
        dict: {
            "supported": bool,
            "message": str (error message if not supported),
            "suggestions": str (alternative actions user can take)
        }
    """
    try:
        messages = [
            SystemMessage(content="""You are validating whether a resume modification request is supported by the system.

THE SYSTEM CAN MODIFY (Supported):
✅ Content within sections:
   - Personal info (name, email, phone, location, links)
   - Professional summary text
   - Work experience (company, title, dates, location, bullet points)
   - Education (degree, institution, dates, GPA)
   - Skills (categories and skills within them)
   - Projects (name, bullet points, technologies, links, dates)
   - Certifications (list items)
✅ Adding or removing entries within sections (new job, new project, etc.)
✅ Rewriting/improving content
✅ Changing dates, locations, text content

THE SYSTEM CANNOT MODIFY (Unsupported):
❌ Section order/reordering sections
❌ Renaming section headers (e.g., "Experience" to "Work History")
❌ Adding new custom section types
❌ Template/formatting changes (fonts, colors, layout, spacing)
❌ PDF/DOCX formatting preferences
❌ Page breaks, margins, or document structure
❌ Adding images, logos, or graphics

Analyze the user's request and return JSON:
{
    "supported": true/false,
    "request_type": "content_modification" | "structural_modification" | "formatting_modification",
    "specific_ask": "what specifically they're asking for",
    "reasoning": "why it's supported or not"
}"""),
            HumanMessage(content=f"Is this modification request supported?\n\nUser request: {user_message}")
        ]

        structured_llm = _llm_mini.bind(response_format={"type": "json_object"})
        response = structured_llm.invoke(messages)
        result = json.loads(response.content)

        supported = result.get("supported", False)
        request_type = result.get("request_type", "unknown")
        specific_ask = result.get("specific_ask", "")
        reasoning = result.get("reasoning", "")

        if supported:
            return {
                "supported": True,
                "message": "Modification request is supported"
            }

        # Build helpful error message based on what they were trying to do
        if request_type == "structural_modification":
            error_msg = f"I cannot modify the section structure. {specific_ask}. You can manually reorder sections using the editor's drag-and-drop feature."
            suggestions = "Try: Editing content within existing sections, or use the UI to reorder sections."
        elif request_type == "formatting_modification":
            error_msg = f"I cannot modify formatting or template design. {specific_ask}. The PDF format and styling are automatically generated."
            suggestions = "Try: Editing the content itself, which will be reflected in the generated PDF."
        else:
            error_msg = f"This modification is not supported. {reasoning}."
            suggestions = "I can help you edit content within sections: professional summary, experience bullets, skills, projects, education, and certifications."

        return {
            "supported": False,
            "message": error_msg,
            "suggestions": suggestions
        }

    except Exception as e:
        logger.error(f"Modification validation failed: {e}")
        # On error, allow the request through (fail open)
        return {
            "supported": True,
            "message": "Proceeding with modification"
        }


@tool
@traceable(name="validate_intent")
def validate_intent(user_message: str) -> dict:
    """
    Guardrail tool that validates user intent for resume tailoring.

    This tool checks if the user's message is:
    - A job description to tailor the resume against
    - A request to modify specific parts of the resume (and if supported)
    - Or something unrelated (reject)

    For resume modifications, it validates whether the requested changes are
    supported by the system (content changes vs structural/formatting changes).

    Args:
        user_message: The message from the user to validate

    Returns:
        dict: {
            "valid": bool,
            "intent_type": "job_description" | "resume_modification" | "unsupported_modification" | "invalid",
            "message": str,
            "details": str (optional - contains suggestions for unsupported modifications)
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

        # If it's a resume modification, validate if the request is supported
        if intent_type == "resume_modification":
            modification_check = _validate_resume_modification(user_message)

            if not modification_check["supported"]:
                return {
                    "valid": False,
                    "intent_type": "unsupported_modification",
                    "message": modification_check["message"],
                    "details": modification_check.get("suggestions", ""),
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

Analyze the job description thoroughly and extract detailed information:
1. Required technical skills - List ALL specific programming languages, frameworks, tools, platforms mentioned as required
2. Preferred/nice-to-have technical skills - List technologies mentioned as preferred or bonus
3. Experience requirements - Specify years of experience, specific domains, seniority level
4. Key responsibilities - List 5-8 main responsibilities in detail
5. Nice-to-have qualifications - Education, certifications, soft skills preferred
6. ATS keywords - 15-20 important technical terms and buzzwords that should appear in resume
7. Overall role focus - Specific role type (e.g., "Senior Backend Engineer", "Full Stack Developer")
8. Company context - Brief note about company type/industry if mentioned
9. Technical depth - Note if role requires deep expertise in specific areas

Be comprehensive and specific. Include version numbers, specific frameworks, cloud platforms, databases, etc.

Return as JSON:
{
    "required_skills": ["skill1", "skill2", ...],
    "preferred_skills": ["skill1", "skill2", ...],
    "experience_required": "detailed description of experience needed",
    "key_responsibilities": ["resp1", "resp2", ...],
    "nice_to_have": ["qual1", "qual2", ...],
    "ats_keywords": ["keyword1", "keyword2", ...],
    "role_focus": "specific role title/focus",
    "company_context": "brief company/industry context",
    "technical_depth_areas": ["area1", "area2", ...]
}"""),
            HumanMessage(content=f"Analyze this job description in detail:\n\n{job_description}")
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
def tailor_resume_content(job_description: str) -> dict:
    """
    Tailors the resume JSON based on the full job description.

    This tool:
    - Gets the resume JSON from runtime context
    - Analyzes the job description and applies tailoring in one step
    - Returns the updated resume JSON

    Args:
        job_description: The full job description text to tailor against

    Returns:
        dict: {
            "success": bool,
            "tailored_json": dict (the updated resume JSON),
            "message": str,
            "changes_made": list[str] (description of changes)
        }
    """
    try:
        logger.info("Tailoring resume content with direct JD analysis...")

        # Get runtime context (contains resume_json)
        context = get_runtime_context()

        resume_json = context.get("resume_json")

        if not resume_json:
            return {
                "success": False,
                "tailored_json": {},
                "message": "Resume JSON not found in context",
                "changes_made": []
            }

        # Create tailoring prompt with full job description
        system_prompt = """You are an expert technical resume tailoring assistant.

RULES:
1. Work ONLY with existing information - NEVER fabricate
2. Make substantial, impactful improvements
3. Use technical language matching the role level
4. Maintain EXACT JSON structure
5. NO hyphens (-), em dashes (—), or en dashes (–) - use spaces/commas

Analyze the job description and tailor the resume in one optimized step."""

        # Build detailed user prompt with comprehensive instructions
        user_prompt = f"""JOB DESCRIPTION:
{job_description}

RESUME JSON:
{json.dumps(resume_json, indent=2)}

TAILORING INSTRUCTIONS:

STEP 1 - ANALYZE JOB DESCRIPTION:
Extract: required skills, preferred skills, key responsibilities, seniority level, ATS keywords.

⚠️ CRITICAL: REWRITE each bullet completely - don't just append words at the end!

CORE RULES:
1. WORK EXPERIENCE: REWRITE each bullet from scratch, WEAVING IN JD tech throughout. Never just append.
2. PROJECTS: REWRITE each bullet, INTEGRATING details naturally. Not "original + additions".
3. SKILLS: REORDER + ADD 2-4 new skills from JD.
4. Write naturally - NO "Dynamic, results-driven..." templates
5. Technologies should be WOVEN throughout sentences, not tacked on at the end

EXAMPLE - How to REWRITE (not append):
BEFORE: "Developed features for web application"
WRONG: "Developed features for web application using React and Redux with 40% improvement"
RIGHT: "Engineered key features for web application leveraging React and Redux state management, implementing real-time notifications via WebSocket connections and optimizing component rendering to improve page load time by 40%"
(Notice: Technologies WOVEN throughout, not just added at end)

Now tailor each section:

1. PROFESSIONAL SUMMARY:
Rewrite to highlight relevant experience for this role. Lead with expertise, mention 2-3 key JD technologies naturally. NO adjectives like "Dynamic" or "Results-driven" before job title. Keep 3-4 sentences, natural and professional.

2. WORK EXPERIENCE:
DO NOT reorder jobs. COMPLETELY REWRITE each bullet by WEAVING IN details naturally:

❌ WRONG - Don't just append at the end:
"Developed backend API using Node.js and Express with JWT authentication"
(This feels like technologies were just tacked on)

✅ RIGHT - Rewrite the ENTIRE bullet, weaving details throughout:
"Architected scalable REST API using Node.js and Express, implementing JWT-based authentication with Redis session management, handling 10K+ daily requests with <100ms response time"
(Technologies and details are INTEGRATED naturally throughout)

INSTRUCTIONS:
- REWRITE the entire bullet from scratch, don't just add words at the end
- WEAVE IN JD technologies naturally throughout the sentence
- INTEGRATE metrics and scale into the flow
- PRESERVE all original accomplishments but express them more impressively
- Make it read like ONE cohesive professional sentence, not "original + additions"

3. PROJECTS:
Reorder by relevance (most matching projects first). COMPLETELY REWRITE each bullet by WEAVING IN details:

❌ WRONG - Don't append at the end:
"Built chat application with React and Node.js with 50K users"
(Just added tech at end - awkward)

✅ RIGHT - Rewrite ENTIRE bullet, weaving throughout:
"Engineered real-time chat platform leveraging React and Node.js with Socket.io for WebSocket connections, implementing message persistence using MongoDB and Redis Pub/Sub for multi-server synchronization, scaling to support 50K+ concurrent users with <50ms message latency"
(Technologies are INTEGRATED naturally throughout the description)

INSTRUCTIONS:
- REWRITE each bullet completely from scratch
- WEAVE IN JD technologies throughout the sentence naturally
- INTEGRATE architectural details (authentication, caching, APIs) into the flow
- BLEND IN metrics and scale naturally
- Make it ONE cohesive, impressive sentence - not "original + tacked-on additions"

Use "bullets" array field (NOT "description"). Each bullet = separate string in array.

4. SKILLS:
You MUST make visible changes:
1. REORDER each category - put JD-required skills at the FRONT
2. ADD 2-4 new skills from JD that are logical (e.g., if user has React and JD wants TypeScript, ADD TypeScript)
3. If category names are generic ("Tools"), rename to be specific ("Cloud & DevOps")

Example:
BEFORE: Languages: JavaScript, Java, Python, C++
JD WANTS: Python, TypeScript
AFTER: Languages: Python, TypeScript, JavaScript, Java, C++ (Python moved to front, TypeScript added)

5. DO NOT TOUCH:
NEVER modify: Personal Info, Education, Certifications. Keep them exactly as provided.

6. DATE FORMATTING:
Use consistent format across all dates. Check if majority uses "MM/YYYY" or "Month YYYY" and apply that format everywhere.

JSON STRUCTURE:
- Projects and Experience MUST use "bullets" array (separate strings)
- Return complete JSON with exact same structure
- Professional summary = single paragraph string

OUTPUT: Return complete tailored resume JSON. Make SUBSTANTIAL improvements to content."""

        # Use LangChain ChatOpenAI for LangSmith tracing
        logger.info("Calling LLM for tailoring...")

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Create tailoring LLM with optimized settings for detailed output
        tailoring_llm = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,  # Slightly higher for more creative tailoring
            max_tokens=4096   # Sufficient for detailed resume JSON
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
    job_description: str,
    company_name: Optional[str] = None,
    hiring_manager: Optional[str] = None
) -> dict:
    """
    Generate a professional cover letter based on resume and job description.

    This tool:
    - Analyzes the job description directly
    - Extracts key qualifications that match the job
    - Creates a compelling cover letter highlighting relevant experience
    - Uses professional tone and standard business format

    Args:
        resume_json: JSON string of the resume data
        job_description: Full job description text
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
            # Sanitize LinkedIn link - remove https:// and http://
            sanitized_linkedin = linkedin_link.replace('https://', '').replace('http://', '')
            contact_info_lines.append(sanitized_linkedin)
        if portfolio_link:
            # Sanitize portfolio link - remove https:// and http://
            sanitized_portfolio = portfolio_link.replace('https://', '').replace('http://', '')
            contact_info_lines.append(sanitized_portfolio)

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

FULL JOB DESCRIPTION:
{job_description}

COMPANY NAME: {company_name}
HIRING MANAGER: {hiring_manager or 'Hiring Manager'}

FORMAT REQUIREMENTS:
Use proper business letter format with the following structure:

[Candidate's Full Contact Information Block - include name, location, phone, email, and LinkedIn/portfolio if available]

{today_date}

[Company Information Block - include company name and "Hiring Team" or hiring manager if known]

Dear {hiring_manager or 'Hiring Manager'},

[Opening paragraph - express interest in the specific role from job description]

[Body paragraphs - 2-3 paragraphs highlighting:
 - Analyze job description to identify required skills and responsibilities
 - Match candidate's skills and experience to job requirements
 - Highlight specific achievements that align with the role
 - Show technical expertise relevant to the position
 - Express genuine interest in the company/role]

[Closing paragraph - call to action and enthusiasm for next steps]

Sincerely,
{candidate_name}

IMPORTANT:
- Analyze the full job description to understand requirements
- Include ALL available contact information in the header (location, phone, email, LinkedIn)
- Use the actual date {today_date} in the letter (NOT a placeholder like [Today's Date])
- Add a company address block after the date
- Keep professional formatting and spacing
- Make it compelling and specific to the role based on job description analysis

Generate the complete cover letter now:"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Invoke LLM for generation (using mini for speed)
        response = _llm_mini.invoke(messages)
        cover_letter_text = response.content.strip()

        # Extract token usage
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"generate_cover_letter token usage (gpt-4o-mini): {token_usage}")

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
    job_description: str,
    company_name: Optional[str] = None,
    job_title: Optional[str] = None
) -> dict:
    """
    Generate a professional email to send to recruiter for job application.

    This tool:
    - Analyzes the job description directly
    - Creates a concise, professional email
    - Mentions the application and key qualifications
    - Expresses enthusiasm for the role
    - Includes clear call to action

    Args:
        resume_json: JSON string of the resume data
        job_description: Full job description text
        company_name: Company name (optional, extracted from JD if not provided)
        job_title: Job title (optional, extracted from JD if not provided)

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

        # Extract company name if not provided
        if not company_name:
            logger.info("Extracting company name from job description...")
            extract_messages = [
                SystemMessage(content="Extract the company name from the job description. Return ONLY the company name as plain text, nothing else."),
                HumanMessage(content=f"Job Description:\n\n{job_description[:800]}")
            ]
            company_response = _llm_mini.invoke(extract_messages)
            company_name = company_response.content.strip()

        # Extract job title if not provided
        if not job_title:
            logger.info("Extracting job title from job description...")
            title_messages = [
                SystemMessage(content="Extract the job title/position from the job description. Return ONLY the job title as plain text, nothing else."),
                HumanMessage(content=f"Job Description:\n\n{job_description[:800]}")
            ]
            title_response = _llm_mini.invoke(title_messages)
            job_title = title_response.content.strip()

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

FULL JOB DESCRIPTION:
{job_description}

INSTRUCTIONS:
- Analyze the job description to identify required skills and responsibilities
- Make the email feel personalized to this specific role and company
- Highlight how the candidate's experience with {recent_company} and skills align with {company_name}'s needs
- Mention 1-2 specific technical skills from the job description that the candidate has
- Keep it brief but impactful - don't be too wordy
- Keep it professional but show genuine enthusiasm
- Length: 120-140 words maximum

Generate the email with subject line and body now:"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]

        # Invoke LLM for generation (using mini for speed)
        response = _llm_mini.invoke(messages)
        email_text = response.content.strip()

        # Extract token usage
        token_usage = {
            "prompt_tokens": response.response_metadata.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": response.response_metadata.get("token_usage", {}).get("completion_tokens", 0),
            "total_tokens": response.response_metadata.get("token_usage", {}).get("total_tokens", 0)
        }
        logger.info(f"generate_recruiter_email token usage (gpt-4o-mini): {token_usage}")

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
