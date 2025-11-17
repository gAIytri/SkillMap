# Bullet Alignment Analysis

## Problem Statement
When bullet text wraps to a second line, the second line doesn't align with the text after the bullet on the first line. Instead, it's indented too far to the right.

## Current Implementation

```python
def add_bullet_paragraph(doc: Document, text: str, font_size: int = 9):
    # Add bullet character (•) followed by text
    run = para.add_run(f"• {sanitize_text(text)}")

    # Set hanging indent for bullet alignment
    para.paragraph_format.left_indent = Inches(0.25)
    para.paragraph_format.first_line_indent = Inches(-0.25)
```

## How Hanging Indent Works

### Settings:
- `left_indent = 0.25"` - All lines start at 0.25" from left margin
- `first_line_indent = -0.25"` - First line pulled back by 0.25"

### Result:
- **Line 1**: Starts at `0.25" - 0.25" = 0"` (at the margin)
- **Line 2+**: Starts at `0.25"` (indented from margin)

## Visual Representation

### Current Behavior:
```
• First line of bullet text that wraps
    Second line is here (indented at 0.25")
    Third line also here (indented at 0.25")
```

### Desired Behavior:
```
• First line of bullet text that wraps
  Second line aligns with start of "First"
  Third line aligns with start of "First"
```

## Root Cause

The problem is that `0.25"` is **TOO LARGE** for the actual width of "• " (bullet + space).

### Actual Width of "• " in Calibri 9pt:
- Bullet character width: ~8-10 points = ~0.11-0.14"
- Space character width: ~3-4 points = ~0.04-0.05"
- **Total: ~12-14 points = ~0.15-0.18"**

### Current indent: 0.25" (18 points)
**Gap between text start and line 2 start:** 0.25" - 0.15" = 0.1" ❌

This creates extra space!

## The Fix

Set `left_indent` and `first_line_indent` to match the actual bullet width:

```python
# Bullet width for Calibri 9pt: approximately 0.18 inches
BULLET_INDENT = 0.18

para.paragraph_format.left_indent = Inches(BULLET_INDENT)
para.paragraph_format.first_line_indent = Inches(-BULLET_INDENT)
```

### After Fix:
- **Line 1**: Starts at `0.18" - 0.18" = 0"`
- **Line 2+**: Starts at `0.18"` (aligns with text after bullet!)

## Visual After Fix:
```
• First line of bullet text that wraps
  Second line now aligns perfectly
  Third line also aligns perfectly
```

## Recommended Value

For **Calibri 9pt**, the optimal indent is:
- **0.18 inches** - Good balance, slight padding
- **0.16 inches** - Tighter alignment
- **0.20 inches** - More breathing room

**Recommended:** `0.18 inches` for clean, professional alignment.

## Code Change

**File:** `backend/services/docx_generation_service.py`
**Function:** `add_bullet_paragraph` (lines 157-158)

**Before:**
```python
para.paragraph_format.left_indent = Inches(0.25)
para.paragraph_format.first_line_indent = Inches(-0.25)
```

**After:**
```python
para.paragraph_format.left_indent = Inches(0.18)
para.paragraph_format.first_line_indent = Inches(-0.18)
```

---

**Testing:** Generate a resume with long bullet points that wrap to verify alignment.
