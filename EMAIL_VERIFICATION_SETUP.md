# Email Verification System - Setup Guide

## Overview
Professional email verification system with hybrid approach:
- **6-digit code** for manual entry
- **Magic link** for one-click verification
- **Resend functionality** with 60-second cooldown
- **Welcome email** after verification
- **Beautiful HTML email templates**

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
source venv/bin/activate  # Activate virtual environment
pip install resend==2.7.0
```

Or install all dependencies:
```bash
pip install -r requirements.txt
```

---

### 2. Get Resend API Key

1. Go to [https://resend.com](https://resend.com)
2. Sign up for free account (3000 emails/month free)
3. Navigate to **API Keys** section
4. Click **"Create API Key"**
5. Copy the API key (starts with `re_...`)

---

### 3. Configure Environment Variables

Add to `backend/.env`:

```bash
# Email Service (Resend)
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=SkillMap <onboarding@resend.dev>  # Use your verified domain

# Frontend URL (for magic links)
FRONTEND_URL=http://localhost:5173  # Local development
# FRONTEND_URL=https://skill-map-six.vercel.app  # Production
```

**Important Notes:**
- For production, verify your domain in Resend dashboard
- Until domain verified, use `onboarding@resend.dev` (Resend's test domain)
- Update `FRONTEND_URL` for production deployment

---

### 4. Run Database Migration

```bash
cd backend
source venv/bin/activate
python migrations/add_email_verification.py
```

**Expected Output:**
```
🔄 Starting migration: add_email_verification
  → Adding email_verified column...
  → Adding verification_token column...
  → Adding verification_token_expires column...
  → Adding verification_link_token column...
  → Creating index on verification_link_token...
  → Setting existing Google OAuth users as verified...
✅ Migration completed successfully!
```

**What This Does:**
- Adds `email_verified` column (default: False)
- Adds `verification_token` (6-digit code)
- Adds `verification_token_expires` (10-minute expiry)
- Adds `verification_link_token` (UUID for magic link)
- Sets existing Google OAuth users as verified
- Creates index for fast lookups

---

### 5. Restart Backend Server

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

---

## How It Works

### User Signup Flow

```
1. User signs up with email/password
   ↓
2. Backend generates:
   - 6-digit code (e.g., 123456)
   - Magic link token (UUID)
   - Expiry time (10 minutes)
   ↓
3. Email sent with BOTH:
   - Verification code displayed prominently
   - "Verify Email with One Click" button
   ↓
4. User can:
   Option A: Enter 6-digit code manually
   Option B: Click magic link (auto-verifies)
   ↓
5. Email verified ✅
   ↓
6. Welcome email sent with "100 FREE credits" message
   ↓
7. Redirect to /upload-resume
```

### Google OAuth Users
- **Automatically verified** (no email verification needed)
- `email_verified = True` on account creation

---

## API Endpoints

### POST /api/auth/verify-email
Verify email with 6-digit code

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully!",
  "email_verified": true
}
```

---

### GET /api/auth/verify-email/{token}
Verify email with magic link (auto-called when user clicks email link)

**Response:**
```json
{
  "message": "Email verified successfully!",
  "email_verified": true
}
```

---

### POST /api/auth/resend-verification
Resend verification email

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Verification email sent successfully!"
}
```

---

## Frontend Routes

- **/verify-email** - Manual code entry page
- **/verify-email/:token** - Magic link landing page (auto-verifies)

---

## Email Templates

### Verification Email
- **Subject:** "Verify your email - SkillMap"
- **Content:**
  - Welcome message with user's name
  - Large 6-digit code in gradient box
  - "Verify Email with One Click" button (magic link)
  - "OR" divider
  - Security notice
  - Expires in 10 minutes warning
  - Professional branding

### Welcome Email
- **Subject:** "🎉 Welcome to SkillMap!"
- **Content:**
  - Welcome message
  - "100 FREE credits" announcement
  - "Upload Your Resume" CTA button
  - Encouragement message

---

## Security Features

### Rate Limiting
- **Resend cooldown**: 60 seconds between requests
- **Max attempts**: Unlimited (code regenerates on each resend)

### Token Security
- **6-digit code**: Random (100000-999999)
- **Magic link token**: UUID v4 (unique, unpredictable)
- **Expiry**: 10 minutes for both code and link
- **One-time use**: Tokens deleted after successful verification
- **Database indexed**: Fast lookups, prevents timing attacks

### Email Validation
- Checks if user exists
- Checks if already verified
- Validates code matches
- Validates token not expired
- Clears all tokens after verification

---

## Testing

### Test Email Sending (Local)

```bash
cd backend
source venv/bin/activate
python
```

```python
from services import email_service

# Test verification email
email_service.send_verification_email(
    email="your-email@example.com",
    full_name="Test User",
    verification_code="123456",
    verification_link_token="test-token-uuid"
)

# Test welcome email
email_service.send_welcome_email(
    email="your-email@example.com",
    full_name="Test User"
)
```

---

### Test Complete Flow

1. **Sign Up**:
   ```
   - Go to http://localhost:5173
   - Click "Get Started Free"
   - Fill form and submit
   ```

2. **Check Email**:
   ```
   - Check inbox/spam for verification email
   - Should see 6-digit code + magic link button
   ```

3. **Verify (Option A - Code)**:
   ```
   - Enter 6-digit code on verification page
   - Should auto-verify when 6th digit entered
   - Redirects to /upload-resume
   ```

4. **Verify (Option B - Magic Link)**:
   ```
   - Click "Verify Email with One Click" in email
   - Opens browser with magic link
   - Auto-verifies and redirects to /upload-resume
   ```

5. **Check Welcome Email**:
   ```
   - Should receive welcome email with "100 FREE credits"
   ```

---

## Production Deployment

### Resend Domain Verification

1. Go to Resend Dashboard → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `skillmap.com`)
4. Add DNS records:
   ```
   TXT  @  resend._domainkey  [Resend provides value]
   ```
5. Verify domain (takes 1-5 minutes)
6. Update `.env`:
   ```bash
   FROM_EMAIL=SkillMap <noreply@skillmap.com>
   ```

### Environment Variables (Production)

```bash
# Backend (.env)
RESEND_API_KEY=re_your_production_key
FROM_EMAIL=SkillMap <noreply@yourdomain.com>
FRONTEND_URL=https://skill-map-six.vercel.app
```

### Railway Deployment

1. Add environment variables in Railway dashboard
2. Restart backend service
3. Run migration:
   ```bash
   railway run python migrations/add_email_verification.py
   ```

---

## Troubleshooting

### "Email not sent" Error

**Cause**: Invalid Resend API key or quota exceeded

**Solution**:
1. Check API key is correct in `.env`
2. Verify key is active in Resend dashboard
3. Check monthly quota (3000 free emails)
4. Restart backend after updating `.env`

---

### Email Goes to Spam

**Cause**: Using `onboarding@resend.dev` (test domain)

**Solution**:
1. Verify your own domain in Resend
2. Update `FROM_EMAIL` to your domain
3. Add SPF/DKIM records

---

### "Verification token expired"

**Cause**: Code/link older than 10 minutes

**Solution**:
1. Click "Resend Code" on verification page
2. Check email for new code
3. Enter new code within 10 minutes

---

### Migration Error: "Column already exists"

**Cause**: Migration already run

**Solution**:
```bash
# Safe to ignore if columns exist
# Or run rollback:
python migrations/add_email_verification.py downgrade
python migrations/add_email_verification.py
```

---

## Files Created/Modified

### Backend
- ✅ `models/user.py` - Added verification fields
- ✅ `migrations/add_email_verification.py` - Database migration
- ✅ `services/email_service.py` - Resend email integration
- ✅ `services/auth_service.py` - Updated signup to send verification
- ✅ `routers/auth.py` - Added verification endpoints
- ✅ `requirements.txt` - Added `resend==2.7.0`

### Frontend
- ✅ `pages/VerifyEmail.jsx` - Verification UI with 6-digit input
- ✅ `App.jsx` - Added verification routes
- ✅ `components/auth/SignupForm.jsx` - Redirect to verification
- ✅ `pages/Register.jsx` - Redirect to verification

---

## Support

**Need Help?**
- Check Resend docs: https://resend.com/docs
- Check migration logs for errors
- Verify environment variables are loaded
- Test email sending with Python script above

---

## Summary Checklist

- [ ] Install `resend` package
- [ ] Get Resend API key from resend.com
- [ ] Add `RESEND_API_KEY` to backend `.env`
- [ ] Add `FROM_EMAIL` to backend `.env`
- [ ] Run migration script
- [ ] Restart backend server
- [ ] Test signup flow
- [ ] Verify email received
- [ ] Test code entry
- [ ] Test magic link
- [ ] Check welcome email

---

**Status:** ✅ Ready for Testing!

**What to test:**
1. Email/password signup → verification email sent
2. Enter 6-digit code → email verified → welcome email
3. Click magic link → auto-verified → welcome email
4. Google OAuth signup → auto-verified (no email needed)
5. Resend code → new email with new code
