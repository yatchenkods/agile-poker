"""Admin service business logic"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.session import Session as SessionModel
from app.models.issue import Issue
from app.models.estimate import Estimate


class AdminService:
    """Admin business logic"""

    @staticmethod
    def get_stats(db: Session) -> dict:
        """Get application statistics"""
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_sessions = db.query(func.count(SessionModel.id)).scalar() or 0
        total_issues = db.query(func.count(Issue.id)).scalar() or 0
        total_estimates = db.query(func.count(Estimate.id)).scalar() or 0
        
        return {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_issues": total_issues,
            "total_estimates": total_estimates,
        }

    @staticmethod
    def get_conflicting_estimates(db: Session) -> list:
        """Get issues with conflicting estimates (high variance)"""
        issues = db.query(Issue).all()
        conflicts = []
        
        for issue in issues:
            if len(issue.estimates) < 2:
                continue
            
            points = [e.story_points for e in issue.estimates]
            variance = max(points) - min(points)
            
            # Flag if variance > 4 points as conflict
            if variance > 4:
                conflicts.append({
                    "issue_id": issue.id,
                    "jira_key": issue.jira_key,
                    "title": issue.title,
                    "min_points": min(points),
                    "max_points": max(points),
                    "variance": variance,
                    "estimates_count": len(issue.estimates),
                })
        
        return sorted(conflicts, key=lambda x: x["variance"], reverse=True)

    @staticmethod
    def get_users_stats(db: Session) -> list:
        """Get user statistics"""
        users = db.query(User).all()
        stats = []
        
        for user in users:
            total_estimates = len(user.estimates)
            sessions_count = len(user.sessions)
            
            stats.append({
                "user_id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "total_estimates": total_estimates,
                "participated_sessions": sessions_count,
                "is_active": user.is_active,
                "is_admin": user.is_admin,
            })
        
        return stats
