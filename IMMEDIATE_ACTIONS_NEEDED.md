# 🚨 IMMEDIATE ACTIONS NEEDED - Do These NOW

## ✅ What I Just Fixed For You

1. ✅ Updated Cloud Run with new Google OAuth credentials
2. ✅ Updated `frontend/.env.production` with new Cloud Run URL
3. ✅ Updated `frontend/.env.production` with new Google Client ID

---

## 🎯 What YOU Need to Do (2 Steps)

### Step 1: Fix Google OAuth Console (5 minutes)

👉 **Go here**: https://console.cloud.google.com/apis/credentials?project=skillmap-prod-1764525602

1. Click on OAuth Client ID: `226300733226-kgm3pcobcjdskraacfrfhlta4e47kv6u`
2. Scroll to **"Authorized JavaScript origins"**
3. Click **"+ ADD URI"** and add these (one at a time):
   ```
   https://skillmap.gaiytri.com
   http://localhost:5173
   ```
4. Scroll to **"Authorized redirect URIs"**
5. Click **"+ ADD URI"** and add these (one at a time):
   ```
   https://skillmap-backend-226300733226.us-central1.run.app/api/auth/google/callback
   http://localhost:8000/api/auth/google/callback
   ```
6. Click **SAVE** at the bottom
7. ⏱️ **Wait 5-10 minutes** for Google to propagate changes

---

### Step 2: Deploy Frontend to Vercel (2 minutes)

You have **TWO OPTIONS**:

#### Option A: Push to GitHub (Recommended)
```bash
cd "/Users/sidharthraj/Gaiytri projects/SkillMap"

git add .
git commit -m "Update backend URL to Cloud Run"
git push
```
Vercel will automatically deploy.

#### Option B: Redeploy in Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Select your SkillMap project
3. Go to **Deployments** tab
4. Click **3 dots** on latest deployment
5. Click **Redeploy**

---

## ⏱️ Timeline

| Time | Action | Status |
|------|--------|--------|
| **Now** | Update Google OAuth Console | ⏳ Your turn |
| **Now + 2 min** | Deploy frontend to Vercel | ⏳ Your turn |
| **Now + 5 min** | Frontend deployment completes | ⏳ Wait |
| **Now + 10 min** | Google OAuth changes propagate | ⏳ Wait |
| **Now + 10 min** | **Test everything!** | ⏳ Your turn |

---

## 🧪 How to Test (After 10 Minutes)

### Test 1: Check Frontend is Using New Backend

1. Go to https://skillmap.gaiytri.com
2. Open DevTools (F12)
3. Go to **Network** tab
4. Click "Sign Up" or "Login"
5. Check the requests - should go to:
   ```
   ✅ https://skillmap-backend-226300733226.us-central1.run.app/api/...
   ```
   NOT:
   ```
   ❌ https://skillmap-production.up.railway.app/api/...
   ```

### Test 2: Test Google OAuth

1. Clear browser cache or use **Incognito mode**
2. Go to https://skillmap.gaiytri.com
3. Click "Sign in with Google"
4. Should work without errors!

---

## 📋 Quick Reference

### New Backend URL (Cloud Run)
```
https://skillmap-backend-226300733226.us-central1.run.app
```

### New Google OAuth Client ID
```
226300733226-kgm3pcobcjdskraacfrfhlta4e47kv6u.apps.googleusercontent.com
```

### Google OAuth Console
```
https://console.cloud.google.com/apis/credentials?project=skillmap-prod-1764525602
```

### Vercel Dashboard
```
https://vercel.com/dashboard
```

---

## 🐛 Troubleshooting

### Still seeing Railway URL in network requests?

**Solution**: Frontend not deployed yet. Push to GitHub or redeploy in Vercel.

### Still getting "origin_mismatch" error?

**Solutions**:
1. Wait 5-10 minutes for Google OAuth changes to propagate
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try incognito mode
4. Double-check you added the URLs correctly in Google Console

### Still getting CORS errors?

**Solutions**:
1. Make sure frontend is deployed with new .env.production
2. Check backend CORS_ORIGINS includes your frontend URL
3. Wait a few minutes after deploying

---

## ✅ Checklist

Complete these in order:

- [ ] Step 1: Updated Google OAuth Console with authorized origins
- [ ] Step 1: Updated Google OAuth Console with redirect URIs
- [ ] Step 1: Clicked SAVE in Google Console
- [ ] Step 2: Deployed frontend (pushed to GitHub or redeployed in Vercel)
- [ ] Waited 10 minutes for changes to propagate
- [ ] Cleared browser cache / used incognito mode
- [ ] Tested: Frontend connects to Cloud Run backend (check Network tab)
- [ ] Tested: Google Sign In works without errors

---

## 🎉 When You're Done

Both errors will be fixed:
- ✅ No more "origin_mismatch" error
- ✅ No more CORS errors from Railway URL
- ✅ Everything connects to Cloud Run
- ✅ Google OAuth works perfectly

**Time needed**: ~15 minutes total (including wait time)

---

**All the files are updated and ready. Just do the 2 steps above and you're good to go!**
