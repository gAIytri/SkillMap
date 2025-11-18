# SkillMap Quick Start Guide

## 🚀 Run Locally (with Live Neon Database)

### Backend
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
uvicorn main:app --reload
```
**Runs on:** http://localhost:8000
**Database:** Neon PostgreSQL (LIVE - shared with production)

### Frontend
```bash
cd frontend
npm run dev
```
**Runs on:** http://localhost:5173

---

## 🌐 Production URLs

**Frontend:** https://skill-map-six.vercel.app
**Backend:** https://skillmap-production.up.railway.app
**Database:** Neon PostgreSQL (same as local)

---

## ⚙️ Configuration Files

### Backend (`backend/.env`)
- ✅ Already configured for LOCAL development
- ✅ Uses LIVE Neon database
- ✅ CORS allows localhost frontend
- **No changes needed for local dev!**

### Frontend
- **Local:** `frontend/.env` (points to localhost:8000)
- **Production:** `frontend/.env.production` (auto-used by Vercel)
- **Vite auto-selects** based on build mode

---

## 🔄 Deployment Workflow

### 1. Test Locally
```bash
# Run both backend + frontend locally
# Test your changes
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### 3. Auto-Deploy
- ✅ **Railway** auto-deploys backend (~2-5 min)
- ✅ **Vercel** auto-deploys frontend (~1-2 min)

---

## 🗄️ Database

**Neon PostgreSQL** is shared between:
- ✅ Local development (via .env)
- ✅ Production (via Railway env vars)

**Tables:**
- users
- projects
- credit_transactions
- base_resumes

**View:** https://console.neon.tech/

---

## 🐛 Common Issues

### Backend won't start
```bash
# Activate venv first
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend shows CORS error
- Check backend is running on port 8000
- Check `backend/.env` has `CORS_ORIGINS=http://localhost:5173`

### Database connection error
- Check `backend/.env` has correct Neon URL
- Verify Neon database is active (not suspended)

---

## 📦 Environment Variables

### Backend `.env` (Local)
```bash
DATABASE_URL=postgresql://...neon.tech/neondb     # LIVE Neon
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env` (Local)
```bash
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Frontend `.env.production` (Production)
```bash
VITE_API_URL=https://skillmap-production.up.railway.app
VITE_GOOGLE_CLIENT_ID=...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 📚 Documentation

- **Backend API Docs:** http://localhost:8000/docs (local)
- **Backend API Docs:** https://skillmap-production.up.railway.app/docs (production)
- **Full Deployment Guide:** See `DEPLOYMENT_GUIDE.md`

---

**Last Updated:** 2025-11-18
