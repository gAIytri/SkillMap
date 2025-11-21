from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from datetime import datetime, timedelta
from typing import Optional

from config.database import get_db
from schemas.admin import AdminCreate, AdminLogin, AdminToken, UpdateUserCredits
from services.admin_auth_service import AdminAuthService
from middleware.admin_auth_middleware import get_current_admin, get_current_super_admin
from models.admin import Admin
from models.user import User
from models.project import Project
from models.credit_transaction import CreditTransaction, TransactionType

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@router.post("/register", response_model=AdminToken, status_code=status.HTTP_201_CREATED)
async def register_admin(
    admin_data: AdminCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_super_admin)  # Only super admins can create new admins
):
    """Register a new admin (requires super admin privileges)"""
    admin = AdminAuthService.create_admin(db, admin_data)
    return AdminAuthService.create_token_response(admin)


@router.post("/login", response_model=AdminToken)
async def login_admin(credentials: AdminLogin, db: Session = Depends(get_db)):
    """Admin login with email and password"""
    admin = AdminAuthService.authenticate_admin(db, credentials)

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    return AdminAuthService.create_token_response(admin)


@router.get("/me")
async def get_current_admin_info(current_admin: Admin = Depends(get_current_admin)):
    """Get current admin information"""
    return {
        "id": current_admin.id,
        "email": current_admin.email,
        "full_name": current_admin.full_name,
        "is_super_admin": current_admin.is_super_admin,
        "is_active": current_admin.is_active,
        "last_login": current_admin.last_login
    }


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

def parse_date_range(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    preset: Optional[str] = None
) -> tuple[Optional[datetime], Optional[datetime]]:
    """Parse date range from query parameters"""
    if preset:
        end = datetime.utcnow()
        if preset == "7d":
            start = end - timedelta(days=7)
        elif preset == "30d":
            start = end - timedelta(days=30)
        elif preset == "90d":
            start = end - timedelta(days=90)
        else:
            start = None
    else:
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None

    return start, end


@router.get("/analytics/users")
async def get_user_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    preset: Optional[str] = Query(None, regex="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get user analytics data"""
    start, end = parse_date_range(start_date, end_date, preset)

    # Total users
    total_users_query = db.query(func.count(User.id))
    if start:
        total_users_query = total_users_query.filter(User.created_at >= start)
    if end:
        total_users_query = total_users_query.filter(User.created_at <= end)
    total_users = total_users_query.scalar()

    # New users over time (grouped by day)
    new_users_query = db.query(
        func.date(User.created_at).label("date"),
        func.count(User.id).label("count")
    )
    if start:
        new_users_query = new_users_query.filter(User.created_at >= start)
    if end:
        new_users_query = new_users_query.filter(User.created_at <= end)
    new_users_over_time = new_users_query.group_by(func.date(User.created_at)).all()

    # Active users (users who tailored in last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    active_users = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        and_(
            CreditTransaction.transaction_type == TransactionType.TAILOR,
            CreditTransaction.created_at >= thirty_days_ago
        )
    ).scalar()

    # User growth rate (percentage change from previous period)
    if start and end:
        period_length = (end - start).days
        previous_start = start - timedelta(days=period_length)
        previous_end = start

        current_period_users = db.query(func.count(User.id)).filter(
            and_(User.created_at >= start, User.created_at <= end)
        ).scalar()

        previous_period_users = db.query(func.count(User.id)).filter(
            and_(User.created_at >= previous_start, User.created_at < previous_end)
        ).scalar()

        growth_rate = ((current_period_users - previous_period_users) / previous_period_users * 100) if previous_period_users > 0 else 0
    else:
        growth_rate = 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "growth_rate": round(growth_rate, 2),
        "new_users_over_time": [
            {"date": str(date), "count": count}
            for date, count in new_users_over_time
        ]
    }


@router.get("/analytics/tokens")
async def get_token_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    preset: Optional[str] = Query(None, regex="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get token usage analytics"""
    start, end = parse_date_range(start_date, end_date, preset)

    # Total tokens consumed
    total_tokens_query = db.query(func.sum(CreditTransaction.tokens_used)).filter(
        CreditTransaction.tokens_used.isnot(None)
    )
    if start:
        total_tokens_query = total_tokens_query.filter(CreditTransaction.created_at >= start)
    if end:
        total_tokens_query = total_tokens_query.filter(CreditTransaction.created_at <= end)
    total_tokens = total_tokens_query.scalar() or 0

    # Average tokens per user
    users_with_token_usage = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        CreditTransaction.tokens_used.isnot(None)
    )
    if start:
        users_with_token_usage = users_with_token_usage.filter(CreditTransaction.created_at >= start)
    if end:
        users_with_token_usage = users_with_token_usage.filter(CreditTransaction.created_at <= end)
    user_count = users_with_token_usage.scalar() or 1

    avg_tokens_per_user = total_tokens / user_count

    # Tokens over time (grouped by day)
    tokens_over_time_query = db.query(
        func.date(CreditTransaction.created_at).label("date"),
        func.sum(CreditTransaction.tokens_used).label("tokens")
    ).filter(CreditTransaction.tokens_used.isnot(None))
    if start:
        tokens_over_time_query = tokens_over_time_query.filter(CreditTransaction.created_at >= start)
    if end:
        tokens_over_time_query = tokens_over_time_query.filter(CreditTransaction.created_at <= end)
    tokens_over_time = tokens_over_time_query.group_by(func.date(CreditTransaction.created_at)).all()

    # Top token consumers
    top_consumers_query = db.query(
        User.id,
        User.email,
        User.full_name,
        func.sum(CreditTransaction.tokens_used).label("total_tokens")
    ).join(CreditTransaction, User.id == CreditTransaction.user_id).filter(
        CreditTransaction.tokens_used.isnot(None)
    )
    if start:
        top_consumers_query = top_consumers_query.filter(CreditTransaction.created_at >= start)
    if end:
        top_consumers_query = top_consumers_query.filter(CreditTransaction.created_at <= end)
    top_consumers = top_consumers_query.group_by(User.id).order_by(func.sum(CreditTransaction.tokens_used).desc()).limit(10).all()

    return {
        "total_tokens": int(total_tokens),
        "avg_tokens_per_user": round(avg_tokens_per_user, 2),
        "tokens_over_time": [
            {"date": str(date), "tokens": int(tokens or 0)}
            for date, tokens in tokens_over_time
        ],
        "top_consumers": [
            {
                "user_id": user_id,
                "email": email,
                "full_name": full_name,
                "total_tokens": int(total_tokens)
            }
            for user_id, email, full_name, total_tokens in top_consumers
        ]
    }


@router.get("/analytics/credits")
async def get_credits_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    preset: Optional[str] = Query(None, regex="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get credits and revenue analytics"""
    start, end = parse_date_range(start_date, end_date, preset)

    # Total credits purchased
    credits_purchased_query = db.query(func.sum(CreditTransaction.amount)).filter(
        CreditTransaction.transaction_type == TransactionType.PURCHASE
    )
    if start:
        credits_purchased_query = credits_purchased_query.filter(CreditTransaction.created_at >= start)
    if end:
        credits_purchased_query = credits_purchased_query.filter(CreditTransaction.created_at <= end)
    credits_purchased = credits_purchased_query.scalar() or 0

    # Total credits spent
    credits_spent_query = db.query(func.sum(CreditTransaction.amount)).filter(
        CreditTransaction.transaction_type == TransactionType.TAILOR
    )
    if start:
        credits_spent_query = credits_spent_query.filter(CreditTransaction.created_at >= start)
    if end:
        credits_spent_query = credits_spent_query.filter(CreditTransaction.created_at <= end)
    credits_spent = abs(credits_spent_query.scalar() or 0)

    # Revenue (assuming $0.10 per credit)
    PRICE_PER_CREDIT = 0.10
    revenue = credits_purchased * PRICE_PER_CREDIT

    # Credits purchased over time
    credits_over_time_query = db.query(
        func.date(CreditTransaction.created_at).label("date"),
        func.sum(CreditTransaction.amount).label("credits")
    ).filter(CreditTransaction.transaction_type == TransactionType.PURCHASE)
    if start:
        credits_over_time_query = credits_over_time_query.filter(CreditTransaction.created_at >= start)
    if end:
        credits_over_time_query = credits_over_time_query.filter(CreditTransaction.created_at <= end)
    credits_over_time = credits_over_time_query.group_by(func.date(CreditTransaction.created_at)).all()

    # Average purchase size
    purchase_count = db.query(func.count(CreditTransaction.id)).filter(
        CreditTransaction.transaction_type == TransactionType.PURCHASE
    )
    if start:
        purchase_count = purchase_count.filter(CreditTransaction.created_at >= start)
    if end:
        purchase_count = purchase_count.filter(CreditTransaction.created_at <= end)
    num_purchases = purchase_count.scalar() or 1

    avg_purchase_size = credits_purchased / num_purchases

    return {
        "credits_purchased": round(credits_purchased, 2),
        "credits_spent": round(credits_spent, 2),
        "revenue": round(revenue, 2),
        "avg_purchase_size": round(avg_purchase_size, 2),
        "credits_over_time": [
            {"date": str(date), "credits": round(float(credits or 0), 2)}
            for date, credits in credits_over_time
        ]
    }


@router.get("/analytics/retention")
async def get_retention_analytics(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    preset: Optional[str] = Query(None, regex="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get app usage and retention analytics"""
    start, end = parse_date_range(start_date, end_date, preset)

    # Total projects created
    projects_query = db.query(func.count(Project.id))
    if start:
        projects_query = projects_query.filter(Project.created_at >= start)
    if end:
        projects_query = projects_query.filter(Project.created_at <= end)
    total_projects = projects_query.scalar()

    # Total tailoring operations
    tailoring_query = db.query(func.count(CreditTransaction.id)).filter(
        CreditTransaction.transaction_type == TransactionType.TAILOR
    )
    if start:
        tailoring_query = tailoring_query.filter(CreditTransaction.created_at >= start)
    if end:
        tailoring_query = tailoring_query.filter(CreditTransaction.created_at <= end)
    total_tailorings = tailoring_query.scalar()

    # Average tailorings per user
    users_who_tailored = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        CreditTransaction.transaction_type == TransactionType.TAILOR
    )
    if start:
        users_who_tailored = users_who_tailored.filter(CreditTransaction.created_at >= start)
    if end:
        users_who_tailored = users_who_tailored.filter(CreditTransaction.created_at <= end)
    user_count = users_who_tailored.scalar() or 1

    avg_tailorings_per_user = total_tailorings / user_count

    # Daily/weekly/monthly active users
    now = datetime.utcnow()

    # Daily active users (last 24 hours)
    dau = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        and_(
            CreditTransaction.transaction_type == TransactionType.TAILOR,
            CreditTransaction.created_at >= now - timedelta(days=1)
        )
    ).scalar()

    # Weekly active users (last 7 days)
    wau = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        and_(
            CreditTransaction.transaction_type == TransactionType.TAILOR,
            CreditTransaction.created_at >= now - timedelta(days=7)
        )
    ).scalar()

    # Monthly active users (last 30 days)
    mau = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        and_(
            CreditTransaction.transaction_type == TransactionType.TAILOR,
            CreditTransaction.created_at >= now - timedelta(days=30)
        )
    ).scalar()

    # Retention rate (users who return after 7 days)
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # Users who were active 7-14 days ago
    cohort_users = db.query(func.distinct(CreditTransaction.user_id)).filter(
        and_(
            CreditTransaction.transaction_type == TransactionType.TAILOR,
            CreditTransaction.created_at >= fourteen_days_ago,
            CreditTransaction.created_at < seven_days_ago
        )
    ).subquery()

    # Of those users, how many were active in last 7 days
    retained_users = db.query(func.count(func.distinct(CreditTransaction.user_id))).filter(
        and_(
            CreditTransaction.user_id.in_(cohort_users),
            CreditTransaction.transaction_type == TransactionType.TAILOR,
            CreditTransaction.created_at >= seven_days_ago
        )
    ).scalar()

    cohort_size = db.query(func.count()).select_from(cohort_users).scalar() or 1
    retention_rate = (retained_users / cohort_size) * 100

    return {
        "total_projects": total_projects,
        "total_tailorings": total_tailorings,
        "avg_tailorings_per_user": round(avg_tailorings_per_user, 2),
        "daily_active_users": dau,
        "weekly_active_users": wau,
        "monthly_active_users": mau,
        "retention_rate_7d": round(retention_rate, 2)
    }


# ============================================================================
# DETAILED DATA ENDPOINTS
# ============================================================================

@router.get("/users/detailed")
async def get_detailed_users(
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get detailed user list with stats"""

    # Query all users with their stats
    users = db.query(User).all()

    detailed_users = []
    for user in users:
        # Count projects
        project_count = db.query(func.count(Project.id)).filter(Project.user_id == user.id).scalar()

        # Count tailorings
        tailoring_count = db.query(func.count(CreditTransaction.id)).filter(
            and_(
                CreditTransaction.user_id == user.id,
                CreditTransaction.transaction_type == TransactionType.TAILOR
            )
        ).scalar()

        # Total tokens used
        total_tokens = db.query(func.sum(CreditTransaction.tokens_used)).filter(
            and_(
                CreditTransaction.user_id == user.id,
                CreditTransaction.tokens_used.isnot(None)
            )
        ).scalar() or 0

        # Total credits purchased
        credits_purchased = db.query(func.sum(CreditTransaction.amount)).filter(
            and_(
                CreditTransaction.user_id == user.id,
                CreditTransaction.transaction_type == TransactionType.PURCHASE
            )
        ).scalar() or 0

        # Last activity
        last_activity = db.query(func.max(CreditTransaction.created_at)).filter(
            CreditTransaction.user_id == user.id
        ).scalar()

        detailed_users.append({
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "credits": round(user.credits, 2),
            "projects": project_count,
            "tailorings": tailoring_count,
            "tokens_used": int(total_tokens),
            "credits_purchased": round(credits_purchased, 2),
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None,
            "last_activity": last_activity.isoformat() if last_activity else None,
        })

    return {"users": detailed_users, "total": len(detailed_users)}


@router.get("/credits/detailed")
async def get_detailed_credits(
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get detailed credits breakdown per user"""

    # Get users with credit transactions
    users_with_credits = db.query(
        User.id,
        User.email,
        User.full_name,
        User.credits,
        func.sum(
            case(
                (CreditTransaction.transaction_type == TransactionType.PURCHASE, CreditTransaction.amount),
                else_=0
            )
        ).label("total_purchased"),
        func.sum(
            case(
                (CreditTransaction.transaction_type == TransactionType.TAILOR, CreditTransaction.amount),
                else_=0
            )
        ).label("total_spent"),
        func.count(
            case(
                (CreditTransaction.transaction_type == TransactionType.PURCHASE, 1)
            )
        ).label("purchase_count"),
    ).outerjoin(CreditTransaction, User.id == CreditTransaction.user_id).group_by(User.id).all()

    detailed_credits = []
    for user_id, email, full_name, current_credits, purchased, spent, purchases in users_with_credits:
        detailed_credits.append({
            "user_id": user_id,
            "email": email,
            "full_name": full_name,
            "current_credits": round(current_credits, 2),
            "total_purchased": round(float(purchased or 0), 2),
            "total_spent": abs(round(float(spent or 0), 2)),
            "purchase_count": purchases,
            "revenue": round((purchased or 0) * 0.10, 2),  # $0.10 per credit
        })

    # Sort by revenue descending
    detailed_credits.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "credits_breakdown": detailed_credits,
        "total_users": len(detailed_credits)
    }


@router.get("/tokens/detailed")
async def get_detailed_tokens(
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Get detailed token usage per user"""

    # Get users with token usage
    token_usage = db.query(
        User.id,
        User.email,
        User.full_name,
        func.sum(CreditTransaction.tokens_used).label("total_tokens"),
        func.sum(CreditTransaction.prompt_tokens).label("total_prompt_tokens"),
        func.sum(CreditTransaction.completion_tokens).label("total_completion_tokens"),
        func.count(CreditTransaction.id).label("tailoring_count"),
        func.avg(CreditTransaction.tokens_used).label("avg_tokens_per_tailoring"),
    ).join(CreditTransaction, User.id == CreditTransaction.user_id).filter(
        CreditTransaction.tokens_used.isnot(None)
    ).group_by(User.id).all()

    detailed_tokens = []
    for user_id, email, full_name, total, prompt, completion, count, avg in token_usage:
        detailed_tokens.append({
            "user_id": user_id,
            "email": email,
            "full_name": full_name,
            "total_tokens": int(total or 0),
            "prompt_tokens": int(prompt or 0),
            "completion_tokens": int(completion or 0),
            "tailoring_count": count,
            "avg_tokens_per_tailoring": round(float(avg or 0), 2),
            "credits_consumed": round((total or 0) / 2000, 2),  # 2000 tokens = 1 credit
        })

    # Sort by total tokens descending
    detailed_tokens.sort(key=lambda x: x["total_tokens"], reverse=True)

    return {
        "token_breakdown": detailed_tokens,
        "total_users": len(detailed_tokens)
    }


@router.patch("/users/{user_id}/credits")
async def update_user_credits(
    user_id: int,
    credits_data: UpdateUserCredits,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Update a user's credit balance"""

    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update credits
    user.credits = credits_data.credits
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "Credits updated successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "credits": user.credits
        }
    }
