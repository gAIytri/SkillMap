"""Check what styles are available in your resume"""
from docx import Document

doc = Document('/Users/sidharthraj/Gaiytri projects/SkillMap/SidharthRaj_Khandelwal-2.docx')

print("Available styles in your resume:")
for style in doc.styles:
    if style.type == 1:  # Paragraph style
        print(f"  - {style.name}")
