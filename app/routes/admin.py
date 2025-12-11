"""Admin routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.admin_service import AdminService
from app.utils.security import get_current_user

router = APIRouter()
admin_service = AdminService()


def verify_admin(current_user = Depends(get_current_user)):
    """Verify user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint",
        )
    return current_user


@router.get("/stats")
async def get_stats(
    admin_user = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Get application statistics"""
    stats = admin_service.get_stats(db)
    return stats


@router.get("/conflicting-estimates")
async def get_conflicting_estimates(
    admin_user = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Get issues with conflicting estimates"""
    conflicts = admin_service.get_conflicting_estimates(db)
    return conflicts


@router.get("/users-stats")
async def get_users_stats(
    admin_user = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Get user statistics"""
    stats = admin_service.get_users_stats(db)
    return stats
