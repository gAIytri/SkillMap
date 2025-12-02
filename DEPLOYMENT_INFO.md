# SkillMap Cloud Run Deployment Information

## 🌐 Deployment URLs

### Backend Service
- **Service URL**: https://skillmap-backend-226300733226.us-central1.run.app
- **API Documentation**: https://skillmap-backend-226300733226.us-central1.run.app/docs
- **Health Check**: https://skillmap-backend-226300733226.us-central1.run.app/health

### Google Cloud Project
- **Project ID**: skillmap-prod-1764525602
- **Project Number**: 226300733226
- **Region**: us-central1
- **Service Name**: skillmap-backend

---

## ✅ Completed Deployment Steps

1. ✅ Enabled billing on Google Cloud project
2. ✅ Enabled required APIs (Cloud Run, Cloud Build, Artifact Registry)
3. ✅ Configured service account permissions
4. ✅ Deployed backend to Cloud Run
5. ✅ Configured all environment variables
6. ✅ Verified deployment is working

---

## 📋 NEXT STEPS - ACTION REQUIRED

### 1. Update Frontend Environment Variable (Vercel)

Go to your Vercel dashboard and update the environment variable:

```
VITE_API_URL=https://skillmap-backend-226300733226.us-central1.run.app
```

**Steps:**
1. Go to Vercel dashboard
2. Select your SkillMap project
3. Settings → Environment Variables
4. Update `VITE_API_URL` with the new backend URL
5. Redeploy the frontend

---

### 2. Update Google OAuth Redirect URI

Go to Google Cloud Console and update OAuth settings:

**URL to add**:
```
https://skillmap-backend-226300733226.us-central1.run.app/api/auth/google/callback
```

**Steps:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add the above URL to "Authorized redirect URIs"
4. Save changes

---

### 3. Update Stripe Webhook (if using Stripe)

Update your Stripe webhook endpoint to:
```
https://skillmap-backend-226300733226.us-central1.run.app/api/credits/webhook
```

**Steps:**
1. Go to https://dashboard.stripe.com/webhooks
2. Select your webhook endpoint
3. Update the endpoint URL
4. Save changes

---

## 🚀 How to Deploy Latest Build (Every Time)

### Quick Deployment (Recommended)

Whenever you make changes to your backend code:

```bash
# 1. Navigate to backend directory
cd "/Users/sidharthraj/Gaiytri projects/SkillMap/backend"

# 2. Deploy to Cloud Run (builds and deploys automatically)
gcloud run deploy skillmap-backend \
  --source . \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

This will:
- Build a new Docker image from your current code
- Deploy the new version to Cloud Run
- Automatically route traffic to the new version
- Keep your environment variables intact

**Time**: 5-10 minutes per deployment

---

### Deployment with Updated Environment Variables

If you also need to update environment variables:

```bash
# 1. Navigate to backend directory
cd "/Users/sidharthraj/Gaiytri projects/SkillMap/backend"

# 2. Update .env.cloud-run.yaml with new values
# (edit the file: backend/.env.cloud-run.yaml)

# 3. Deploy with new environment variables
gcloud run deploy skillmap-backend \
  --source . \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --env-vars-file .env.cloud-run.yaml
```

---

### Quick One-Liner Deployment

For convenience, you can run this from the project root:

```bash
cd "/Users/sidharthraj/Gaiytri projects/SkillMap/backend" && gcloud run deploy skillmap-backend --source . --region us-central1 --project skillmap-prod-1764525602
```

---

## 🔧 Useful Management Commands

### View Live Logs
```bash
gcloud run services logs tail skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

### View Recent Logs
```bash
gcloud run services logs read skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --limit 100
```

### Check Service Status
```bash
gcloud run services describe skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

### List All Revisions
```bash
gcloud run revisions list \
  --service skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

### Update Single Environment Variable
```bash
gcloud run services update skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --update-env-vars "VAR_NAME=new_value"
```

### Scale Configuration
```bash
# Increase max instances for high traffic
gcloud run services update skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --max-instances 20

# Set minimum instances (eliminates cold starts, costs ~$10/month)
gcloud run services update skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --min-instances 1
```

---

## 🎯 Current Service Configuration

- **Memory**: 1GB
- **CPU**: 1 vCPU
- **Timeout**: 300 seconds (5 minutes)
- **Max Instances**: 10
- **Min Instances**: 0 (scales to zero when idle)
- **Concurrency**: Default (80 requests per container)
- **Authentication**: Allow unauthenticated (public API)

---

## 💰 Cost Monitoring

### View Current Costs
```bash
# Check service metrics
gcloud run services describe skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --format="table(status.traffic)"
```

### Billing Dashboard
Visit: https://console.cloud.google.com/billing

**Expected Costs**:
- **Free Tier**: 2M requests/month, 360,000 GB-seconds/month
- **Low Traffic (< 10k requests/month)**: $0 (within free tier)
- **Medium Traffic (100k requests/month)**: $2-5/month
- **High Traffic (1M requests/month)**: $10-20/month

---

## 🔄 Optional: Setup Auto-Deploy from GitHub

### Enable Continuous Deployment

1. Go to https://console.cloud.google.com/run
2. Click on "skillmap-backend" service
3. Click "SET UP CONTINUOUS DEPLOYMENT"
4. Connect your GitHub repository
5. Select branch: `main`
6. Configure build settings (use existing Dockerfile)
7. Save

**Result**: Every push to `main` branch will automatically deploy to Cloud Run!

---

## 🌐 Optional: Setup Custom Domain

Instead of the long Cloud Run URL, use a clean custom domain.

### Option 1: api.gaiytri.com

```bash
gcloud run domain-mappings create \
  --service skillmap-backend \
  --domain api.gaiytri.com \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

### Option 2: api.skillmap.gaiytri.com

```bash
gcloud run domain-mappings create \
  --service skillmap-backend \
  --domain api.skillmap.gaiytri.com \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

**After running the command**, you'll need to add DNS records at your domain registrar. The command will provide the exact DNS records to add.

---

## 📊 Environment Variables Configured

All environment variables are stored in:
`/Users/sidharthraj/Gaiytri projects/SkillMap/backend/.env.cloud-run.yaml`

**Configured variables**:
- ✅ DATABASE_URL (Neon PostgreSQL)
- ✅ SECRET_KEY
- ✅ JWT_ALGORITHM, JWT_EXPIRATION_MINUTES
- ✅ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
- ✅ CORS_ORIGINS
- ✅ MAX_UPLOAD_SIZE, STORAGE_TYPE
- ✅ OPENAI_API_KEY
- ✅ LANGCHAIN_TRACING_V2, LANGCHAIN_ENDPOINT, LANGCHAIN_API_KEY, LANGCHAIN_PROJECT
- ✅ STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- ✅ RESEND_API_KEY, FROM_EMAIL
- ✅ FRONTEND_URL

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check logs for errors
gcloud run services logs tail skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602
```

### Database Connection Issues
- Verify DATABASE_URL is correct in `.env.cloud-run.yaml`
- Check Neon database is accessible
- Verify password hasn't changed

### Build Fails
```bash
# Check build logs
gcloud builds list --project skillmap-prod-1764525602 --limit 5

# View specific build log
gcloud builds log BUILD_ID --project skillmap-prod-1764525602
```

### Environment Variable Issues
```bash
# View current environment variables
gcloud run services describe skillmap-backend \
  --region us-central1 \
  --project skillmap-prod-1764525602 \
  --format="value(spec.template.spec.containers[0].env)"
```

---

## 📝 Important Notes

1. **Always activate venv** before running migrations locally
2. **Environment variables** are separate from local `.env` file
3. **Deployments** take 5-10 minutes due to large dependencies (LaTeX, LibreOffice)
4. **Cold starts** may take 2-5 seconds if min-instances=0
5. **Database migrations** need to be run manually before deploying schema changes

---

## 🎉 Deployment Completed

**Date**: 2025-11-30
**Deployed By**: gaiytrillc@gmail.com
**Status**: ✅ Live and Running

**Test it**:
```bash
curl https://skillmap-backend-226300733226.us-central1.run.app/health
```

Expected response:
```json
{"status":"healthy"}
```
