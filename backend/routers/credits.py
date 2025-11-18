"""
Credits API Router
Handles credit balance, transactions, and Stripe payment integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import stripe
import logging

from config.database import get_db
from models.user import User
from models.credit_transaction import CreditTransaction, TransactionType
from middleware.auth_middleware import get_current_user
from config.settings import settings

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(
    prefix="/api/credits",
    tags=["credits"]
)


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class CreditBalance(BaseModel):
    credits: float
    low_balance_warning: bool
    minimum_required: float

    class Config:
        from_attributes = True


class TransactionResponse(BaseModel):
    id: int
    amount: float
    balance_after: float
    transaction_type: str
    tokens_used: Optional[int]
    description: Optional[str]
    created_at: str
    project_id: Optional[int]

    class Config:
        from_attributes = True


class CreditPackage(BaseModel):
    credits: int
    price_usd: float
    price_cents: int
    savings: Optional[str] = None


class CheckoutSessionRequest(BaseModel):
    credits: int  # Number of credits to purchase


class CheckoutSessionResponse(BaseModel):
    session_id: str
    url: str


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/balance", response_model=CreditBalance)
async def get_credit_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's credit balance and warnings

    Returns:
        CreditBalance with current credits, warning flag, and minimum required
    """
    try:
        # Refresh user from database to ensure fresh data
        db.refresh(current_user)

        return CreditBalance(
            credits=current_user.credits,
            low_balance_warning=current_user.credits < settings.LOW_CREDIT_THRESHOLD,
            minimum_required=settings.MINIMUM_CREDITS_FOR_TAILOR
        )
    except Exception as e:
        logger.error(f"Failed to get credit balance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit balance"
        )


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_credit_transactions(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's credit transaction history

    Args:
        limit: Maximum number of transactions to return (default 50)
        offset: Number of transactions to skip (for pagination)

    Returns:
        List of credit transactions ordered by most recent first
    """
    try:
        transactions = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == current_user.id
        ).order_by(
            CreditTransaction.created_at.desc()
        ).limit(limit).offset(offset).all()

        return [
            TransactionResponse(
                id=t.id,
                amount=t.amount,
                balance_after=t.balance_after,
                transaction_type=t.transaction_type.value,
                tokens_used=t.tokens_used,
                description=t.description,
                created_at=t.created_at.isoformat() if t.created_at else "",
                project_id=t.project_id
            )
            for t in transactions
        ]
    except Exception as e:
        logger.error(f"Failed to get transaction history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve transaction history"
        )


@router.get("/packages", response_model=List[CreditPackage])
async def get_credit_packages():
    """
    Get available credit packages for purchase

    Returns:
        List of credit packages with pricing
    """
    try:
        packages = []
        for credits, price_cents in sorted(settings.CREDIT_PACKAGES.items()):
            price_usd = price_cents / 100.0

            # Calculate savings compared to base rate (50 credits = $5.00)
            base_rate = 0.10  # $0.10 per credit
            package_rate = price_usd / credits
            savings_percent = ((base_rate - package_rate) / base_rate) * 100

            packages.append(CreditPackage(
                credits=credits,
                price_usd=price_usd,
                price_cents=price_cents,
                savings=f"Save {int(savings_percent)}%" if savings_percent > 0 else None
            ))

        return packages
    except Exception as e:
        logger.error(f"Failed to get credit packages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credit packages"
        )


@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe Checkout session for credit purchase

    Args:
        request: CheckoutSessionRequest with credits amount

    Returns:
        CheckoutSessionResponse with session ID and redirect URL
    """
    try:
        # Validate credit amount
        if request.credits not in settings.CREDIT_PACKAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid credit package. Choose from: {list(settings.CREDIT_PACKAGES.keys())}"
            )

        price_cents = settings.CREDIT_PACKAGES[request.credits]
        price_usd = price_cents / 100.0

        logger.info(
            f"Creating Stripe checkout session for user {current_user.id}: "
            f"{request.credits} credits = ${price_usd}"
        )

        # Create Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': price_cents,
                    'product_data': {
                        'name': f'{request.credits} Credits',
                        'description': f'SkillMap AI Credits - {request.credits} credits for resume tailoring',
                        'images': [],  # Optional: Add your product image URL
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=settings.STRIPE_SUCCESS_URL,
            cancel_url=settings.STRIPE_CANCEL_URL,
            customer_email=current_user.email,
            client_reference_id=str(current_user.id),
            metadata={
                'user_id': str(current_user.id),
                'credits': str(request.credits),
                'email': current_user.email,
            },
        )

        logger.info(f"✓ Stripe checkout session created: {checkout_session.id}")

        return CheckoutSessionResponse(
            session_id=checkout_session.id,
            url=checkout_session.url
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing error: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session"
        )


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook events (payment confirmation, etc.)

    This endpoint receives events from Stripe when:
    - Payment is successful
    - Payment fails
    - Subscription events (if added later)

    Stripe will sign the webhook with your webhook secret for security.
    """
    try:
        # Get raw request body
        payload = await request.body()

        # Check if webhook secret is configured
        if not settings.STRIPE_WEBHOOK_SECRET:
            logger.error("STRIPE_WEBHOOK_SECRET not configured - cannot verify webhooks")
            raise HTTPException(
                status_code=503,
                detail="Stripe webhook verification not configured"
            )

        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            logger.error(f"Invalid webhook payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            logger.error(f"Invalid webhook signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Handle the event
        event_type = event['type']
        logger.info(f"Received Stripe webhook event: {event_type}")

        if event_type == 'checkout.session.completed':
            try:
                # Payment successful - add credits to user
                session = event['data']['object']
                session_id = session['id']  # Stripe session ID for idempotency

                logger.info(f"Processing checkout.session.completed: {session_id}")

                # IDEMPOTENCY CHECK: Check if we've already processed this session
                existing_transaction = db.query(CreditTransaction).filter(
                    CreditTransaction.stripe_session_id == session_id
                ).first()

                if existing_transaction:
                    logger.info(f"⚠️  Webhook already processed for session {session_id}. Skipping duplicate.")
                    return {"status": "success", "message": "Already processed"}

                # Extract metadata with error handling
                metadata = session.get('metadata', {})
                if not metadata.get('user_id'):
                    logger.error(f"Missing user_id in session metadata: {session_id}")
                    raise HTTPException(status_code=400, detail="Missing user_id in metadata")

                if not metadata.get('credits'):
                    logger.error(f"Missing credits in session metadata: {session_id}")
                    raise HTTPException(status_code=400, detail="Missing credits in metadata")

                user_id = int(metadata['user_id'])
                credits = int(metadata['credits'])
                amount_paid_cents = session['amount_total']

                logger.info(
                    f"Payment successful for user {user_id}: "
                    f"{credits} credits, ${amount_paid_cents/100:.2f} paid"
                )

                # Get user from database
                # Fetch user with row-level lock to prevent race conditions
                user = db.query(User).filter(User.id == user_id).with_for_update().first()
                if not user:
                    logger.error(f"User {user_id} not found for webhook!")
                    raise HTTPException(status_code=404, detail="User not found")

                # Add credits (row is locked, safe from concurrent modifications)
                user.credits += credits
                new_balance = user.credits

                # Create transaction record with Stripe session ID
                transaction = CreditTransaction(
                    user_id=user_id,
                    project_id=None,
                    amount=credits,
                    balance_after=new_balance,
                    transaction_type=TransactionType.PURCHASE,
                    tokens_used=None,
                    prompt_tokens=None,
                    completion_tokens=None,
                    description=f"Purchased {credits} credits via Stripe (${amount_paid_cents/100:.2f})",
                    stripe_session_id=session_id  # Store session ID for idempotency
                )
                db.add(transaction)
                db.commit()

                logger.info(
                    f"✓ Credits added: User {user_id} received {credits} credits. "
                    f"New balance: {new_balance}"
                )

            except Exception as e:
                db.rollback()
                logger.error(f"Error processing checkout.session.completed: {type(e).__name__}: {e}")
                logger.error(f"Session data: {session}")
                raise

        elif event_type == 'payment_intent.payment_failed':
            # Payment failed - log for investigation
            payment_intent = event['data']['object']
            logger.warning(f"Payment failed: {payment_intent.get('id')}")

        else:
            logger.info(f"Unhandled event type: {event_type}")

        return {"status": "success"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )
