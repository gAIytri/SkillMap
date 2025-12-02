# 🚨 URGENT: Frontend Still Using Old Railway Backend

## ❌ Current Problem

Your frontend (https://skillmap.gaiytri.com) is still trying to connect to the **OLD Railway backend**:
```
https://skillmap-production.up.railway.app
```

But you need it to use the **NEW Cloud Run backend**:
```
https://skillmap-backend-226300733226.us-central1.run.app
```

---

## ✅ Solution: Update Vercel Environment Variable

### Step 1: Go to Vercel Dashboard

Visit your Vercel project settings:
- Go to https://vercel.com/dashboard
- Select your **SkillMap** project
- Click **Settings** → **Environment Variables**

---

### Step 2: Update VITE_API_URL

Find the environment variable for your API URL (might be named one of these):
- `VITE_API_URL`
- `REACT_APP_API_URL`
- `NEXT_PUBLIC_API_URL`
- `API_URL`

**Change the value to**:
```
https://skillmap-backend-226300733226.us-central1.run.app
```

⚠️ **NO trailing slash!**

---

### Step 3: Redeploy Frontend

After updating the environment variable:

1. Go to **Deployments** tab in Vercel
2. Click the **3 dots** on the latest deployment
3. Click **Redeploy**

OR just push any commit to your main branch.

---

## 📋 Complete Environment Variables for Frontend

Your frontend should have:

```
VITE_API_URL=https://skillmap-backend-226300733226.us-central1.run.app
```

**For local development** (frontend/.env.local):
```
VITE_API_URL=http://localhost:8000
```

---

## 🧪 How to Verify It's Fixed

### After redeploying frontend:

1. Go to https://skillmap.gaiytri.com
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Try to sign up or login
5. Check the API calls - they should go to:
   ```
   https://skillmap-backend-226300733226.us-central1.run.app/api/...
   ```

   NOT to:
   ```
   https://skillmap-production.up.railway.app/api/...
   ```

---

## 🔍 How to Find Your API URL Variable Name

If you're not sure what your environment variable is called:

### Option 1: Check Frontend Code

Look in your frontend code for:
```javascript
// Common patterns:
import.meta.env.VITE_API_URL
process.env.REACT_APP_API_URL
process.env.NEXT_PUBLIC_API_URL
```

Search your frontend code for these patterns to find the variable name.

### Option 2: Check Existing Vercel Env Vars

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Look for any variable with "API" or "BACKEND" in the name
3. Update that one

---

## 🎯 Two Things You MUST Do Right Now

### 1. Fix Google OAuth Console ✅
👉 **https://console.cloud.google.com/apis/credentials?project=skillmap-prod-1764525602**

Add these to your OAuth Client:

**Authorized JavaScript origins**:
```
https://skillmap.gaiytri.com
http://localhost:5173
```

**Authorized redirect URIs**:
```
https://skillmap-backend-226300733226.us-central1.run.app/api/auth/google/callback
http://localhost:8000/api/auth/google/callback
```

Click **SAVE** and wait 5-10 minutes.

---

### 2. Update Vercel Environment Variable ✅
👉 **https://vercel.com/dashboard**

Update your API URL to:
```
https://skillmap-backend-226300733226.us-central1.run.app
```

Then **Redeploy** your frontend.

---

## ⏱️ Timeline

1. **Now**: Update Google OAuth Console (wait 5-10 min after saving)
2. **Now**: Update Vercel environment variable
3. **Now**: Redeploy frontend in Vercel
4. **Wait 2-3 minutes**: For Vercel deployment to complete
5. **Test**: Try signing in with Google at https://skillmap.gaiytri.com

---

## 🐛 Still Having Issues?

### Clear Browser Cache
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Click "Empty Cache and Hard Reload"
```

### Try Incognito Mode
Test in a private/incognito window to avoid cached credentials.

### Check Network Tab
Look at the actual API calls being made - they should all go to Cloud Run, not Railway.

---

**Once you complete both steps above, everything should work!**
