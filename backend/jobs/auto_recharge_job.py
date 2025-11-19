"""
Auto-Recharge Background Job

This job monitors users with auto-recharge enabled and automatically
charges them when their credit balance falls below the threshold.

Run as a cron job:
- Every hour: 0 * * * * python jobs/auto_recharge_job.py
- Every 30 minutes: */30 * * * * python jobs/auto_recharge_job.py

The job will:
1. Find users with auto_recharge_enabled=True and credits < threshold
2. For each user, create a Stripe charge using their saved payment method
3. Add credits + bonus to their account
4. Create transaction records
5. Send email notification (optional)
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import and_
from sqlalchemy.orm import Session
import stripe
import logging

from config.database import get_db, engine
from config.settings import settings
from models.user import User
from models.credit_transaction import CreditTransaction, TransactionType

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Bonus credits for auto-recharge
AUTO_RECHARGE_BONUS = 20


def process_auto_recharge(user: User, db: Session) -> bool:
    """
    Process auto-recharge for a single user

    Args:
        user: User object with auto-recharge enabled
        db: Database session

    Returns:
        True if successful, False otherwise
    """
    try:
        # Validate user has all required data
        if not user.stripe_customer_id:
            logger.error(f"User {user.id} has no Stripe customer ID. Cannot auto-recharge.")
            return False

        if not user.stripe_payment_method_id:
            logger.error(f"User {user.id} has no saved payment method. Cannot auto-recharge.")
            return False

        if not user.auto_recharge_credits:
            logger.error(f"User {user.id} has no auto-recharge credits set. Cannot auto-recharge.")
            return False

        # Validate credit package
        if user.auto_recharge_credits not in settings.CREDIT_PACKAGES:
            logger.error(
                f"User {user.id} has invalid credit package: {user.auto_recharge_credits}. "
                f"Valid packages: {list(settings.CREDIT_PACKAGES.keys())}"
            )
            return False

        credits = user.auto_recharge_credits
        price_cents = settings.CREDIT_PACKAGES[credits]
        price_usd = price_cents / 100.0

        logger.info(
            f"Processing auto-recharge for user {user.id} ({user.email}): "
            f"{credits} credits for ${price_usd}"
        )

        # Create payment intent with saved payment method
        payment_intent = stripe.PaymentIntent.create(
            amount=price_cents,
            currency='usd',
            customer=user.stripe_customer_id,
            payment_method=user.stripe_payment_method_id,
            off_session=True,  # Indicate this is an off-session payment
            confirm=True,  # Automatically confirm the payment
            description=f'Auto-recharge: {credits} SkillMap AI Credits',
            metadata={
                'user_id': str(user.id),
                'credits': str(credits),
                'email': user.email,
                'auto_recharge': 'True',
            },
        )

        # Check payment status
        if payment_intent.status != 'succeeded':
            logger.error(
                f"Payment failed for user {user.id}. Status: {payment_intent.status}. "
                f"Payment Intent: {payment_intent.id}"
            )

            # TODO: Send email notification about payment failure
            # TODO: Consider disabling auto-recharge after multiple failures

            return False

        logger.info(f"✓ Payment successful for user {user.id}. Payment Intent: {payment_intent.id}")

        # Add credits + bonus to user account
        bonus_credits = AUTO_RECHARGE_BONUS
        total_credits = credits + bonus_credits

        user.credits += total_credits
        new_balance = user.credits

        # Create transaction record for purchased credits
        purchase_transaction = CreditTransaction(
            user_id=user.id,
            project_id=None,
            amount=credits,
            balance_after=user.credits - bonus_credits,
            transaction_type=TransactionType.PURCHASE,
            tokens_used=None,
            prompt_tokens=None,
            completion_tokens=None,
            description=f"Auto-recharge: {credits} credits (${price_usd})",
            stripe_session_id=payment_intent.id  # Use payment intent ID for idempotency
        )
        db.add(purchase_transaction)

        # Create bonus transaction
        bonus_transaction = CreditTransaction(
            user_id=user.id,
            project_id=None,
            amount=bonus_credits,
            balance_after=new_balance,
            transaction_type=TransactionType.BONUS,
            tokens_used=None,
            prompt_tokens=None,
            completion_tokens=None,
            description=f"Auto-recharge bonus: +{bonus_credits} credits",
            stripe_session_id=None
        )
        db.add(bonus_transaction)

        db.commit()

        logger.info(
            f"✓ Auto-recharge completed for user {user.id}: "
            f"+{credits} credits + {bonus_credits} bonus = {total_credits} total. "
            f"New balance: {new_balance}"
        )

        # TODO: Send email notification about successful auto-recharge

        return True

    except stripe.error.CardError as e:
        # Card was declined
        logger.error(f"Card declined for user {user.id}: {e.user_message}")
        db.rollback()
        # TODO: Send email notification about declined card
        # TODO: Consider disabling auto-recharge
        return False

    except stripe.error.StripeError as e:
        # Stripe error
        logger.error(f"Stripe error for user {user.id}: {str(e)}")
        db.rollback()
        return False

    except Exception as e:
        # General error
        logger.error(f"Error processing auto-recharge for user {user.id}: {type(e).__name__}: {e}")
        db.rollback()
        return False


def run_auto_recharge_job():
    """
    Main job function - finds users needing auto-recharge and processes them
    """
    logger.info("=" * 80)
    logger.info("Starting auto-recharge job...")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    logger.info("=" * 80)

    # Create database session
    db = next(get_db())

    try:
        # Find users who need auto-recharge
        # Criteria:
        # 1. auto_recharge_enabled = True
        # 2. credits < auto_recharge_threshold
        # 3. Has stripe_customer_id
        # 4. Has stripe_payment_method_id
        users_needing_recharge = db.query(User).filter(
            and_(
                User.auto_recharge_enabled == True,
                User.credits < User.auto_recharge_threshold,
                User.stripe_customer_id.isnot(None),
                User.stripe_payment_method_id.isnot(None),
                User.auto_recharge_credits.isnot(None)
            )
        ).all()

        if not users_needing_recharge:
            logger.info("No users need auto-recharge at this time.")
            return

        logger.info(f"Found {len(users_needing_recharge)} user(s) needing auto-recharge")

        # Process each user
        success_count = 0
        failure_count = 0

        for user in users_needing_recharge:
            logger.info(f"\nProcessing user {user.id} ({user.email})")
            logger.info(f"  Current balance: {user.credits:.1f} credits")
            logger.info(f"  Threshold: {user.auto_recharge_threshold:.1f} credits")
            logger.info(f"  Will recharge: {user.auto_recharge_credits} credits")

            success = process_auto_recharge(user, db)

            if success:
                success_count += 1
            else:
                failure_count += 1

        # Summary
        logger.info("\n" + "=" * 80)
        logger.info("Auto-recharge job completed")
        logger.info(f"Processed: {len(users_needing_recharge)} user(s)")
        logger.info(f"Successful: {success_count}")
        logger.info(f"Failed: {failure_count}")
        logger.info("=" * 80)

    except Exception as e:
        logger.error(f"Auto-recharge job failed: {type(e).__name__}: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    try:
        run_auto_recharge_job()
    except Exception as e:
        logger.error(f"Job execution failed: {e}")
        sys.exit(1)
