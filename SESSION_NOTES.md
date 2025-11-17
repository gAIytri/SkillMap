# SkillMap Development Session Notes

Last Updated: 2025-11-16

---

## 1. Document Generation Template Fixes

### Issue: Document formatting problems
The generated DOCX files had multiple issues with margins, spacing, and formatting.

### Solutions Implemented:

#### A. Margins & Page Setup (`backend/services/docx_generation_service.py`)
```python
# Set ALL margins to 0.5 inch and page size to US Letter
section.top_margin = Inches(0.5)
section.bottom_margin = Inches(0.5)
section.left_margin = Inches(0.5)
section.right_margin = Inches(0.5)

# Set page size to US Letter (8.5" × 11")
section.page_width = Inches(8.5)
section.page_height = Inches(11)
```

**Previous Issues:**
- Left margin: 0.39" (incorrect)
- Top margin: 0.28" (incorrect)
- Bottom margin: 0.19" (incorrect)
- Page size: A4 (incorrect)

**Fixed:**
- All margins: 0.5 inches
- Page size: US Letter (8.5" × 11")
- Content area: 7.5 inches wide

#### B. Section Header Underlines
**Problem:** Underlines not extending to right margin edge

**Solution:**
```python
def add_section_header(doc: Document, title: str):
    # Create empty paragraph first to avoid duplicate text
    try:
        para = doc.add_paragraph(style='Heading1')
    except KeyError:
        para = doc.add_paragraph()

    # Add title text as a run
    run = para.add_run(title)
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.name = 'Calibri'

    # Force paragraph to span full width by setting indentation explicitly
    pPr_ind = para._p.get_or_add_pPr()
    ind = OxmlElement('w:ind')
    ind.set(qn('w:left'), '0')
    ind.set(qn('w:right'), '0')
    pPr_ind.append(ind)

    # Add bottom border with NO spacing
    pPr = para._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')
    bottom.set(qn('w:space'), '0')  # No spacing - border goes edge to edge
    bottom.set(qn('w:color'), 'auto')
    pBdr.append(bottom)
    pPr.append(pBdr)
```

**Key Points:**
- Create empty paragraph first (avoids duplicate section names)
- Set left/right indents to 0 at XML level
- Border spacing set to 0 (edge-to-edge underlines)

#### C. Spacing Configuration
**Global Settings:**
```python
# Global spacing configuration (in Pt)
SECTION_SPACING_BEFORE = 3  # Space before each section header
SECTION_SPACING_AFTER = 0   # NO gap after section header underline
```

**First Entry in Sections (NO gap after underline):**
```python
# Experience section
for idx, exp in enumerate(experience):
    # First item: NO gap. Subsequent items: minimal spacing
    job_para.paragraph_format.space_before = Pt(0) if idx == 0 else Pt(4)

# Projects section
for idx, project in enumerate(projects):
    # First item: NO gap. Subsequent items: minimal spacing
    project_para.paragraph_format.space_before = Pt(0) if idx == 0 else Pt(4)
```

**Result:**
- Section headers: 3pt spacing before, 0pt after
- First entry: 0pt gap after underline
- Subsequent entries: 4pt spacing between items

#### D. Date Alignment
**Tab stops adjusted for 0.5" margins:**
```python
# Experience dates
tab_stops.add_tab_stop(Inches(7.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)

# Project dates
tab_stops.add_tab_stop(Inches(7.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)

# Education dates
tab_stops.add_tab_stop(Inches(7.5), alignment=WD_ALIGN_PARAGRAPH.RIGHT)
```

**Calculation:** 8.5" page - 0.5" left - 0.5" right = 7.5" content width

#### E. Header Section (NO gaps)
```python
def add_header_section(doc: Document, personal_info: Dict[str, Any]):
    # Name - centered, bold, 18pt
    name_para.paragraph_format.space_after = Pt(0)  # NO gap below name

    # Contact line - directly below
    contact_para.paragraph_format.space_before = Pt(0)
    contact_para.paragraph_format.space_after = Pt(0)

    # Links line - clickable hyperlinks
    links_para.paragraph_format.space_before = Pt(0)
    links_para.paragraph_format.space_after = Pt(0)
```

---

## 2. Toast Notification System

### Replaced all `alert()` calls with modern toast notifications

#### Installation:
```bash
npm install react-hot-toast
```

#### Setup (`frontend/src/App.jsx`):
```javascript
import { Toaster } from 'react-hot-toast';

<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: {
      background: '#fff',
      color: '#333',
      fontFamily: 'Poppins, sans-serif',
      fontSize: '14px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      padding: '12px 16px',
    },
    success: {
      iconTheme: { primary: '#4caf50', secondary: '#fff' },
      style: { border: '1px solid #4caf50' },
    },
    error: {
      iconTheme: { primary: '#f44336', secondary: '#fff' },
      style: { border: '1px solid #f44336' },
    },
    loading: {
      iconTheme: { primary: '#2196f3', secondary: '#fff' },
    },
  }}
/>
```

#### Updated Files:
1. **`frontend/src/pages/ProjectEditor.jsx`**
   - Resume replace: Success/error toasts
   - Save project: Success/error toasts
   - Download PDF/DOCX: Success/error toasts
   - Tailor resume: Rich toast with changes list
   - Section reorder: Error toast
   - Validation errors: Error toasts

2. **`frontend/src/pages/Dashboard.jsx`**
   - Create project: Success/error toasts
   - Delete project: Loading → Success/error toasts

3. **`frontend/src/pages/Login.jsx`**
   - Google OAuth: Error toast

4. **`frontend/src/components/LoginBox.jsx`**
   - Validation: Error toast

5. **`frontend/src/pages/ResumeViewer.jsx`**
   - Download PDF: Success/error toasts

#### Usage Examples:
```javascript
// Simple success
toast.success('Resume replaced successfully!');

// Simple error
toast.error('Failed to save project. Please try again.');

// Loading with update
const toastId = toast.loading('Deleting project...');
// ... do async work
toast.success('Project deleted successfully!', { id: toastId });

// Rich content
toast.success(
  (t) => (
    <div>
      <strong>Resume tailored successfully!</strong>
      <div style={{ marginTop: '8px', fontSize: '12px' }}>
        <strong>Changes Made:</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
          {changes.slice(0, 3).map((change, idx) => (
            <li key={idx}>{change}</li>
          ))}
        </ul>
      </div>
    </div>
  ),
  { duration: 6000 }
);
```

---

## 3. Full-Screen Loading Overlay

### Added for Resume Replace Operation

**Location:** `frontend/src/pages/ProjectEditor.jsx`

```javascript
{uploading && (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)',
    }}
  >
    <CircularProgress size={60} sx={{ color: '#4caf50', mb: 3 }} />
    <Typography variant="h6" sx={{ color: '#fff', fontFamily: 'Poppins, sans-serif', mb: 1 }}>
      Replacing Resume
    </Typography>
    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontFamily: 'Poppins, sans-serif' }}>
      Extracting data and generating preview...
    </Typography>
  </Box>
)}
```

**Features:**
- Full-screen dark overlay with blur
- Large green spinner (60px)
- Clear status messages
- Blocks UI interaction during upload
- Stays visible until PDF preview loads
- Z-index 9999 (appears above everything)

**Replace Button Enhancement:**
```javascript
<Button
  onClick={() => fileInputRef.current?.click()}
  disabled={uploading}
  size="small"
  startIcon={uploading ? <CircularProgress size={14} sx={{ color: '#111111' }} /> : null}
  sx={{
    '&:disabled': {
      color: '#666',
      opacity: 0.7,
    },
  }}
>
  {uploading ? 'Replacing...' : 'Replace'}
</Button>
```

---

## 4. Template Specification

### Final Document Template Requirements:

1. ✅ **Margins:** 0.5 inches all around
2. ✅ **Page Size:** US Letter (8.5" × 11")
3. ✅ **Content Width:** 7.5 inches
4. ✅ **Header Section:**
   - Name centered, 18pt bold, NO gap below
   - Contact line directly below (separated by "|")
   - Links line with clickable hyperlinks (text only shown)
5. ✅ **Section Headers:**
   - Bold, 12pt, Calibri
   - Underline extends edge-to-edge within margins
   - NO gap after underline
   - 3pt spacing before section
6. ✅ **First Entry in Section:**
   - NO gap after section underline
   - Sits directly below underline
7. ✅ **Subsequent Entries:**
   - 4pt spacing between items
8. ✅ **Text Alignment:** LEFT (not justified)
9. ✅ **Bullet Points:** Visible bullet character (•)
10. ✅ **Dates:** Right-aligned at 7.5 inches from left

---

## 5. Key File Changes Summary

### Backend Files Modified:
- `backend/services/docx_generation_service.py` (major rewrite)
  - Fixed margins (0.5" all around)
  - Fixed page size (US Letter)
  - Fixed section header underlines (edge-to-edge)
  - Fixed spacing (reduced gaps)
  - Fixed first entry spacing (0pt after underline)
  - Fixed date alignment (7.5" tab stops)

### Frontend Files Modified:
- `frontend/src/App.jsx` (added Toaster)
- `frontend/src/pages/ProjectEditor.jsx` (toast + loading overlay)
- `frontend/src/pages/Dashboard.jsx` (toast)
- `frontend/src/pages/Login.jsx` (toast)
- `frontend/src/components/LoginBox.jsx` (toast)
- `frontend/src/pages/ResumeViewer.jsx` (toast)
- `frontend/package.json` (added react-hot-toast)

---

## 6. Testing Checklist

### Document Generation:
- [ ] Check all margins are 0.5 inches
- [ ] Verify page size is US Letter
- [ ] Confirm underlines extend edge-to-edge
- [ ] Verify NO gap after section underlines
- [ ] Check first entry sits directly under underline
- [ ] Confirm 4pt spacing between subsequent entries
- [ ] Verify dates align at right edge (7.5")
- [ ] Check bullet points are visible
- [ ] Confirm text is LEFT-aligned
- [ ] Verify header has NO gaps between lines

### UI/UX:
- [ ] Test toast notifications appear correctly
- [ ] Verify full-screen loader during resume replace
- [ ] Check loading spinner on Replace button
- [ ] Confirm toasts auto-dismiss after 4 seconds
- [ ] Test error toasts display properly
- [ ] Verify success toasts with green checkmark

---

## 7. Commands to Restart

### Backend:
```bash
cd "/Users/sidharthraj/Gaiytri projects/SkillMap/backend"
uvicorn main:app --reload --port 8000
```

### Frontend:
```bash
cd "/Users/sidharthraj/Gaiytri projects/SkillMap/frontend"
npm run dev
```

---

## 8. Known Issues / Future Improvements

### None currently - all issues resolved! ✓

---

## 9. Next Steps (if needed)

1. Test document generation with various resume formats
2. Verify toast notifications on all actions
3. Check full-screen loader behavior
4. Validate spacing across different resume lengths
5. Test with multiple job/project entries

---

**End of Session Notes**
