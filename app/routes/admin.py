"""Admin routes"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.admin_service import AdminService
from app.utils.security import get_current_user, hash_password

router = APIRouter()
admin_service = AdminService()


class ResetPasswordRequest(BaseModel):
    """Reset password request schema"""
    user_id: int
    new_password: str

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "new_password": "NewSecurePass123",
            }
        }


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


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    admin_user = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Reset user password (admin only)"""
    # Validate password
    if len(request.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    # Find user
    user = db.query(User).filter(User.id == request.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Update password
    user.password_hash = hash_password(request.new_password)
    db.add(user)
    db.commit()

    return {
        "message": f"Password reset successfully for {user.email}",
        "user_id": user.id,
        "email": user.email,
    }
