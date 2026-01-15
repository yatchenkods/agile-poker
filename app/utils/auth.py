"""Authentication utilities"""

from fastapi import Depends, HTTPException, status

from app.utils.security import get_current_user


def verify_admin(current_user=Depends(get_current_user)):
    """Verify user is admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can access this endpoint",
        )
    return current_user
