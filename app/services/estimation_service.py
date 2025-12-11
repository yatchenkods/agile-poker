"""Estimation service business logic"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.estimate import Estimate
from app.models.issue import Issue
from app.schemas.estimate import EstimateCreate, EstimateSummary


class EstimationService:
    """Estimation business logic"""

    @staticmethod
    def create_estimate(db: Session, estimate_data: EstimateCreate) -> Estimate:
        """Create an estimate"""
        # Check if user already estimated this issue
        existing = db.query(Estimate).filter(
            Estimate.issue_id == estimate_data.issue_id,
            Estimate.user_id == estimate_data.user_id,
        ).first()
        
        if existing:
            # Update existing estimate
            existing.story_points = estimate_data.story_points
            db.add(existing)
        else:
            # Create new estimate
            db_estimate = Estimate(**estimate_data.dict())
            db.add(db_estimate)
        
        db.commit()
        
        # Check if we should auto-apply the estimate
        EstimationService._check_consensus(db, estimate_data.issue_id)
        
        return existing or db_estimate

    @staticmethod
    def get_estimates(
        db: Session,
        session_id: int = None,
        issue_id: int = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Estimate]:
        """Get estimates with optional filtering"""
        query = db.query(Estimate)
        
        if session_id:
            query = query.join(Issue).filter(Issue.session_id == session_id)
        
        if issue_id:
            query = query.filter(Estimate.issue_id == issue_id)
        
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_estimate_summary(db: Session, issue_id: int) -> EstimateSummary:
        """Get estimate summary for an issue"""
        estimates = db.query(Estimate).filter(Estimate.issue_id == issue_id).all()
        
        if not estimates:
            return None
        
        points = [e.story_points for e in estimates]
        avg = sum(points) / len(points)
        
        # Check if consensus (all within 2 points)
        is_consensus = (max(points) - min(points)) <= 2
        
        estimates_dict = {e.user_id: e.story_points for e in estimates}
        
        return EstimateSummary(
            issue_id=issue_id,
            total_estimates=len(estimates),
            avg_points=avg,
            min_points=min(points),
            max_points=max(points),
            is_consensus=is_consensus,
            estimates=estimates_dict,
        )

    @staticmethod
    def get_estimate_history(
        db: Session,
        issue_id: int = None,
        user_id: int = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Estimate]:
        """Get estimation history"""
        query = db.query(Estimate)
        
        if issue_id:
            query = query.filter(Estimate.issue_id == issue_id)
        
        if user_id:
            query = query.filter(Estimate.user_id == user_id)
        
        return query.order_by(Estimate.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def _check_consensus(db: Session, issue_id: int) -> bool:
        """Check if estimates have reached consensus and auto-apply"""
        issue = db.query(Issue).filter(Issue.id == issue_id).first()
        if not issue:
            return False
        
        # Get session participants count
        from app.models.session import Session as SessionModel
        session = db.query(SessionModel).filter(SessionModel.id == issue.session_id).first()
        participants_count = len(session.participants) if session else 0
        
        if participants_count == 0:
            return False
        
        # Get estimates
        estimates = db.query(Estimate).filter(Estimate.issue_id == issue_id).all()
        
        # All participants must have voted
        if len(estimates) < participants_count:
            return False
        
        points = [e.story_points for e in estimates]
        
        # Check if consensus (max - min <= 2 points)
        if (max(points) - min(points)) <= 2:
            # Calculate average and round to nearest valid score
            avg = sum(points) / len(points)
            valid_scores = [1, 2, 4, 8, 16]
            final_score = min(valid_scores, key=lambda x: abs(x - avg))
            
            # Apply estimate
            issue.story_points = final_score
            issue.is_estimated = True
            db.add(issue)
            db.commit()
            
            return True
        
        return False
