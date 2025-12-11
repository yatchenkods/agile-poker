"""Planning Poker session routes"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocketException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.session import SessionCreate, SessionResponse, SessionDetailResponse, SessionUpdate
from app.services.session_service import SessionService
from app.utils.security import get_current_user

router = APIRouter()
session_service = SessionService()


@router.post("/", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new Planning Poker session"""
    session = session_service.create_session(db, session_data, current_user.id)
    return session


@router.get("/", response_model=List[SessionResponse])
async def list_sessions(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """List all sessions"""
    sessions = session_service.get_sessions(db, skip=skip, limit=limit)
    return sessions


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: int, db: Session = Depends(get_db)):
    """Get session details"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_data: SessionUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can update",
        )
    
    updated_session = session_service.update_session(db, session_id, session_data)
    return updated_session


@router.post("/{session_id}/close", response_model=SessionResponse)
async def close_session(
    session_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Close a session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    if session.created_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only session creator can close",
        )
    
    closed_session = session_service.close_session(db, session_id)
    return closed_session


@router.post("/{session_id}/users/{user_id}")
async def add_user_to_session(
    session_id: int,
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add user to session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session_service.add_user_to_session(db, session_id, user_id)
    return {"message": "User added to session"}


@router.delete("/{session_id}/users/{user_id}")
async def remove_user_from_session(
    session_id: int,
    user_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove user from session"""
    session = session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    
    session_service.remove_user_from_session(db, session_id, user_id)
    return {"message": "User removed from session"}
