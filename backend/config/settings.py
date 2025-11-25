from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Database (SQLite for development, PostgreSQL for production)
    DATABASE_URL: str = "sqlite:///./skillmap.db"

    # Security (SECRET_KEY is REQUIRED - no default for security)
    SECRET_KEY: str  # Must be set via environment variable
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24  # 24 hours

    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # CORS (comma-separated string)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Frontend URL (for email magic links)
    FRONTEND_URL: str = "http://localhost:5173"

    # Email Service (Resend)
    RESEND_API_KEY: Optional[str] = None
    FROM_EMAIL: str = "SkillMap <onboarding@resend.dev>"

    @property
    def cors_origins_list(self) -> list:
        """Parse CORS origins from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # File Upload
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {".docx"}

    # Storage
    STORAGE_TYPE: str = "local"  # or "s3"
    UPLOAD_DIR: str = "./uploads"

    # OpenAI (for LLM extraction and tailoring)
    OPENAI_API_KEY: Optional[str] = None

    # LangSmith (for agent tracing and monitoring)
    LANGCHAIN_TRACING_V2: Optional[str] = None
    LANGCHAIN_ENDPOINT: Optional[str] = None
    LANGCHAIN_API_KEY: Optional[str] = None
    LANGCHAIN_PROJECT: Optional[str] = None

    # Credits System Configuration
    # These values control credit allocation, costs, and limits
    DEFAULT_USER_CREDITS: float = 100.0  # Initial credits for new users
    MINIMUM_CREDITS_FOR_TAILOR: float = 5.0  # Minimum credits required to tailor resume
    TOKENS_PER_CREDIT: int = 2000  # Number of tokens equivalent to 1 credit
    CREDIT_ROUNDING: float = 0.5  # Round credits to nearest 0.5
    LOW_CREDIT_THRESHOLD: float = 10.0  # Show warning when credits fall below this

    # Stripe Payment Configuration
    STRIPE_SECRET_KEY: Optional[str] = None  # Stripe secret key (sk_test_... for sandbox)
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None  # Stripe publishable key (pk_test_...)
    STRIPE_WEBHOOK_SECRET: Optional[str] = None  # Stripe webhook signing secret
    STRIPE_SUCCESS_URL: str = "http://localhost:5173/profile?payment=success"
    STRIPE_CANCEL_URL: str = "http://localhost:5173/profile?payment=cancelled"

    # Credit packages (credits -> price in USD cents)
    CREDIT_PACKAGES: dict = {
        50: 500,    # 50 credits = $5.00
        100: 900,   # 100 credits = $9.00
        250: 2000,  # 250 credits = $20.00
        500: 3500,  # 500 credits = $35.00
    }

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Validate critical API keys
import sys

def validate_settings():
    """Validate that critical settings are configured"""
    errors = []

    # Check SECRET_KEY is not default/weak
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        errors.append("SECRET_KEY must be set and at least 32 characters long")

    # Check OPENAI_API_KEY is set (required for core functionality)
    if not settings.OPENAI_API_KEY:
        errors.append("OPENAI_API_KEY is required for resume extraction and tailoring")

    # Check Stripe keys if credit system is being used
    # (Only warn, don't fail - allows running without payments in dev)
    if not settings.STRIPE_SECRET_KEY:
        print("⚠️  WARNING: STRIPE_SECRET_KEY not set - credit purchases will fail", file=sys.stderr)

    if not settings.STRIPE_WEBHOOK_SECRET:
        print("⚠️  WARNING: STRIPE_WEBHOOK_SECRET not set - webhook verification will fail", file=sys.stderr)

    # If there are critical errors, fail fast
    if errors:
        print("\n❌ CRITICAL CONFIGURATION ERRORS:", file=sys.stderr)
        for error in errors:
            print(f"   - {error}", file=sys.stderr)
        print("\nPlease set required environment variables in .env file\n", file=sys.stderr)
        sys.exit(1)

# Run validation on import
validate_settings()

# Set LangSmith environment variables for LangChain tracing
# LangChain reads these directly from os.environ, not from settings object
if settings.LANGCHAIN_TRACING_V2:
    os.environ["LANGCHAIN_TRACING_V2"] = settings.LANGCHAIN_TRACING_V2
if settings.LANGCHAIN_ENDPOINT:
    os.environ["LANGCHAIN_ENDPOINT"] = settings.LANGCHAIN_ENDPOINT
if settings.LANGCHAIN_API_KEY:
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGCHAIN_API_KEY
if settings.LANGCHAIN_PROJECT:
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGCHAIN_PROJECT
