from fastapi import APIRouter, Request, Header, HTTPException
from ..database import get_database
from ..services.stripe_service import get_stripe_service

router = APIRouter(prefix="/api/stripe", tags=["stripe"])

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None),
    db=None
):
    if db is None:
        from ..database import get_database
        db = await get_database()
    
    payload = await request.body()
    
    stripe_service = get_stripe_service(db)
    result = await stripe_service.handle_webhook(payload, stripe_signature)
    
    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))
    
    return {"status": "success"}