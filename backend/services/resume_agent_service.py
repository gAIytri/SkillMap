"""
Resume Tailoring Agent Service
LangChain ReAct agent for orchestrating resume tailoring workflow
"""

from typing import Dict, Any, AsyncIterator
from langchain.agents import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field
import logging
import json
import asyncio

from config.settings import settings
from services.agent_tools import (
    validate_intent,
    summarize_job_description,
    tailor_resume_content,
    generate_cover_letter,
    generate_recruiter_email,
    set_runtime_context
)

logger = logging.getLogger(__name__)


# Runtime context schema
class TailoringContext(BaseModel):
    """Runtime context for the tailoring agent"""
    resume_json: Dict[str, Any] = Field(description="The resume JSON to be tailored")
    job_description: str = Field(description="The job description text")
    project_id: int = Field(description="The project ID being tailored")


class TokenTrackingCallback(BaseCallbackHandler):
    """Custom callback handler to track token usage for LangSmith"""

    def __init__(self, agent_instance):
        """
        Initialize callback with reference to agent instance

        Args:
            agent_instance: The ResumeTailoringAgent instance to update token counts
        """
        super().__init__()
        self.agent = agent_instance

    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        """
        Called when LLM completes - capture token usage

        Args:
            response: LLMResult containing token usage information
        """
        try:
            # Extract token usage from response
            if hasattr(response, 'llm_output') and response.llm_output:
                token_usage = response.llm_output.get('token_usage', {})

                prompt_tokens = token_usage.get('prompt_tokens', 0)
                completion_tokens = token_usage.get('completion_tokens', 0)
                total_tokens = token_usage.get('total_tokens', 0)

                # Update agent instance token counts
                self.agent.prompt_tokens_used += prompt_tokens
                self.agent.completion_tokens_used += completion_tokens
                self.agent.total_tokens_used += total_tokens

                logger.info(
                    f"LLM call completed - Prompt: {prompt_tokens}, "
                    f"Completion: {completion_tokens}, Total: {total_tokens} | "
                    f"Running total: {self.agent.total_tokens_used}"
                )
        except Exception as e:
            logger.error(f"Failed to track token usage: {e}")


class ResumeTailoringAgent:
    """
    ReAct agent for resume tailoring with guardrails and streaming

    Workflow:
    1. User clicks "Tailor Resume" with job description
    2. Guardrail (validate_intent) checks if input is valid
    3. If valid, summarize_job_description extracts requirements
    4. tailor_resume_content applies changes to resume JSON
    5. Returns tailored resume with intermediate messages
    """

    def __init__(self):
        """Initialize the agent with tools and configuration"""
        # Token usage tracking - initialize before creating model
        self.total_tokens_used = 0
        self.prompt_tokens_used = 0
        self.completion_tokens_used = 0

        # Create callback handler for token tracking
        self.token_callback = TokenTrackingCallback(self)

        # Create LLM with token tracking callback
        self.model = ChatOpenAI(
            model="gpt-4o",
            api_key=settings.OPENAI_API_KEY,
            temperature=0.3,
            streaming=True,
            model_kwargs={
                "seed": 42  # For consistency
            },
            callbacks=[self.token_callback],  # Add token tracking callback
            verbose=True  # Enable verbose logging for LangSmith
        )

        # Agent tools
        self.tools = [
            validate_intent,
            summarize_job_description,
            tailor_resume_content,
            generate_cover_letter,
            generate_recruiter_email
        ]

        # System prompt for the agent
        self.system_prompt = """You are a professional resume tailoring assistant.

Your workflow is:
1. FIRST, use the validate_intent tool to check if the user's message is appropriate for resume tailoring
2. If validation FAILS (valid=False), stop immediately and return the error message to the user
3. If validation SUCCEEDS and intent_type is "job_description":
   a. Use summarize_job_description to analyze the job requirements
   b. Use tailor_resume_content with the job summary to tailor the resume
4. If intent_type is "resume_modification", inform the user that manual edits are not yet supported via this agent

IMPORTANT RULES:
- ALWAYS validate intent FIRST before doing anything else
- If intent validation fails, DO NOT proceed with other tools
- After each tool execution, provide a brief update to the user
- Be concise and professional in your responses
- When tailoring is complete, summarize the changes made

You have access to the user's resume JSON and job description through the runtime context."""

        # Memory for conversation state
        self.memory = MemorySaver()

        # Create the agent
        self.agent = None  # Will be created with runtime context

    def create_agent_with_context(self, context: TailoringContext):
        """
        Create agent instance with runtime context

        Args:
            context: TailoringContext with resume_json, job_description, project_id

        Returns:
            Configured agent instance
        """
        try:
            # Create agent with tools, model, and system prompt
            from langchain.agents import create_react_agent as langchain_create_agent
            from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

            # Create prompt template
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.system_prompt),
                MessagesPlaceholder(variable_name="chat_history", optional=True),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])

            # Create agent
            agent = langchain_create_agent(
                llm=self.model,
                tools=self.tools,
                prompt=prompt
            )

            # Store context
            self.current_context = context

            logger.info(f"Agent created with context for project {context.project_id}")
            return agent

        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise

    async def stream_tailor_resume(
        self,
        resume_json: Dict[str, Any],
        job_description: str,
        project_id: int
    ) -> AsyncIterator[Dict[str, Any]]:
        """
        Stream the resume tailoring process with intermediate messages

        Args:
            resume_json: The resume JSON to tailor
            job_description: The job description text
            project_id: The project ID being tailored

        Yields:
            Dict with message updates from each step:
            {
                "type": "status" | "tool_call" | "tool_result" | "final",
                "message": str,
                "data": dict (optional)
            }
        """
        try:
            # Reset token counters for this run
            self.total_tokens_used = 0
            self.prompt_tokens_used = 0
            self.completion_tokens_used = 0

            # Set runtime context for tools to access
            set_runtime_context(resume_json, job_description)

            yield {
                "type": "status",
                "message": "Starting resume tailoring process...",
                "step": "initialization"
            }
            await asyncio.sleep(0)  # Force flush

            # Simplified workflow: Call tools directly in sequence
            # Step 1: Validate intent
            yield {
                "type": "status",
                "message": "Validating your input...",
                "step": "guardrail"
            }
            await asyncio.sleep(0)  # Force flush

            intent_result = validate_intent.invoke(job_description)

            # Track tokens from validate_intent
            if "token_usage" in intent_result:
                usage = intent_result["token_usage"]
                self.prompt_tokens_used += usage.get("prompt_tokens", 0)
                self.completion_tokens_used += usage.get("completion_tokens", 0)
                self.total_tokens_used += usage.get("total_tokens", 0)
                logger.info(f"Cumulative tokens after validate_intent: {self.total_tokens_used}")

            yield {
                "type": "tool_result",
                "tool": "validate_intent",
                "message": intent_result.get("message", ""),
                "data": intent_result
            }
            await asyncio.sleep(0)  # Force flush

            # Check if validation failed
            if not intent_result.get("valid", False):
                yield {
                    "type": "final",
                    "success": False,
                    "message": intent_result.get("message", "Invalid input"),
                    "tailored_json": None
                }
                await asyncio.sleep(0)  # Force flush
                return

            # Step 2: Summarize job description
            yield {
                "type": "status",
                "message": "Analyzing job requirements...",
                "step": "summarization"
            }
            await asyncio.sleep(0)  # Force flush

            summary_result = summarize_job_description.invoke(job_description)

            # Track tokens from summarize_job_description
            if "token_usage" in summary_result:
                usage = summary_result["token_usage"]
                self.prompt_tokens_used += usage.get("prompt_tokens", 0)
                self.completion_tokens_used += usage.get("completion_tokens", 0)
                self.total_tokens_used += usage.get("total_tokens", 0)
                logger.info(f"Cumulative tokens after summarize_job_description: {self.total_tokens_used}")

            yield {
                "type": "tool_result",
                "tool": "summarize_job_description",
                "message": summary_result.get("message", ""),
                "data": {
                    "role_focus": summary_result.get("summary", {}).get("role_focus", ""),
                    "required_skills_count": len(summary_result.get("summary", {}).get("required_skills", []))
                }
            }
            await asyncio.sleep(0)  # Force flush

            if not summary_result.get("success", False):
                yield {
                    "type": "final",
                    "success": False,
                    "message": "Failed to analyze job description",
                    "tailored_json": None
                }
                await asyncio.sleep(0)  # Force flush
                return

            # Step 3: Tailor resume
            yield {
                "type": "status",
                "message": "Tailoring your resume to match the job requirements...",
                "step": "tailoring"
            }
            await asyncio.sleep(0)  # Force flush

            # Call tailor tool (context already set above)
            # Pass the entire summary_result as the tool expects it
            tailor_result = tailor_resume_content.invoke({"job_summary": summary_result})

            # Track tokens from tailor_resume_content
            if "token_usage" in tailor_result:
                usage = tailor_result["token_usage"]
                self.prompt_tokens_used += usage.get("prompt_tokens", 0)
                self.completion_tokens_used += usage.get("completion_tokens", 0)
                self.total_tokens_used += usage.get("total_tokens", 0)
                logger.info(f"Cumulative tokens after tailor_resume_content: {self.total_tokens_used}")

            yield {
                "type": "tool_result",
                "tool": "tailor_resume_content",
                "message": tailor_result.get("message", ""),
                "data": {
                    "changes_made": tailor_result.get("changes_made", [])
                }
            }
            await asyncio.sleep(0)  # Force flush

            if not tailor_result.get("success", False):
                yield {
                    "type": "final",
                    "success": False,
                    "message": "Failed to tailor resume",
                    "tailored_json": None,
                    "token_usage": {
                        "prompt_tokens": self.prompt_tokens_used,
                        "completion_tokens": self.completion_tokens_used,
                        "total_tokens": self.total_tokens_used
                    }
                }
                await asyncio.sleep(0)  # Force flush
                return

            # Step 4: Generate cover letter
            yield {
                "type": "status",
                "message": "Generating professional cover letter...",
                "step": "cover_letter"
            }
            await asyncio.sleep(0)  # Force flush

            # Convert tailored JSON to string for the tool
            tailored_json_str = json.dumps(tailor_result.get("tailored_json", {}))

            # Pass job summary (already computed) instead of re-processing full JD
            cover_letter_result = generate_cover_letter.invoke({
                "resume_json": tailored_json_str,
                "job_summary": summary_result,  # Reuse existing summary for efficiency
                "job_description": job_description
            })

            # Track tokens from generate_cover_letter
            if "token_usage" in cover_letter_result:
                usage = cover_letter_result["token_usage"]
                self.prompt_tokens_used += usage.get("prompt_tokens", 0)
                self.completion_tokens_used += usage.get("completion_tokens", 0)
                self.total_tokens_used += usage.get("total_tokens", 0)
                logger.info(f"Cumulative tokens after generate_cover_letter: {self.total_tokens_used}")

            yield {
                "type": "tool_result",
                "tool": "generate_cover_letter",
                "message": cover_letter_result.get("message", ""),
                "data": {
                    "company_name": cover_letter_result.get("company_name", ""),
                    "success": cover_letter_result.get("success", False)
                }
            }
            await asyncio.sleep(0)  # Force flush

            # Step 5: Generate recruiter email
            yield {
                "type": "status",
                "message": "Generating recruiter email...",
                "step": "email"
            }
            await asyncio.sleep(0)  # Force flush

            # Pass job summary (already computed) instead of re-processing full JD
            email_result = generate_recruiter_email.invoke({
                "resume_json": tailored_json_str,
                "job_summary": summary_result,  # Reuse existing summary for efficiency
                "job_description": job_description
            })

            # Track tokens from generate_recruiter_email
            if "token_usage" in email_result:
                usage = email_result["token_usage"]
                self.prompt_tokens_used += usage.get("prompt_tokens", 0)
                self.completion_tokens_used += usage.get("completion_tokens", 0)
                self.total_tokens_used += usage.get("total_tokens", 0)
                logger.info(f"Cumulative tokens after generate_recruiter_email: {self.total_tokens_used}")

            yield {
                "type": "tool_result",
                "tool": "generate_recruiter_email",
                "message": email_result.get("message", ""),
                "data": {
                    "subject": email_result.get("subject", ""),
                    "success": email_result.get("success", False)
                }
            }
            await asyncio.sleep(0)  # Force flush

            # Final result with token usage
            logger.info(
                f"Resume tailoring completed - Total tokens used: {self.total_tokens_used} "
                f"(Prompt: {self.prompt_tokens_used}, Completion: {self.completion_tokens_used})"
            )

            yield {
                "type": "final",
                "success": True,
                "message": "Resume tailored successfully! Cover letter and email generated.",
                "tailored_json": tailor_result.get("tailored_json", {}),
                "changes_made": tailor_result.get("changes_made", []),
                "cover_letter": cover_letter_result.get("cover_letter", ""),
                "cover_letter_success": cover_letter_result.get("success", False),
                "email_subject": email_result.get("subject", ""),
                "email_body": email_result.get("body", ""),
                "email_success": email_result.get("success", False),
                "token_usage": {
                    "prompt_tokens": self.prompt_tokens_used,
                    "completion_tokens": self.completion_tokens_used,
                    "total_tokens": self.total_tokens_used
                }
            }
            await asyncio.sleep(0)  # Force flush

        except Exception as e:
            logger.error(f"Agent execution failed: {e}")
            yield {
                "type": "final",
                "success": False,
                "message": f"Agent execution failed: {str(e)}",
                "tailored_json": None,
                "token_usage": {
                    "prompt_tokens": self.prompt_tokens_used,
                    "completion_tokens": self.completion_tokens_used,
                    "total_tokens": self.total_tokens_used
                }
            }
            await asyncio.sleep(0)  # Force flush


async def tailor_resume_with_agent(
    resume_json: Dict[str, Any],
    job_description: str,
    project_id: int
) -> AsyncIterator[Dict[str, Any]]:
    """
    Main entry point for resume tailoring with agent

    Args:
        resume_json: The resume JSON to tailor
        job_description: The job description text
        project_id: The project ID being tailored

    Yields:
        Status updates and final result
    """
    agent_service = ResumeTailoringAgent()
    async for message in agent_service.stream_tailor_resume(
        resume_json,
        job_description,
        project_id
    ):
        yield message
