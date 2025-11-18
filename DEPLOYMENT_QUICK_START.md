# Quick Start: Deploy SkillMap to Production

Follow these steps in order. Each step takes 5-10 minutes.

---

## Before You Start

Open these websites in tabs (you'll need them):
1. https://neon.tech/ (Database)
2. https://railway.app/ (Backend hosting)
3. https://vercel.com/ (Frontend hosting)
4. https://dashboard.stripe.com/ (Payments)
5. https://console.cloud.google.com/ (OAuth)

---

## Step 1: Create Neon Database (5 min)

1. Go to https://neon.tech/ → Sign up/Login
2. Click "Create Project"
3. Project name: `skillmap-production`
4. Region: `us-east-1`
5. Click "Create"
6. **COPY CONNECTION STRING** (save to notepad):
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Test Database & Migrate Schema (5 min)

```bash
# From your project root
cd backend

# Update .env with Neon connection string
# Replace the DATABASE_URL line with your Neon connection string

# Activate virtual environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Create database tables
python -c "
from config.database import engine, Base
from models.user import User
from models.project import Project
from models.credit_transaction import CreditTransaction
Base.metadata.create_all(bind=engine)
print('✓ Database tables created!')
"
```

**Expected output**: `✓ Database tables created!`

---

## Step 3: Prepare Backend for Deployment (3 min)

```bash
cd backend

# Generate requirements.txt
pip freeze > requirements.txt

# Create Procfile
echo "web: uvicorn main:app --host 0.0.0.0 --port \$PORT" > Procfile

# Verify files exist
ls -la | grep -E "(Procfile|requirements.txt)"
```

---

## Step 4: Deploy Backend to Railway (10 min)

1. Go to https://railway.app/ → Sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `SkillMap` repository
4. Root directory: `backend`
5. Click "Deploy"

**Add Environment Variables** (click "Variables" tab):

Copy ALL these variables (update the values):
```bash
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
SECRET_KEY=sjnkx_hgEFwxCZMmno5kLHob52rmYjfTybqSCbjFDA4xEmzekxx6D66zHweASMeS
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
OPENAI_API_KEY=YOUR_OPENAI_KEY
OPENAI_MODEL=gpt-4o-2024-08-06
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=YOUR_LANGSMITH_KEY
LANGCHAIN_PROJECT=skillmap-prod
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_temp
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
LOW_CREDIT_THRESHOLD=10.0
MINIMUM_CREDITS_FOR_TAILOR=5.0
FRONTEND_URL=http://localhost:3000
```

6. Click "Deploy" (wait 5-10 min)
7. **COPY YOUR BACKEND URL**: `https://skillmap-production.railway.app`

**Test backend**:
```bash
curl https://skillmap-production.railway.app/
# Should return: {"message": "SkillMap API is running"}
```

---

## Step 5: Deploy Frontend to Vercel (5 min)

```bash
# From project root
cd frontend

# Create production env file
cat > .env.production << 'EOF'
VITE_API_URL=https://skillmap-production.railway.app
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
EOF
```

1. Go to https://vercel.com/ → Sign up with GitHub
2. Click "Add New..." → "Project"
3. Import your `SkillMap` repository
4. Settings:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Add Environment Variables**:
   ```bash
   VITE_API_URL=https://skillmap-production.railway.app
   VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
   ```

6. Click "Deploy" (wait 2-3 min)
7. **COPY YOUR FRONTEND URL**: `https://skillmap-xxx.vercel.app`

---

## Step 6: Update Backend CORS (2 min)

Go back to Railway:
1. Click "Variables"
2. Update:
   ```bash
   FRONTEND_URL=https://skillmap-xxx.vercel.app
   STRIPE_SUCCESS_URL=https://skillmap-xxx.vercel.app/profile?payment=success
   STRIPE_CANCEL_URL=https://skillmap-xxx.vercel.app/profile?payment=cancelled
   ```
3. Backend will auto-redeploy

---

## Step 7: Configure Google OAuth (3 min)

1. Go to https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized JavaScript origins**:
   ```
   https://skillmap-xxx.vercel.app
   ```
5. Add to **Authorized redirect URIs**:
   ```
   https://skillmap-xxx.vercel.app
   https://skillmap-xxx.vercel.app/login
   ```
6. Save

---

## Step 8: Configure Stripe Webhook (5 min)

1. Go to https://dashboard.stripe.com/
2. Switch to **Live Mode** (toggle top-right)
3. Developers → Webhooks → "Add endpoint"
4. Endpoint URL: `https://skillmap-production.railway.app/api/credits/webhook`
5. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
6. Add endpoint
7. **COPY the Webhook Signing Secret**: `whsec_xxxxx`

8. Update Railway Variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_SECRET_KEY=sk_live_xxxxx  # Use LIVE key for production
   ```

---

## Step 9: Final Test (10 min)

Open your frontend: `https://skillmap-xxx.vercel.app`

### Test Checklist:
- [ ] Register new account → Should get 50 credits
- [ ] Login with Google → Should work
- [ ] Upload resume → Should extract and show preview
- [ ] Create project → Should work
- [ ] Tailor resume with job description → Should stream messages
- [ ] Check credits deducted → Should show in navbar
- [ ] Click "Recharge Credits" → Should open Stripe checkout
- [ ] Complete payment (use test card: 4242 4242 4242 4242) → Should redirect back with success
- [ ] Check credits added → Should update

---

## Troubleshooting

### Backend returns 500 error
```bash
# Check Railway logs
# Go to Railway dashboard → Deployments → View Logs
# Look for errors
```

### Frontend can't connect to backend
```bash
# Check browser console
# Verify VITE_API_URL is correct
# Check CORS settings in Railway FRONTEND_URL
```

### Stripe webhook not working
```bash
# Go to Stripe Dashboard → Developers → Webhooks
# Check webhook logs for errors
# Verify webhook secret is correct in Railway
```

### Database connection error
```bash
# Verify DATABASE_URL is correct
# Check Neon database is active (it auto-suspends after inactivity)
# Go to Neon dashboard → should say "Active"
```

---

## Success Criteria

You know it's working when:
1. ✅ Backend URL returns: `{"message": "SkillMap API is running"}`
2. ✅ Frontend loads without errors
3. ✅ You can register/login
4. ✅ You can upload and process a resume
5. ✅ You can tailor a resume (credits deducted)
6. ✅ You can purchase credits via Stripe
7. ✅ Credits appear in account after payment

---

## What's Next?

After successful deployment:

1. **Custom Domain** (optional):
   - Buy domain from Namecheap
   - Configure in Vercel settings
   - Update all OAuth redirect URIs

2. **Monitoring**:
   - Enable Railway metrics
   - Enable Vercel Analytics
   - Set up Stripe email notifications

3. **Backups**:
   - Enable Neon automatic backups
   - Set retention to 7 days

4. **Launch**:
   - Share with beta users
   - Collect feedback
   - Iterate!

---

## Need Help?

- Check DEPLOYMENT_GUIDE.md for detailed instructions
- Check Railway logs for backend errors
- Check Vercel logs for frontend errors
- Check Stripe dashboard for payment issues
- Check Neon dashboard for database issues

---

**Estimated Total Time**: 45-60 minutes
**Cost**: Free tier for testing, ~$50-80/month for production

Good luck! 🚀
