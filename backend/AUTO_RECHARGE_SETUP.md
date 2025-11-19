# Auto-Recharge System Setup Guide

## Overview

The auto-recharge system automatically charges users when their credit balance falls below a threshold. This system is based on credit usage, not a recurring schedule.

## How It Works

1. **User Enables Auto-Recharge**: User toggles auto-recharge on the Profile page and selects a credit package
2. **First Purchase**: User makes a purchase with auto-recharge enabled, which saves their payment method in Stripe
3. **Background Monitoring**: A background job runs periodically checking for users with low credits
4. **Automatic Charging**: When credits fall below threshold (default: 10), the system automatically charges the saved payment method
5. **Bonus Credits**: Users get +20 bonus credits on every auto-recharge

## Database Setup

### Step 1: Run the Migration

Run the migration script to add auto-recharge fields to your Neon DB:

```bash
cd backend
python migrations/add_auto_recharge.py
```

This will add the following columns to the `users` table:
- `auto_recharge_enabled` (Boolean, default: False)
- `auto_recharge_credits` (Integer, nullable) - Which credit package to purchase
- `auto_recharge_threshold` (Float, default: 10.0) - Trigger threshold
- `stripe_customer_id` (String, nullable) - Stripe customer ID
- `stripe_payment_method_id` (String, nullable) - Saved payment method

### Step 2: Verify Migration

Check your Neon DB dashboard to confirm the new columns exist:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
    'auto_recharge_enabled',
    'auto_recharge_credits',
    'auto_recharge_threshold',
    'stripe_customer_id',
    'stripe_payment_method_id'
);
```

## Background Job Setup

The auto-recharge monitoring job is located at: `backend/jobs/auto_recharge_job.py`

### Option 1: Cron Job (Linux/Mac)

Add to your crontab:

```bash
# Run every hour
0 * * * * cd /path/to/SkillMap/backend && python jobs/auto_recharge_job.py >> /var/log/auto_recharge.log 2>&1

# Or run every 30 minutes
*/30 * * * * cd /path/to/SkillMap/backend && python jobs/auto_recharge_job.py >> /var/log/auto_recharge.log 2>&1
```

### Option 2: systemd Timer (Linux Production)

Create `/etc/systemd/system/auto-recharge.service`:

```ini
[Unit]
Description=SkillMap Auto-Recharge Job
After=network.target

[Service]
Type=oneshot
User=your-username
WorkingDirectory=/path/to/SkillMap/backend
ExecStart=/usr/bin/python3 /path/to/SkillMap/backend/jobs/auto_recharge_job.py
StandardOutput=journal
StandardError=journal
```

Create `/etc/systemd/system/auto-recharge.timer`:

```ini
[Unit]
Description=Run SkillMap Auto-Recharge Every Hour
Requires=auto-recharge.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=1h

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable auto-recharge.timer
sudo systemctl start auto-recharge.timer
sudo systemctl status auto-recharge.timer
```

### Option 3: Docker/Cloud Scheduler

For Docker deployments, use your cloud provider's scheduler:
- **AWS**: CloudWatch Events / EventBridge
- **Google Cloud**: Cloud Scheduler
- **Azure**: Azure Functions with Timer Trigger
- **Heroku**: Heroku Scheduler addon

### Option 4: APScheduler (In-Process)

For development or single-server deployments, add to your FastAPI app:

Create `backend/scheduler.py`:

```python
from apscheduler.schedulers.background import BackgroundScheduler
from jobs.auto_recharge_job import run_auto_recharge_job
import logging

logger = logging.getLogger(__name__)

def start_scheduler():
    """Start background scheduler for auto-recharge"""
    scheduler = BackgroundScheduler()

    # Run auto-recharge job every hour
    scheduler.add_job(
        run_auto_recharge_job,
        'interval',
        hours=1,
        id='auto_recharge_job',
        name='Auto-Recharge Monitoring Job',
        replace_existing=True
    )

    scheduler.start()
    logger.info("✓ Background scheduler started")

    return scheduler
```

Add to `main.py`:

```python
from scheduler import start_scheduler

@app.on_event("startup")
async def startup_event():
    start_scheduler()
```

## API Endpoints

### Get Auto-Recharge Settings
```
GET /api/credits/auto-recharge
```

Response:
```json
{
  "enabled": true,
  "credits": 100,
  "threshold": 10.0
}
```

### Update Auto-Recharge Settings
```
POST /api/credits/auto-recharge
```

Body:
```json
{
  "enabled": true,
  "credits": 100,
  "threshold": 10.0
}
```

### Create Checkout with Auto-Recharge
```
POST /api/credits/create-checkout-session
```

Body:
```json
{
  "credits": 100,
  "enable_auto_recharge": true
}
```

## How Users Enable Auto-Recharge

1. **Frontend**: User goes to Profile page → Recharge tab
2. **Toggle**: User enables the "Enable Auto-Recharge" toggle
3. **Select Package**: User selects a credit package (50, 100, 250, or 500 credits)
4. **Purchase**: User clicks "Get X Credits" button
5. **Stripe**: Stripe checkout saves their payment method with `setup_future_usage: 'off_session'`
6. **Webhook**: After successful payment:
   - User receives credits + 20 bonus credits
   - Auto-recharge is enabled in database
   - Payment method is saved
7. **Monitoring**: Background job monitors their credit balance
8. **Auto-Charge**: When credits < threshold, system automatically charges them

## Testing Auto-Recharge

### Test the Migration

```bash
python migrations/add_auto_recharge.py
```

Expected output:
```
INFO - Starting auto-recharge migration...
INFO - Adding 'auto_recharge_enabled' column to users table...
INFO - ✓ 'auto_recharge_enabled' column added successfully
...
INFO - ✓ Transaction committed successfully
INFO - ✅ Auto-recharge migration completed successfully!
```

### Test the Background Job

```bash
python jobs/auto_recharge_job.py
```

Expected output:
```
INFO - ================================================================================
INFO - Starting auto-recharge job...
INFO - Timestamp: 2025-11-19T...
INFO - ================================================================================
INFO - No users need auto-recharge at this time.
INFO - ================================================================================
```

### Test with Stripe Test Cards

Use Stripe test cards to test different scenarios:

**Successful Payment**:
```
Card: 4242 4242 4242 4242
Exp: Any future date
CVC: Any 3 digits
```

**Declined Card (insufficient funds)**:
```
Card: 4000 0000 0000 9995
```

**Card requires authentication**:
```
Card: 4000 0025 0000 3155
```

## Monitoring & Logs

### Check Job Logs

```bash
# If using cron
tail -f /var/log/auto_recharge.log

# If using systemd
journalctl -u auto-recharge -f

# If using Docker
docker logs -f <container_name> | grep auto-recharge
```

### Database Queries

**Users with auto-recharge enabled**:
```sql
SELECT id, email, auto_recharge_enabled, auto_recharge_credits,
       auto_recharge_threshold, credits
FROM users
WHERE auto_recharge_enabled = TRUE;
```

**Users needing auto-recharge**:
```sql
SELECT id, email, credits, auto_recharge_threshold, auto_recharge_credits
FROM users
WHERE auto_recharge_enabled = TRUE
  AND credits < auto_recharge_threshold
  AND stripe_customer_id IS NOT NULL
  AND stripe_payment_method_id IS NOT NULL;
```

**Recent auto-recharge transactions**:
```sql
SELECT u.email, ct.amount, ct.balance_after, ct.description, ct.created_at
FROM credit_transactions ct
JOIN users u ON ct.user_id = u.id
WHERE ct.description LIKE '%Auto-recharge%'
ORDER BY ct.created_at DESC
LIMIT 10;
```

## Troubleshooting

### Payment Method Not Saved

**Problem**: User enables auto-recharge but payment method is NULL

**Solution**:
- Check Stripe webhook is receiving events
- Verify `enable_auto_recharge` is being passed to checkout
- Check webhook logs for errors

### Auto-Recharge Not Triggering

**Problem**: User credits below threshold but not being charged

**Checklist**:
1. Is background job running?
2. Does user have `stripe_payment_method_id`?
3. Is `auto_recharge_enabled` = TRUE?
4. Are credits < threshold?

Check logs:
```bash
python jobs/auto_recharge_job.py
```

### Card Declined

**Problem**: Auto-recharge fails due to declined card

**Solution**:
- Send email notification to user (TODO in job)
- Consider disabling auto-recharge after 3 failures
- Log error for investigation

## Security Considerations

1. **PCI Compliance**: We never store card details - only Stripe payment method ID
2. **Off-Session Payments**: Properly configured with `off_session: true`
3. **Idempotency**: Uses `stripe_session_id` to prevent duplicate charges
4. **Database Locks**: Uses `with_for_update()` to prevent race conditions
5. **Error Handling**: All Stripe errors are caught and logged

## Production Checklist

- [ ] Run database migration on production Neon DB
- [ ] Configure background job (cron/scheduler)
- [ ] Test with Stripe test cards
- [ ] Monitor logs for first 24 hours
- [ ] Set up email notifications (optional)
- [ ] Configure alerting for job failures
- [ ] Test entire flow end-to-end
- [ ] Document for support team

## Future Enhancements

1. **Email Notifications**:
   - Successful auto-recharge
   - Failed payment
   - Payment method expiring soon

2. **Smart Threshold**:
   - Calculate based on usage patterns
   - Notify before auto-charging

3. **Multiple Payment Methods**:
   - Allow backup payment method
   - Retry with backup on failure

4. **Reporting**:
   - Admin dashboard for auto-recharge metrics
   - Revenue tracking

5. **Grace Period**:
   - Allow X days grace after failed payment
   - Multiple retry attempts with exponential backoff

## Support

For issues or questions:
1. Check logs first
2. Verify Stripe dashboard for payment details
3. Check database for user settings
4. Review this guide

## API Reference

All endpoints are in `backend/routers/credits.py`:
- Lines 280-305: GET /api/credits/auto-recharge
- Lines 308-370: POST /api/credits/auto-recharge
- Lines 184-293: POST /api/credits/create-checkout-session (with auto-recharge support)
- Lines 373-512: POST /api/credits/webhook (handles payment method saving)
