# Background Jobs

This directory contains background jobs for the SkillMap application.

## Cleanup Unverified Users Job

**File:** `cleanup_unverified_users.py`

**Purpose:** Automatically deletes user accounts that have not verified their email within 30 days.

**What it does:**
- Finds users where `email_verified = False`
- Checks if account was created more than 30 days ago
- Deletes those accounts from the database
- Logs all deletions for audit purposes

---

## Running the Job

### Option 1: Manual Execution (Testing)

```bash
# From backend directory
python -m jobs.cleanup_unverified_users
```

### Option 2: Cron Job (Linux/Mac Production)

Add to crontab to run daily at 3 AM:

```bash
# Open crontab editor
crontab -e

# Add this line (adjust paths as needed)
0 3 * * * cd /path/to/backend && /path/to/venv/bin/python -m jobs.cleanup_unverified_users >> /var/log/cleanup_users.log 2>&1
```

**Breakdown:**
- `0 3 * * *` - Run at 3:00 AM every day
- `cd /path/to/backend` - Navigate to backend directory
- `/path/to/venv/bin/python` - Use virtual environment Python
- `-m jobs.cleanup_unverified_users` - Run the cleanup module
- `>> /var/log/cleanup_users.log 2>&1` - Log output to file

### Option 3: APScheduler (Recommended for Development)

Install APScheduler:
```bash
pip install apscheduler
```

Add to `main.py` lifespan startup:

```python
from apscheduler.schedulers.background import BackgroundScheduler
from jobs.cleanup_unverified_users import run_cleanup_job

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting SkillMap API...")
    init_db()

    # Start background scheduler
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_cleanup_job,
        'cron',
        hour=3,  # Run at 3 AM
        minute=0,
        id='cleanup_unverified_users',
        replace_existing=True
    )
    scheduler.start()
    print("✅ Background jobs scheduled")

    yield

    # Shutdown
    scheduler.shutdown()
    print("👋 Shutting down...")
```

### Option 4: systemd Timer (Linux Production)

Create service file: `/etc/systemd/system/cleanup-users.service`
```ini
[Unit]
Description=Cleanup Unverified Users
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/python -m jobs.cleanup_unverified_users
StandardOutput=journal
StandardError=journal
```

Create timer file: `/etc/systemd/system/cleanup-users.timer`
```ini
[Unit]
Description=Run Cleanup Unverified Users Daily

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable cleanup-users.timer
sudo systemctl start cleanup-users.timer

# Check status
sudo systemctl status cleanup-users.timer
```

---

## Monitoring

### Check Logs

**Manual execution:**
```bash
python -m jobs.cleanup_unverified_users
```

**Cron logs:**
```bash
tail -f /var/log/cleanup_users.log
```

**systemd logs:**
```bash
journalctl -u cleanup-users.service -f
```

### Expected Output

```
2025-11-29 03:00:00 - INFO - 🚀 Starting unverified users cleanup job...
2025-11-29 03:00:00 - INFO - 🧹 Found 3 unverified users older than 30 days
2025-11-29 03:00:00 - DEBUG -    Deleting: test@example.com (created: 2025-10-15 10:30:00)
2025-11-29 03:00:00 - DEBUG -    Deleting: fake@test.com (created: 2025-10-20 14:22:00)
2025-11-29 03:00:00 - DEBUG -    Deleting: old@user.com (created: 2025-10-25 09:15:00)
2025-11-29 03:00:00 - INFO - ✅ Successfully deleted 3 unverified users
2025-11-29 03:00:00 - INFO - 🏁 Cleanup job completed. Deleted 3 users.
```

---

## Configuration

### Change Retention Period

Edit `cleanup_unverified_users.py`:

```python
# Current: 30 days
cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)

# Change to 7 days:
cutoff_date = datetime.now(timezone.utc) - timedelta(days=7)

# Change to 60 days:
cutoff_date = datetime.now(timezone.utc) - timedelta(days=60)
```

### Change Schedule

**Cron examples:**
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Weekly (Sunday 3 AM): `0 3 * * 0`
- Monthly (1st day, 3 AM): `0 3 1 * *`

---

## Safety Features

1. **Only deletes unverified users** - Verified users are never touched
2. **30-day grace period** - Users have a full month to verify
3. **Logging** - All deletions are logged for audit trail
4. **Transaction safety** - Uses database transactions with rollback on error
5. **Dry-run testing** - Can be tested manually before scheduling

---

## Troubleshooting

### Job not running
1. Check cron status: `systemctl status cron` (Linux) or `sudo launchctl list | grep cron` (Mac)
2. Check timer status: `systemctl status cleanup-users.timer`
3. Check logs for errors
4. Verify Python path is correct
5. Ensure virtual environment is activated in the command

### No users deleted
- Check if there are any unverified users: `SELECT COUNT(*) FROM users WHERE email_verified = false AND created_at < NOW() - INTERVAL '30 days';`
- Verify database connection in job
- Check logs for errors

### Permission errors
- Ensure user running the job has database access
- Check file permissions on job script
- Verify log file write permissions
