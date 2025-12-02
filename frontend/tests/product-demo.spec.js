/**
 * SkillMap Product Demo - End-to-End Automation
 *
 * This script automates the complete user journey for the product demo video:
 * 1. Login
 * 2. View/Create Profile
 * 3. Create/View Projects
 * 4. Tailor Resume to Job Description
 * 5. Generate & Download PDF
 *
 * Run with: npx playwright test tests/product-demo.spec.js --headed --slowmo=1000
 */

import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = 'http://localhost:5173'; // Your frontend dev server
const TEST_USER = {
  email: 'demo@skillmap.com',
  password: 'DemoPassword123!'
};

test.describe('SkillMap Product Demo', () => {
  test.use({
    viewport: { width: 1920, height: 1080 }, // Full HD for video
    video: {
      mode: 'on',
      size: { width: 1920, height: 1080 }
    },
    screenshot: 'on'
  });

  test('Complete User Journey - Login to Resume Generation', async ({ page }) => {
    // ==========================================
    // STEP 1: Landing Page & Login
    // ==========================================
    console.log('📍 Step 1: Navigating to SkillMap...');
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click Login button
    await page.click('text=Login');

    // Fill in login credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit login
    await page.click('button:has-text("Login")');

    // Wait for successful login (dashboard appears)
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Step 1 Complete: Logged in successfully');

    // Pause to show dashboard
    await page.waitForTimeout(2000);

    // ==========================================
    // STEP 2: Navigate to Profile
    // ==========================================
    console.log('📍 Step 2: Viewing Profile...');
    await page.click('text=Profile');
    await page.waitForLoadState('networkidle');

    // Show profile sections (scroll through)
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 0));

    console.log('✅ Step 2 Complete: Profile viewed');

    // ==========================================
    // STEP 3: View Projects
    // ==========================================
    console.log('📍 Step 3: Navigating to Projects...');
    await page.click('text=Projects');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Open a project (click first project card)
    const firstProject = page.locator('[data-testid="project-card"]').first();
    if (await firstProject.isVisible()) {
      await firstProject.click();
      await page.waitForTimeout(2000);
      console.log('✅ Step 3 Complete: Project opened');
    } else {
      console.log('⚠️  No projects found - skipping project view');
    }

    // ==========================================
    // STEP 4: Tailor Resume
    // ==========================================
    console.log('📍 Step 4: Tailoring resume to job description...');

    // Click "Tailor Resume" or "New Tailoring" button
    await page.click('button:has-text("Tailor")');
    await page.waitForLoadState('networkidle');

    // Paste job description (sample)
    const sampleJobDescription = `
Senior Full Stack Developer

We are seeking an experienced Full Stack Developer with expertise in:
- React.js and Node.js
- Python and FastAPI
- PostgreSQL database design
- RESTful API development
- Cloud deployment (AWS/Azure)

Requirements:
- 5+ years of software development experience
- Strong problem-solving skills
- Experience with CI/CD pipelines
- Bachelor's degree in Computer Science
    `.trim();

    await page.fill('textarea[placeholder*="job description"]', sampleJobDescription);
    await page.waitForTimeout(1000);

    // Click "Tailor" button
    await page.click('button:has-text("Tailor Resume")');

    // Wait for tailoring to complete (this might take a few seconds)
    await page.waitForSelector('text=Tailoring complete', { timeout: 30000 });
    console.log('✅ Step 4 Complete: Resume tailored successfully');

    await page.waitForTimeout(2000);

    // ==========================================
    // STEP 5: Generate & View PDF
    // ==========================================
    console.log('📍 Step 5: Generating PDF resume...');

    // Click "Generate PDF" or "Compile" button
    await page.click('button:has-text("Compile")');

    // Wait for PDF generation
    await page.waitForSelector('[data-testid="pdf-viewer"]', { timeout: 30000 });
    console.log('✅ Step 5 Complete: PDF generated and displayed');

    // Show PDF in viewer (scroll through document)
    await page.waitForTimeout(2000);

    // Scroll through PDF preview
    const pdfViewer = page.locator('[data-testid="pdf-viewer"]');
    await pdfViewer.evaluate((el) => {
      el.scrollTop = 300;
    });
    await page.waitForTimeout(1500);

    await pdfViewer.evaluate((el) => {
      el.scrollTop = 600;
    });
    await page.waitForTimeout(1500);

    await pdfViewer.evaluate((el) => {
      el.scrollTop = 0;
    });

    console.log('✅ PDF preview displayed');

    // ==========================================
    // STEP 6: Download Resume
    // ==========================================
    console.log('📍 Step 6: Downloading resume...');

    // Click download button
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;

    console.log(`✅ Step 6 Complete: Resume downloaded as ${download.suggestedFilename()}`);

    // Final pause to show success
    await page.waitForTimeout(2000);

    // ==========================================
    // DEMO COMPLETE
    // ==========================================
    console.log('🎉 Product demo automation complete!');
  });
});
