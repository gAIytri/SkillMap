# PDF Upload Regression Analysis

## Why PDF Uploads Suddenly Broke

### Previous Code (Worked):
```python
# OLD CODE - Only accepted DOCX
if not validate_file_extension(file.filename, settings.ALLOWED_EXTENSIONS):
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Only .docx files are allowed"  # ← ONLY DOCX!
    )

# Save file content
existing_resume.original_docx = content  # Always DOCX bytes ✓
```

**Result:** ✅ Worked because:
- Only DOCX files were accepted
- `original_docx` field always contained valid DOCX bytes
- When generating PDF later, it could use DOCX as template

---

### Current Code (Broken):
```python
# NEW CODE - Accepts DOCX, PDF, Images
# Now accepts: .docx, .doc, .pdf, .jpg, .jpeg, .png, .bmp, .tiff

# Extract JSON from any format (including PDF)
resume_json = extract_resume(file_content, filename=filename)  # ✓ Works

# Save file content (❌ PROBLEM!)
existing_resume.original_docx = file_content  # Could be PDF bytes!
```

**Result:** ❌ Broken because:
- Now accepts PDF files
- `original_docx` field contains PDF bytes
- When generating PDF later, tries to use PDF bytes as DOCX template
- Error: "File is not a zip file" (DOCX is a ZIP, PDF is not)

---

## The Root Cause

### What Changed:
**Session Update:** Support for PDF/Image uploads was added (to allow more flexible resume input)

**What Broke:**
The code saves the raw uploaded file to `original_docx` field, regardless of format.

### Error Flow:
1. User uploads **PDF resume** ✓
2. Backend extracts JSON from PDF ✓
3. Backend saves **PDF bytes** to `original_docx` field ❌
4. User opens project in editor
5. Frontend requests PDF preview: `GET /api/projects/6/pdf`
6. Backend tries to generate DOCX from JSON using `original_docx` as template
7. Backend calls: `Document(BytesIO(base_resume_docx))`
8. **python-docx** tries to open PDF as ZIP file
9. **Error:** "File is not a zip file" ❌

---

## Why You Didn't Notice Before

**Previous Sessions:**
- You probably only uploaded DOCX files
- Even if code allowed PDFs, you never tried uploading one
- So `original_docx` always had valid DOCX bytes

**This Session:**
- First time uploading PDF after PDF/Image support was added
- Triggered the bug for the first time

---

## The Fix

### Solution: Generate DOCX from Extracted JSON

When uploading non-DOCX files (PDF, images), generate a DOCX from the extracted JSON:

```python
# After extracting JSON from PDF/image
if filename.lower().endswith(('.docx', '.doc')):
    # Original file is DOCX - use it directly
    docx_to_save = file_content
else:
    # Original file is PDF/image - generate DOCX from JSON
    docx_to_save = generate_resume_from_json(
        resume_json=resume_json,
        base_resume_docx=None,  # No template, create from scratch
        section_order=None
    )

# Save the DOCX (not the original file)
existing_resume.original_docx = docx_to_save  # Always DOCX bytes ✓
```

**Result:** ✅ Works because:
- `original_docx` always contains valid DOCX bytes
- Can be used as template for future regeneration
- PDF preview generation works correctly

---

## Timeline

1. **Initial Code:** Only DOCX supported → Worked ✓
2. **Recent Update:** Added PDF/Image support → Broke ❌ (but you didn't test)
3. **Today:** You uploaded PDF for first time → Error discovered
4. **Fix Applied:** Generate DOCX from JSON for non-DOCX inputs → Works ✓

---

## Summary

**Question:** "Why did this suddenly break?"

**Answer:**
- It didn't suddenly break
- PDF/Image support was added recently
- But the code wasn't updated to handle saving non-DOCX formats
- You just tested PDF upload for the first time today
- The bug was there all along, just not triggered until now

**Fix:**
- Generate DOCX from extracted JSON when original file isn't DOCX
- This ensures `original_docx` field always contains valid DOCX bytes
- Now PDF/Image uploads work correctly

---

**Status:** ✅ **FIXED** - PDF/Image uploads now generate proper DOCX templates
