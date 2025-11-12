import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving the extension"""
    ext = Path(original_filename).suffix
    unique_name = f"{uuid.uuid4()}{ext}"
    return unique_name


def validate_file_extension(filename: str, allowed_extensions: set) -> bool:
    """Validate if file has an allowed extension"""
    ext = Path(filename).suffix.lower()
    return ext in allowed_extensions


async def save_upload_file(file: UploadFile, upload_dir: str) -> str:
    """Save uploaded file to disk and return the file path"""
    os.makedirs(upload_dir, exist_ok=True)

    unique_filename = generate_unique_filename(file.filename)
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        return file_path
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


def delete_file(file_path: str) -> bool:
    """Delete a file from disk"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False


def ensure_dir_exists(directory: str) -> None:
    """Ensure a directory exists, create if it doesn't"""
    os.makedirs(directory, exist_ok=True)
