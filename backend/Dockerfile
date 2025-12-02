FROM python:3.11-slim

# Install system dependencies including LaTeX, LibreOffice, Poppler, and Tesseract
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    libreoffice \
    libreoffice-writer \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads generated_pdfs

# Expose port (Cloud Run will override this with $PORT)
EXPOSE 8080

# Run the application
# Cloud Run sets PORT environment variable, default to 8080 if not set
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
