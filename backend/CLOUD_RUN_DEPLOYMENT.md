# SkillMap Backend - Google Cloud Run Deployment Guide

This guide will walk you through deploying your FastAPI backend from Railway to Google Cloud Run.

---

## 🎯 Why Cloud Run?

- ✅ **FREE for your usage** (2M requests/month free)
- ✅ **Faster** than Railway's hobby tier
- ✅ **Auto-scaling** - handles traffic spikes
- ✅ **Pay only for what you use**
- ✅ **$300 Google Cloud credits** to get started

---

## 📋 Prerequisites

- ✅ Dockerfile (already created!)
- ✅ Google Cloud account with $300 credits
- ✅ Your current Railway environment variables

---

## 🚀 Step 1: Install Google Cloud CLI

### For macOS (using Homebrew):

```bash
# Install gcloud CLI
brew install --cask google-cloud-sdk

# Verify installation
gcloud version
```

### Alternative - Download Installer:

If you don't have Homebrew, download from:
https://cloud.google.com/sdk/docs/install

---

## 🔐 Step 2: Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# This will open a browser window - login with your Google account
# Select the account with the $300 credits
```

---

## 🏗️ Step 3: Setup Google Cloud Project

```bash
# Create a new project (or use existing)
gcloud projects create skillmap-production --name="SkillMap Production"

# Set as active project
gcloud config set project skillmap-production

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

---

## 📦 Step 4: Deploy to Cloud Run

From your backend directory:

```bash
cd /Users/sidharthraj/Gaiytri\ projects/SkillMap/backend

# Deploy to Cloud Run (this will build and deploy in one command)
gcloud run deploy skillmap-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0
```

**What this does:**
- `--source .` → Builds Docker image from current directory
- `--platform managed` → Uses fully managed Cloud Run
- `--region us-central1` → FREE tier region
- `--allow-unauthenticated` → Public API (needed for your frontend)
- `--memory 1Gi` → 1GB RAM (enough for FastAPI)
- `--cpu 1` → 1 vCPU
- `--timeout 300` → 5 minute timeout (for doc generation)
- `--max-instances 10` → Scale up to 10 containers
- `--min-instances 0` → Scale to zero when not used (FREE!)

**This will take 5-10 minutes** to build and deploy.

---

## 🔧 Step 5: Set Environment Variables

After deployment, set your environment variables:

```bash
# Get your DATABASE_URL from Railway
# (Settings → Variables → DATABASE_URL)

# Set all required environment variables
gcloud run services update skillmap-backend \
  --region us-central1 \
  --update-env-vars "\
DATABASE_URL=postgresql://user:pass@host:5432/dbname,\
SECRET_KEY=your-secret-key-from-railway,\
JWT_ALGORITHM=HS256,\
JWT_EXPIRATION_MINUTES=1440,\
GOOGLE_CLIENT_ID=your-google-client-id,\
GOOGLE_CLIENT_SECRET=your-google-client-secret,\
GOOGLE_REDIRECT_URI=https://skillmap-backend-xxx.run.app/api/auth/google/callback,\
CORS_ORIGINS=https://skillmap.gaiytri.com,https://gaiytri.com,\
MAX_UPLOAD_SIZE=10485760,\
STORAGE_TYPE=local"
```

**IMPORTANT:** Replace the values with your actual credentials from Railway!

---

## 🌐 Step 6: Get Your Cloud Run URL

After deployment completes, you'll see output like:

```
Service [skillmap-backend] revision [skillmap-backend-00001-abc] has been deployed
Service URL: https://skillmap-backend-abcd1234-uc.a.run.app
```

**Save this URL!** This is your new backend URL.

Or get it anytime with:

```bash
gcloud run services describe skillmap-backend \
  --region us-central1 \
  --format='value(status.url)'
```

---

## 🎨 Step 7: Setup Custom Domain (Optional but Professional)

Instead of the ugly Cloud Run URL, use a custom subdomain:

### Option A: api.gaiytri.com (Recommended)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service skillmap-backend \
  --domain api.gaiytri.com \
  --region us-central1
```

Then add DNS records as shown by the command output.

### Option B: api.skillmap.gaiytri.com

```bash
gcloud run domain-mappings create \
  --service skillmap-backend \
  --domain api.skillmap.gaiytri.com \
  --region us-central1
```

---

## 🔄 Step 8: Update Frontend Environment Variables

### In Vercel (SkillMap Frontend):

1. Go to your SkillMap project in Vercel
2. Settings → Environment Variables
3. Update `VITE_API_URL` (or similar):
   ```
   VITE_API_URL=https://skillmap-backend-xxx.run.app
   # OR if using custom domain:
   VITE_API_URL=https://api.gaiytri.com
   ```
4. Redeploy frontend

---

## ✅ Step 9: Test Your Deployment

### Test Backend Health:

```bash
# Get your Cloud Run URL
BACKEND_URL=$(gcloud run services describe skillmap-backend --region us-central1 --format='value(status.url)')

# Test health endpoint
curl $BACKEND_URL/health

# Should return: {"status": "healthy"} or similar
```

### Test from Frontend:

1. Visit https://skillmap.gaiytri.com
2. Try logging in
3. Create/tailor a resume
4. Check browser console for any errors

---

## 💰 Step 10: Monitor Usage & Costs

### Check Current Costs:

```bash
# View Cloud Run metrics
gcloud run services describe skillmap-backend \
  --region us-central1

# Or visit Cloud Console:
# https://console.cloud.google.com/run
```

### View Billing:

Visit: https://console.cloud.google.com/billing

**Expected Cost for Low Traffic:**
- Under 2M requests/month: **$0**
- 100 active users: **~$2-5/month**
- 1000 active users: **~$10-20/month**

Much cheaper than Railway! 🎉

---

## 🔄 Step 11: Setup Auto-Deploy from GitHub (Optional)

### Connect GitHub for Auto-Deploy:

1. Go to https://console.cloud.google.com/run
2. Click your service "skillmap-backend"
3. Click "SET UP CONTINUOUS DEPLOYMENT"
4. Connect GitHub repository
5. Select branch (main)
6. Every push to main will auto-deploy!

---

## 🛠️ Common Commands

### View Logs:

```bash
# Live tail logs
gcloud run services logs tail skillmap-backend --region us-central1

# View recent logs
gcloud run services logs read skillmap-backend --region us-central1 --limit 50
```

### Redeploy (after code changes):

```bash
cd /Users/sidharthraj/Gaiytri\ projects/SkillMap/backend

gcloud run deploy skillmap-backend \
  --source . \
  --region us-central1
```

### Update Environment Variable:

```bash
gcloud run services update skillmap-backend \
  --region us-central1 \
  --update-env-vars "NEW_VAR=value"
```

### Scale Settings:

```bash
# Increase max instances for high traffic
gcloud run services update skillmap-backend \
  --region us-central1 \
  --max-instances 20

# Set minimum instances (costs more, but faster cold starts)
gcloud run services update skillmap-backend \
  --region us-central1 \
  --min-instances 1
```

---

## 🐛 Troubleshooting

### Build Fails:

```bash
# Check build logs
gcloud builds list --limit 5

# View specific build
gcloud builds log BUILD_ID
```

### Service Won't Start:

```bash
# Check logs
gcloud run services logs tail skillmap-backend --region us-central1

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Port not matching (should use $PORT)
```

### Database Connection Issues:

Make sure your Railway Postgres allows external connections, or migrate to Cloud SQL.

---

## 📊 Performance Comparison

### Railway (Hobby):
- Cold start: ~5-10 seconds
- Response time: ~200-500ms
- Uptime: 99%

### Cloud Run:
- Cold start: ~2-5 seconds (with 0 min instances)
- Response time: ~50-150ms
- Uptime: 99.95%
- Instant: ~10-50ms (with 1 min instance)

---

## 💡 Pro Tips

1. **Set min-instances=1 for better UX** (costs ~$10/month but eliminates cold starts)
2. **Use Cloud SQL instead of Railway Postgres** for better integration
3. **Enable Cloud CDN** for faster static file serving
4. **Use Secret Manager** for sensitive environment variables
5. **Setup Monitoring** with Cloud Monitoring (included free)

---

## 🎉 Success Checklist

- [ ] gcloud CLI installed
- [ ] Authenticated with Google Cloud
- [ ] Project created and configured
- [ ] Backend deployed to Cloud Run
- [ ] Environment variables configured
- [ ] Custom domain setup (optional)
- [ ] Frontend updated with new backend URL
- [ ] End-to-end testing passed
- [ ] Railway service stopped (to save money)

---

## 🆘 Need Help?

- Cloud Run Docs: https://cloud.google.com/run/docs
- FastAPI + Cloud Run: https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-python-service
- Community: https://stackoverflow.com/questions/tagged/google-cloud-run

---

**Total Setup Time:** 30-60 minutes
**Monthly Cost:** $0-10 (vs $5-20 on Railway)
**Performance Improvement:** 2-5x faster
**Scalability:** Automatic (0 to millions of requests)

Let's deploy! 🚀
