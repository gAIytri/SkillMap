# SkillMap Production Deployment Guide

Complete step-by-step guide to deploy SkillMap to production with Neon PostgreSQL database.

---

## Prerequisites Checklist

- [ ] GitHub account (for deployment)
- [ ] Neon account (for PostgreSQL database)
- [ ] Railway/Render account (for backend hosting)
- [ ] Vercel/Netlify account (for frontend hosting)
- [ ] Stripe account with API keys
- [ ] OpenAI API key
- [ ] Google OAuth credentials

---

## Phase 1: Set Up Neon PostgreSQL Database

### Step 1.1: Create Neon Project
1. Go to https://neon.tech/
2. Sign up or log in
3. Click "Create Project"
4. Choose settings:
   - Project name: `skillmap-production`
   - Region: Choose closest to your users (e.g., `us-east-1`)
   - PostgreSQL version: 16 (latest)
5. Click "Create Project"

### Step 1.2: Get Database Connection String
1. Once created, go to your project dashboard
2. Click on "Connection Details"
3. Copy the connection string - it looks like:
   ```
   postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this securely - you'll need it for backend configuration

### Step 1.3: Test Database Connection (Local)
```bash
# From backend directory
cd backend

# Install psycopg2 if not already installed
pip install psycopg2-binary

# Test connection with Python
python -c "
import psycopg2
conn = psycopg2.connect('YOUR_NEON_CONNECTION_STRING_HERE')
print('✓ Database connection successful!')
conn.close()
"
```

---

## Phase 2: Migrate Database Schema to Neon

### Step 2.1: Update Backend .env for Neon
```bash
# Edit backend/.env
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Step 2.2: Run Database Migrations
```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Run the migration script to create all tables
python -c "
from config.database import engine, Base
from models.user import User
from models.project import Project
from models.credit_transaction import CreditTransaction

# Create all tables
Base.metadata.create_all(bind=engine)
print('✓ All tables created successfully!')
"
```

### Step 2.3: Verify Tables Created
```bash
# Connect to Neon database via their SQL Editor or use psql
psql "YOUR_NEON_CONNECTION_STRING_HERE"

# List all tables
\dt

# Expected output:
#  Schema |       Name            | Type  |  Owner
# --------+-----------------------+-------+---------
#  public | users                 | table | username
#  public | projects              | table | username
#  public | credit_transactions   | table | username
```

---

## Phase 3: Deploy Backend to Production

We'll use **Railway** for backend deployment (you can also use Render, Fly.io, etc.)

### Step 3.1: Prepare Backend for Deployment

#### Create requirements.txt
```bash
cd backend
pip freeze > requirements.txt
```

#### Create Procfile
```bash
# Create backend/Procfile
cat > Procfile << 'EOF'
web: uvicorn main:app --host 0.0.0.0 --port $PORT
EOF
```

#### Create runtime.txt (optional)
```bash
cat > runtime.txt << 'EOF'
python-3.11
EOF
```

### Step 3.2: Deploy to Railway

1. **Sign up for Railway**: https://railway.app/
2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your GitHub account
   - Select your SkillMap repository
   - Choose the `backend` directory as root

3. **Configure Environment Variables**:
   Click "Variables" and add all these:

   ```bash
   # Database
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

   # Security
   SECRET_KEY=sjnkx_hgEFwxCZMmno5kLHob52rmYjfTybqSCbjFDA4xEmzekxx6D66zHweASMeS
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=10080

   # OpenAI
   OPENAI_API_KEY=sk-proj-your-key-here
   OPENAI_MODEL=gpt-4o-2024-08-06

   # LangSmith (optional)
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=lsv2_pt_your-key-here
   LANGCHAIN_PROJECT=skillmap-prod

   # Stripe
   STRIPE_SECRET_KEY=sk_live_your-key-here  # Use LIVE keys for production
   STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
   STRIPE_SUCCESS_URL=https://your-frontend-url.vercel.app/profile?payment=success
   STRIPE_CANCEL_URL=https://your-frontend-url.vercel.app/profile?payment=cancelled

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # Credits System
   LOW_CREDIT_THRESHOLD=10.0
   MINIMUM_CREDITS_FOR_TAILOR=5.0

   # CORS - UPDATE THIS with your frontend URL
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```

4. **Deploy**:
   - Railway will auto-deploy
   - Wait for build to complete (5-10 minutes)
   - Get your backend URL: `https://your-app.railway.app`

5. **Test Backend**:
   ```bash
   curl https://your-app.railway.app/
   # Should return: {"message": "SkillMap API is running"}
   ```

---

## Phase 4: Deploy Frontend to Production

We'll use **Vercel** for frontend deployment.

### Step 4.1: Prepare Frontend for Deployment

#### Update frontend/.env.production
```bash
cd frontend

# Create .env.production
cat > .env.production << 'EOF'
VITE_API_URL=https://your-app.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EOF
```

### Step 4.2: Deploy to Vercel

1. **Sign up for Vercel**: https://vercel.com/
2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Project**:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variables**:
   Go to "Settings" → "Environment Variables":
   ```bash
   VITE_API_URL=https://your-app.railway.app
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

5. **Deploy**:
   - Click "Deploy"
   - Wait for build (2-3 minutes)
   - Get your frontend URL: `https://skillmap.vercel.app`

### Step 4.3: Update Backend CORS

Update Railway environment variables:
```bash
FRONTEND_URL=https://skillmap.vercel.app
```

Redeploy backend on Railway.

---

## Phase 5: Configure Production Services

### Step 5.1: Update Google OAuth Redirect URIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add Authorized JavaScript origins:
   ```
   https://skillmap.vercel.app
   ```
5. Add Authorized redirect URIs:
   ```
   https://skillmap.vercel.app
   https://skillmap.vercel.app/login
   ```

### Step 5.2: Configure Stripe Webhooks

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Switch to Live Mode** (toggle in top-right)
3. **Go to Developers → Webhooks**
4. **Add Endpoint**:
   - Endpoint URL: `https://your-app.railway.app/api/credits/webhook`
   - Description: "SkillMap Production Webhook"
   - Events to send:
     - `checkout.session.completed`
     - `payment_intent.payment_failed`
5. **Copy Webhook Signing Secret**:
   - It looks like: `whsec_xxxxxxxxxxxxx`
6. **Update Railway Environment**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx  # Use LIVE key
   ```
7. **Update Frontend URLs in Railway**:
   ```bash
   STRIPE_SUCCESS_URL=https://skillmap.vercel.app/profile?payment=success
   STRIPE_CANCEL_URL=https://skillmap.vercel.app/profile?payment=cancelled
   ```

### Step 5.3: Test Stripe Webhook

```bash
# Use Stripe CLI to test webhook
stripe listen --forward-to https://your-app.railway.app/api/credits/webhook

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

---

## Phase 6: Production Testing Checklist

### Test 1: User Registration & Login
- [ ] Register new user with email/password
- [ ] Log in with email/password
- [ ] Log in with Google OAuth
- [ ] Verify user receives 50 free credits on registration

### Test 2: Resume Upload & Processing
- [ ] Upload DOCX resume
- [ ] Upload PDF resume
- [ ] Upload image resume (JPG/PNG)
- [ ] Verify extraction works correctly
- [ ] Verify PDF preview loads

### Test 3: Resume Tailoring
- [ ] Create new project
- [ ] Paste job description
- [ ] Click "Tailor Resume"
- [ ] Verify credits are deducted correctly
- [ ] Verify agent messages stream in real-time
- [ ] Verify resume is tailored
- [ ] Verify cover letter is generated
- [ ] Verify email is generated

### Test 4: Credits System
- [ ] Check credit balance in navbar
- [ ] Check credit balance in profile
- [ ] View transaction history
- [ ] Try to tailor with insufficient credits (should show recharge dialog)

### Test 5: Stripe Payment Flow
- [ ] Click "Recharge Credits"
- [ ] Select a credit package
- [ ] Complete Stripe checkout (use test card: 4242 4242 4242 4242)
- [ ] Verify redirect back to profile with success message
- [ ] Verify credits are added to account
- [ ] Verify transaction appears in history

### Test 6: Project Management
- [ ] View all projects in dashboard
- [ ] Open project editor
- [ ] Edit resume JSON
- [ ] Download PDF
- [ ] Download DOCX
- [ ] Delete project

### Test 7: Error Handling
- [ ] Try to access protected route without login (should redirect)
- [ ] Try to tailor with invalid job description
- [ ] Try to upload unsupported file format
- [ ] Verify error boundary catches crashes gracefully
- [ ] Navigate away during upload (verify request is cancelled)

---

## Phase 7: Post-Deployment Configuration

### Update Database Constraints
```bash
# Connect to Neon database
psql "YOUR_NEON_CONNECTION_STRING_HERE"

# Add indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

# Verify indexes
\di
```

### Enable Database Backups (Neon)
1. Go to Neon dashboard
2. Navigate to "Backups" tab
3. Enable automatic daily backups
4. Set retention period (7-30 days recommended)

---

## Phase 8: Monitoring & Maintenance

### Set Up Monitoring

#### Railway Monitoring
- Enable Railway metrics dashboard
- Set up alerts for:
  - CPU usage > 80%
  - Memory usage > 80%
  - Error rate > 5%

#### Vercel Monitoring
- Enable Vercel Analytics
- Monitor:
  - Page load times
  - Core Web Vitals
  - Error tracking

#### Stripe Monitoring
- Enable email notifications for:
  - Failed payments
  - Webhook failures
  - Disputes

#### LangSmith Monitoring (Optional)
- Monitor LLM costs
- Track token usage
- Analyze agent performance

---

## Rollback Plan

If something goes wrong:

### Backend Rollback
1. Go to Railway dashboard
2. Navigate to "Deployments"
3. Click on previous successful deployment
4. Click "Redeploy"

### Frontend Rollback
1. Go to Vercel dashboard
2. Navigate to "Deployments"
3. Click on previous successful deployment
4. Click "Promote to Production"

### Database Rollback
1. Go to Neon dashboard
2. Navigate to "Backups"
3. Select backup before issue occurred
4. Click "Restore"

---

## Environment Variables Summary

### Backend (Railway)
```bash
# Database
DATABASE_URL=postgresql://...

# Security
SECRET_KEY=...
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-2024-08-06

# LangSmith
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=skillmap-prod

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=https://skillmap.vercel.app/profile?payment=success
STRIPE_CANCEL_URL=https://skillmap.vercel.app/profile?payment=cancelled

# Google OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...

# Credits
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0

# CORS
FRONTEND_URL=https://skillmap.vercel.app
```

### Frontend (Vercel)
```bash
VITE_API_URL=https://your-app.railway.app
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
```

---

## Common Issues & Solutions

### Issue: CORS errors in browser
**Solution**: Ensure `FRONTEND_URL` in Railway matches exact Vercel URL (no trailing slash)

### Issue: Stripe webhook not working
**Solution**:
1. Verify webhook secret in Railway env vars
2. Check webhook endpoint URL is correct
3. View webhook logs in Stripe dashboard

### Issue: Database connection timeout
**Solution**:
1. Check DATABASE_URL is correct
2. Verify Neon database is active (auto-suspends after inactivity)
3. Check connection pooling settings

### Issue: Google OAuth redirect error
**Solution**: Verify authorized redirect URIs in Google Console match exactly

### Issue: OpenAI rate limits
**Solution**:
1. Check your OpenAI usage limits
2. Consider upgrading to paid tier
3. Implement request queuing if needed

---

## Cost Estimation (Monthly)

### Free Tier (Testing)
- Neon: Free tier (512 MB storage, 0.5 GB RAM)
- Railway: $5 credit free per month
- Vercel: Free tier (100 GB bandwidth)
- **Total: ~$0-5/month**

### Production Tier (Low Traffic)
- Neon: ~$10/month (Pro plan)
- Railway: ~$20/month (Pro plan)
- Vercel: Free tier sufficient for <100GB bandwidth
- OpenAI: ~$20-50/month (depends on usage)
- Stripe: Free (pay per transaction: 2.9% + $0.30)
- **Total: ~$50-80/month**

---

## Next Steps After Deployment

1. **Set up custom domain** (optional):
   - Buy domain from Namecheap/GoDaddy
   - Configure DNS in Vercel
   - Update all OAuth redirect URIs

2. **Enable production optimizations**:
   - Enable Vercel Edge caching
   - Configure CDN for static assets
   - Optimize images with Vercel Image Optimization

3. **Set up CI/CD**:
   - Configure automatic deployments on git push
   - Add pre-deployment tests
   - Set up staging environment

4. **Marketing & Launch**:
   - Create landing page with features
   - Set up analytics (Google Analytics, PostHog)
   - Create documentation for users
   - Announce on social media

---

## Support & Resources

- **Neon Docs**: https://neon.tech/docs
- **Railway Docs**: https://docs.railway.app/
- **Vercel Docs**: https://vercel.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **FastAPI Deployment**: https://fastapi.tiangolo.com/deployment/

---

**Last Updated**: 2025-01-18
**Status**: Ready for Production Deployment
