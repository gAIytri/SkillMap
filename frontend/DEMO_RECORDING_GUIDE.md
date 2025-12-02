# SkillMap Product Demo Recording Guide

This guide will help you create a professional product demo video using **Playwright (FREE)** + **OBS Studio (FREE)**.

---

## 🎯 What You'll Create

A smooth, automated product demo showing:
1. ✅ User login
2. ✅ Profile overview
3. ✅ Project management
4. ✅ Resume tailoring with AI
5. ✅ PDF generation
6. ✅ Download resume

---

## 📦 Prerequisites

### 1. Install OBS Studio (FREE)
Download from: https://obsproject.com/download

### 2. Verify Playwright Installation
```bash
cd /Users/sidharthraj/Gaiytri\ projects/SkillMap/frontend
npx playwright --version
```

✅ Already installed! Version shown in terminal.

### 3. Setup Test User Account
Make sure you have a demo user account with:
- Email: `demo@skillmap.com`
- Password: `DemoPassword123!`
- Complete profile with experience, projects, etc.

**OR** Update the credentials in `tests/product-demo.spec.js`:
```javascript
const TEST_USER = {
  email: 'your-demo-email@example.com',
  password: 'YourPassword123!'
};
```

---

## 🎬 Recording Steps

### Step 1: Setup OBS Studio

1. **Open OBS Studio**

2. **Create a Scene:**
   - Click `+` under "Scenes"
   - Name it: "SkillMap Demo"

3. **Add Display Capture:**
   - Click `+` under "Sources"
   - Select "Display Capture"
   - Name it: "Screen"
   - Select your main display
   - Click OK

4. **Configure Settings (Optional but Recommended):**
   - Go to: `OBS → Settings → Video`
   - Base Resolution: 1920x1080
   - Output Resolution: 1920x1080
   - FPS: 30

   - Go to: `OBS → Settings → Output`
   - Output Mode: Simple
   - Video Bitrate: 2500 Kbps (higher = better quality)
   - Recording Format: mp4
   - Recording Quality: High Quality

5. **Set Recording Path:**
   - `Settings → Output → Recording Path`
   - Choose: `/Users/sidharthraj/Desktop/SkillMap_Demo.mp4`

---

### Step 2: Prepare Your Environment

1. **Start Backend Server:**
```bash
cd /Users/sidharthraj/Gaiytri\ projects/SkillMap/backend
source venv/bin/activate
uvicorn main:app --reload
```

2. **Start Frontend Server (New Terminal):**
```bash
cd /Users/sidharthraj/Gaiytri\ projects/SkillMap/frontend
npm run dev
```

3. **Verify both are running:**
   - Backend: http://localhost:8000
   - Frontend: http://localhost:5173

4. **Close unnecessary apps/windows** to reduce clutter

5. **Set your browser to full screen** (will help OBS capture cleanly)

---

### Step 3: Record the Demo

1. **In OBS Studio:**
   - Click "Start Recording" button

2. **Run Playwright Test (New Terminal):**
```bash
cd /Users/sidharthraj/Gaiytri\ projects/SkillMap/frontend

# Option A: Normal speed (fast automation)
npx playwright test tests/product-demo.spec.js --headed

# Option B: Slow motion (recommended for demo - 1 second delay per action)
npx playwright test tests/product-demo.spec.js --headed --slowmo=1000

# Option C: Very slow (2 seconds delay - best for narration)
npx playwright test tests/product-demo.spec.js --headed --slowmo=2000
```

3. **Watch the automation run** - Playwright will control the browser

4. **When test completes:**
   - Click "Stop Recording" in OBS Studio
   - Video saved to Desktop!

---

## 🎨 Editing the Video (FREE Tools)

### Option 1: DaVinci Resolve (Professional, FREE)
Download: https://www.blackmagicdesign.com/products/davinciresolve

**Features:**
- Professional video editing
- Speed ramping (speed up/slow down sections)
- Color correction
- Add text overlays
- Export in any format

**Quick Steps:**
1. Import your `SkillMap_Demo.mp4`
2. Drag to timeline
3. Cut/trim unwanted sections
4. Speed up slow sections:
   - Right-click clip → "Change Clip Speed"
   - Set to 150% or 200% for faster playback
5. Add titles/text overlays (optional)
6. Export: File → Deliver → MP4

---

### Option 2: iMovie (Mac, FREE)
Already on your Mac!

**Quick Steps:**
1. Open iMovie
2. Create New Movie
3. Import `SkillMap_Demo.mp4`
4. Drag to timeline
5. Speed up sections:
   - Select clip
   - Click speedometer icon
   - Choose "Fast" (2x, 4x, etc.)
6. Add titles if needed
7. Export: File → Share → File

---

## 🎯 Customization Tips

### Adjust Demo Speed

Edit `tests/product-demo.spec.js` and change `waitForTimeout` values:

```javascript
// Faster demo (reduce wait times)
await page.waitForTimeout(500);  // Instead of 2000

// Slower demo (increase wait times)
await page.waitForTimeout(3000); // Instead of 2000
```

### Customize Job Description

Update the sample job description in the test:

```javascript
const sampleJobDescription = `
YOUR CUSTOM JOB DESCRIPTION HERE
`;
```

### Add More Steps

Add additional actions in the test file:

```javascript
// Example: Show cover letter generation
await page.click('text=Cover Letter');
await page.waitForTimeout(2000);
```

---

## 🎬 Pro Tips for Great Demo Videos

### 1. **Clean Desktop**
   - Hide icons
   - Close unnecessary apps
   - Use a professional wallpaper

### 2. **Browser Setup**
   - Zoom to 100%
   - Hide bookmarks bar
   - Use incognito/private mode (clean state)

### 3. **Smooth Playback**
   - Close other apps to free up RAM
   - Disable notifications (Do Not Disturb mode)

### 4. **Multiple Takes**
   - Record 2-3 times
   - Pick the smoothest one
   - No pressure - it's automated!

### 5. **Add Narration Later**
   - Record video first
   - Add voiceover in DaVinci Resolve/iMovie
   - Easier than recording both together

### 6. **Background Music**
   - Add subtle background music in editing
   - Use royalty-free music from:
     - YouTube Audio Library (free)
     - Epidemic Sound
     - Artlist

---

## 📊 Recommended Video Specs for Web

- **Resolution:** 1920x1080 (Full HD)
- **Frame Rate:** 30 fps
- **Format:** MP4 (H.264)
- **Bitrate:** 5000-8000 Kbps
- **Length:** 2-4 minutes (keep it short!)

---

## 🚀 Quick Start Checklist

- [ ] OBS Studio installed
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Demo user account created with sample data
- [ ] Desktop cleaned up
- [ ] OBS recording configured
- [ ] Run Playwright test with `--headed --slowmo=1000`
- [ ] Stop OBS when done
- [ ] Edit video (trim, speed up slow parts)
- [ ] Export final MP4
- [ ] Upload to website! 🎉

---

## ❓ Troubleshooting

### Test fails with "element not found"
- Update selectors in `product-demo.spec.js` to match your actual UI
- Run `npx playwright codegen http://localhost:5173` to generate correct selectors

### OBS recording is laggy
- Lower video quality in OBS settings
- Close other apps
- Restart computer

### Video file is too large
- Reduce bitrate in OBS settings
- Compress video with HandBrake (free): https://handbrake.fr/

### Browser doesn't appear in automation
- Make sure you're using `--headed` flag
- Check that frontend server is running

---

## 🎯 Next Steps

1. **Record your first test run** to see how it looks
2. **Adjust timing** in the script if needed
3. **Re-record** until you're happy
4. **Edit** to perfection
5. **Add to your website!**

---

**Need Help?** Check the Playwright docs: https://playwright.dev/docs/intro

**Total Cost: $0** 🎉
