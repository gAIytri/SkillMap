from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import subprocess
import tempfile
import os

from config.database import init_db
from config.settings import settings
from routers import auth, users, resumes, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for FastAPI app"""
    # Startup: Initialize database
    print("🚀 Starting SkillMap API...")
    print("📊 Initializing database...")
    init_db()
    print("✅ Database initialized successfully")
    yield
    # Shutdown: Cleanup (if needed)
    print("👋 Shutting down SkillMap API...")


# Initialize FastAPI app
app = FastAPI(
    title="SkillMap API",
    description="Resume tailoring application API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(resumes.router)
app.include_router(projects.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to SkillMap API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Request model for LaTeX to HTML conversion
class LaTeXToHTMLRequest(BaseModel):
    latex_content: str


@app.post("/api/latex-to-html")
async def convert_latex_to_html(request: LaTeXToHTMLRequest):
    """
    Convert LaTeX content to HTML for preview
    Uses pandoc for conversion
    """
    try:
        latex_content = request.latex_content

        # Extract just the document body (between \begin{document} and \end{document})
        import re
        body_match = re.search(r'\\begin\{document\}(.*?)\\end\{document\}', latex_content, re.DOTALL)

        if body_match:
            # Extract body content
            body_content = body_match.group(1).strip()
        else:
            # If no document environment, use the whole content
            body_content = latex_content

        # Create temporary LaTeX file with simplified structure
        simplified_latex = f"""\\documentclass{{article}}
\\usepackage[utf8]{{inputenc}}
\\usepackage{{hyperref}}
\\usepackage{{xcolor}}
\\usepackage{{enumitem}}
\\begin{{document}}
{body_content}
\\end{{document}}
"""

        with tempfile.NamedTemporaryFile(mode='w', suffix='.tex', delete=False, encoding='utf-8') as tex_file:
            tex_file.write(simplified_latex)
            tex_path = tex_file.name

        try:
            # Use pandoc to convert LaTeX to HTML with standalone mode
            result = subprocess.run(
                ['pandoc', tex_path, '-f', 'latex', '-t', 'html', '--mathjax', '--standalone'],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                # If conversion fails, log the error and return a simplified version
                print(f"Pandoc error: {result.stderr}")

                # Try without standalone mode
                result = subprocess.run(
                    ['pandoc', tex_path, '-f', 'latex', '-t', 'html', '--mathjax'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )

                if result.returncode != 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"LaTeX conversion failed: {result.stderr}"
                    )

            html_content = result.stdout

            return {"html_content": html_content}

        finally:
            # Cleanup temporary file
            if os.path.exists(tex_path):
                os.unlink(tex_path)

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="LaTeX conversion timed out")
    except Exception as e:
        print(f"Conversion error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")