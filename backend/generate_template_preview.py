"""
Generate a template preview resume with John Doe sample data
This creates a DOCX file that can be screenshotted for the upload page preview
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.docx_generation_service import generate_resume_from_json

# Complete John Doe template data
template_data = {
    "personal_info": {
        "name": "JOHN DOE",
        "email": "john.doe@email.com",
        "phone": "(555) 123-4567",
        "location": "San Francisco, CA",
        "current_role": "Senior Software Engineer",
        "header_links": [
            {"text": "LinkedIn", "url": "https://linkedin.com/in/johndoe"},
            {"text": "GitHub", "url": "https://github.com/johndoe"},
            {"text": "Portfolio", "url": "https://johndoe.dev"}
        ]
    },
    "professional_summary": "Results-driven Senior Software Engineer with 6+ years of experience building scalable web applications and leading cross-functional teams. Expertise in full-stack development with React, Node.js, Python, and cloud technologies. Proven track record of delivering high-impact features that improve user experience and drive business growth. Strong advocate for clean code, automated testing, and agile methodologies.",
    "experience": [
        {
            "company": "Tech Innovations Inc.",
            "title": "Senior Software Engineer",
            "location": "San Francisco, CA",
            "start_date": "Jan 2021",
            "end_date": "Present",
            "bullets": [
                "Architected and developed a microservices-based platform serving 2M+ users, reducing page load time by 40% through optimization techniques and caching strategies",
                "Led a team of 5 engineers in migrating legacy monolith to React and Node.js, resulting in 50% faster feature deployment and improved developer productivity",
                "Implemented CI/CD pipelines with GitHub Actions and Docker, automating testing and deployment processes and reducing release time from 2 days to 2 hours",
                "Designed and built RESTful APIs with Express.js and PostgreSQL, handling 10K+ requests per minute with 99.9% uptime",
                "Mentored junior developers through code reviews and pair programming sessions, improving team code quality scores by 35%"
            ]
        },
        {
            "company": "Digital Solutions Corp.",
            "title": "Software Engineer",
            "location": "Austin, TX",
            "start_date": "Jun 2018",
            "end_date": "Dec 2020",
            "bullets": [
                "Developed customer-facing dashboard with React, Redux, and Material-UI, increasing user engagement by 60%",
                "Built data processing pipeline with Python and Apache Airflow to handle 1M+ records daily, reducing processing time by 70%",
                "Integrated third-party payment systems (Stripe, PayPal) supporting $5M+ in annual transaction volume",
                "Collaborated with product and design teams to deliver 20+ features using Agile methodologies and sprint planning"
            ]
        }
    ],
    "projects": [
        {
            "name": "E-Commerce Platform",
            "technologies": ["React", "Node.js", "MongoDB", "AWS", "Stripe"],
            "date": "2023",
            "description": "Built a full-stack e-commerce platform with product catalog, shopping cart, and secure checkout functionality. Implemented user authentication with JWT, integrated Stripe payment processing, and deployed on AWS EC2 with auto-scaling. Achieved sub-second page loads and handled 500+ concurrent users."
        },
        {
            "name": "Real-Time Analytics Dashboard",
            "technologies": ["Python", "Flask", "PostgreSQL", "WebSockets", "Chart.js"],
            "date": "2022",
            "description": "Developed real-time analytics dashboard for monitoring system metrics and KPIs. Utilized WebSockets for live data streaming, PostgreSQL for time-series data storage, and Chart.js for interactive visualizations. Reduced data latency from 5 minutes to real-time updates."
        },

    ],
    "education": [
        {
            "institution": "University of California",
            "location": "Berkeley, CA",
            "degree": "B.S. in Computer Science",
            "gpa": "3.8",
            "graduation_date": "May 2018"
        }
    ],
    "skills": [
        {
            "category": "Languages",
            "skills": ["JavaScript", "TypeScript", "Python", "Java", "SQL", "HTML", "CSS"]
        },
        {
            "category": "Frontend",
            "skills": ["React", "Redux", "Next.js", "Vue.js", "Material-UI", "Tailwind CSS", "Webpack"]
        },
        {
            "category": "Backend",
            "skills": ["Node.js", "Express.js", "FastAPI", "Django", "Flask", "RESTful APIs", "GraphQL"]
        },
        {
            "category": "Databases",
            "skills": ["PostgreSQL", "MongoDB", "MySQL", "Redis", "DynamoDB"]
        },
        {
            "category": "DevOps & Tools",
            "skills": ["Docker", "Kubernetes", "AWS", "Git", "GitHub Actions", "Jenkins", "Terraform"]
        },
        {
            "category": "Other",
            "skills": ["Agile/Scrum", "Unit Testing", "Jest", "Pytest", "Microservices", "System Design"]
        }
    ],
    "certifications": [
        "AWS Certified Solutions Architect - Associate",
        "Google Cloud Professional Developer",
        "MongoDB Certified Developer"
    ]
}

if __name__ == '__main__':
    print("Generating John Doe template resume...")
    print("Using programmatic template (no base resume needed)")

    # Generate DOCX with programmatic template
    docx_bytes = generate_resume_from_json(template_data)

    # Save to file
    output_path = 'john_doe_template.docx'
    with open(output_path, 'wb') as f:
        f.write(docx_bytes)

    print(f"✅ Template resume generated: {output_path}")
    print(f"   File size: {len(docx_bytes):,} bytes")
    print("\nNext steps:")
    print("1. Open john_doe_template.docx")
    print("2. Take a screenshot of the entire first page")
    print("3. Save as 'resume-template-preview.png' or 'resume-template-preview.jpg'")
    print("4. Place in frontend/src/assets/")
    print("5. Let me know and I'll update the UploadResume component to use it!")
