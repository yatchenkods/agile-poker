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
            existing.is_joker = estimate_data.is_joker
            db.add(existing)
        else:
            # Create new estimate (exclude session_id as it's not in the model)
            estimate_dict = estimate_data.dict(exclude={'session_id'})
            db_estimate = Estimate(**estimate_dict)
            db.add(db_estimate)
        
        db.commit()
        
        # Get the final estimate object (existing or newly created)
        final_estimate = existing if existing else db_estimate
        
        # Check if we should auto-apply the estimate
        EstimationService._check_consensus(db, estimate_data.issue_id)
        
        return final_estimate

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
        
        # Separate joker and regular estimates
        joker_estimates = [e for e in estimates if e.is_joker]
        valid_estimates = [e for e in estimates if not e.is_joker]
        
        # If no valid estimates (all jokers), return summary without consensus
        if not valid_estimates:
            estimates_dict = {e.user_id: {"points": 0, "is_joker": True} for e in estimates}
            return EstimateSummary(
                issue_id=issue_id,
                total_estimates=len(estimates),
                valid_estimates=0,
                avg_points=0.0,
                min_points=0,
                max_points=0,
                is_consensus=False,
                estimates=estimates_dict,
                joker_count=len(joker_estimates),
            )
        
        points = [e.story_points for e in valid_estimates]
        avg = sum(points) / len(points)
        
        # Check if consensus (all valid estimates within 2 points)
        is_consensus = (max(points) - min(points)) <= 2
        
        estimates_dict = {}
        for e in estimates:
            estimates_dict[e.user_id] = {
                "points": 0 if e.is_joker else e.story_points,
                "is_joker": e.is_joker
            }
        
        return EstimateSummary(
            issue_id=issue_id,
            total_estimates=len(estimates),
            valid_estimates=len(valid_estimates),
            avg_points=avg,
            min_points=min(points),
            max_points=max(points),
            is_consensus=is_consensus,
            estimates=estimates_dict,
            joker_count=len(joker_estimates),
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
        if not issue or issue.is_estimated:
            return False
        
        # Get session estimators count
        from app.models.session import Session as SessionModel
        session = db.query(SessionModel).filter(SessionModel.id == issue.session_id).first()
        if not session:
            return False
        
        # Get estimators count (people assigned to estimate tasks)
        # If no estimators assigned, use all participants as fallback
        if session.estimators and len(session.estimators) > 0:
            estimators_count = len(session.estimators)
        else:
            estimators_count = len(session.participants) if session.participants else 0
        
        if estimators_count == 0:
            return False
        
        # Get all estimates (both regular and joker)
        estimates = db.query(Estimate).filter(Estimate.issue_id == issue_id).all()
        estimate_count = len(estimates)
        
        # Check if all estimators have voted (including joker votes)
        if estimate_count < estimators_count:
            return False
        
        # Only consider non-joker estimates for consensus calculation
        valid_estimates = [e for e in estimates if not e.is_joker]
        
        # If no valid estimates (only jokers), cannot reach consensus
        if not valid_estimates:
            return False
        
        points = [e.story_points for e in valid_estimates]
        variance = max(points) - min(points)
        
        # Check if consensus: max - min <= 2 points AND all estimators have voted
        if variance <= 2 and estimate_count >= estimators_count:
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
