"""Estimate routes"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.estimate import EstimateCreate, EstimateResponse, EstimateSummary
from app.services.estimation_service import EstimationService
from app.utils.security import get_current_user

router = APIRouter()
estimation_service = EstimationService()


@router.post("/", response_model=EstimateResponse)
async def create_estimate(
    estimate_data: EstimateCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an estimate for an issue"""
    estimate = estimation_service.create_estimate(db, estimate_data)
    return estimate


@router.get("/", response_model=List[EstimateResponse])
async def list_estimates(
    session_id: int = None,
    issue_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """List estimates with optional filtering"""
    estimates = estimation_service.get_estimates(
        db, session_id=session_id, issue_id=issue_id, skip=skip, limit=limit
    )
    return estimates


@router.get("/summary/{issue_id}", response_model=EstimateSummary)
async def get_estimate_summary(issue_id: int, db: Session = Depends(get_db)):
    """Get estimate summary for an issue"""
    summary = estimation_service.get_estimate_summary(db, issue_id)
    if not summary:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No estimates found")
    return summary


@router.get("/history/", response_model=List[EstimateResponse])
async def get_estimate_history(
    issue_id: int = None,
    user_id: int = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Get estimation history"""
    history = estimation_service.get_estimate_history(
        db, issue_id=issue_id, user_id=user_id, skip=skip, limit=limit
    )
    return history
