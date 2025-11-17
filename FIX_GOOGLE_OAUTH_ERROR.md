# Fix Google OAuth Error: "Error 401: invalid_client"

## Problem
```
Access blocked: Authorization Error
Error 401: invalid_client
no registered origin
```

This error occurs because your frontend URL (`http://localhost:5173`) is not registered as an authorized origin in Google Cloud Console.

---

## Solution: Add Authorized Origins to Google Cloud Console

### Step 1: Go to Google Cloud Console

1. Open: https://console.cloud.google.com/
2. Sign in with your Google account (sidhrthkhandelwal@gmail.com)

### Step 2: Select Your Project

1. At the top of the page, click the **project dropdown**
2. Select the project that contains your OAuth credentials
   - If you don't remember the name, look for the project you created for SkillMap

### Step 3: Navigate to OAuth Credentials

1. In the left sidebar, go to: **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID in the list
   - It should have the ID: `794711125453-pedk3en9a0omarkghcrre0nd045grvo4`
   - Name might be something like "Web client" or "SkillMap Web"
3. Click on the **client ID name** to edit it

### Step 4: Add Authorized JavaScript Origins

In the "Authorized JavaScript origins" section, add:

```
http://localhost:5173
http://localhost:3000
http://127.0.0.1:5173
```

**Why these?**
- `http://localhost:5173` - Your Vite dev server (default)
- `http://localhost:3000` - Alternative frontend port
- `http://127.0.0.1:5173` - Localhost IP version

### Step 5: Add Authorized Redirect URIs

In the "Authorized redirect URIs" section, add:

```
http://localhost:8000/api/auth/google/callback
http://localhost:5173
http://localhost:3000
```

**Why these?**
- `http://localhost:8000/api/auth/google/callback` - Your backend callback
- `http://localhost:5173` - Frontend redirect
- `http://localhost:3000` - Alternative frontend redirect

### Step 6: Save Changes

1. Click **"SAVE"** at the bottom of the page
2. Wait 5-10 seconds for changes to propagate

### Step 7: Test Again

1. **Refresh** your browser page (`http://localhost:5173/login`)
2. Clear browser cache if needed (Ctrl+Shift+R or Cmd+Shift+R)
3. Click **"Continue with Google"** again
4. Should work now! ✅

---

## 🎯 Quick Reference

### Your OAuth Client ID:
```
794711125453-pedk3en9a0omarkghcrre0nd045grvo4.apps.googleusercontent.com
```

### URLs to Add:

**Authorized JavaScript origins:**
- `http://localhost:5173`
- `http://localhost:3000`
- `http://127.0.0.1:5173`

**Authorized redirect URIs:**
- `http://localhost:8000/api/auth/google/callback`
- `http://localhost:5173`
- `http://localhost:3000`

---

## 📸 Visual Guide

### Finding OAuth Credentials:
1. Google Cloud Console → **APIs & Services** → **Credentials**
2. Look for "OAuth 2.0 Client IDs" section
3. Click on your client ID name

### Adding Origins:
1. Scroll to "Authorized JavaScript origins"
2. Click **"+ ADD URI"**
3. Paste: `http://localhost:5173`
4. Click **"+ ADD URI"** again for more origins
5. Click **"SAVE"**

---

## 🚨 Common Issues

### Issue: "Still getting error after adding origins"
**Solution:**
- Wait 5-10 minutes for Google's cache to update
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito/private window
- Restart frontend dev server

### Issue: "Can't find my OAuth client in Google Cloud Console"
**Solution:**
- Check if you're in the correct Google Cloud project
- Look for project switcher at the top of the page
- If no OAuth client exists, you need to create one

### Issue: "Which Google account should I use?"
**Solution:**
- Use the same Google account that created the OAuth credentials
- If multiple accounts, try switching accounts in Google Cloud Console

---

## 🔐 Creating New OAuth Credentials (If Needed)

If you don't have OAuth credentials yet:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Name: "SkillMap Web Client"
5. Add the origins and redirect URIs listed above
6. Click **"CREATE"**
7. Copy the **Client ID** and **Client Secret**
8. Update your backend `.env`:
   ```
   GOOGLE_CLIENT_ID=<your-new-client-id>
   GOOGLE_CLIENT_SECRET=<your-new-client-secret>
   ```
9. Update your frontend `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=<your-new-client-id>
   ```

---

## ✅ Verification Checklist

After adding origins:
- [ ] Saved changes in Google Cloud Console
- [ ] Waited 5-10 seconds for propagation
- [ ] Refreshed browser page
- [ ] Cleared browser cache
- [ ] Clicked "Continue with Google"
- [ ] Google popup appears (no error)
- [ ] Can select Google account
- [ ] Redirected to dashboard

---

## 📞 Need More Help?

If still not working:
1. Check browser console for errors (F12 → Console tab)
2. Check backend logs for errors
3. Verify frontend `.env` has correct `VITE_GOOGLE_CLIENT_ID`
4. Verify backend `.env` has correct `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

---

**Quick Link:** https://console.cloud.google.com/apis/credentials

**Email for Console:** sidhrthkhandelwal@gmail.com
