"""Planning Poker session service"""

from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from app.models.session import Session as SessionModel, SessionStatus, session_users
from app.schemas.session import SessionCreate, SessionUpdate


class SessionService:
    """Session business logic"""

    @staticmethod
    def _enrich_session(session: SessionModel) -> dict:
        """
        Enrich session ORM object with computed fields for API response.
        
        Converts SQLAlchemy model to dict and adds:
        - participant_count: number of participants
        - issue_count: number of issues
        - estimator_count: number of estimators
        """
        session_dict = {
            "id": session.id,
            "name": session.name,
            "description": session.description,
            "project_key": session.project_key,
            "status": session.status,
            "created_by_id": session.created_by_id,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "closed_at": session.closed_at,
            "participant_count": len(session.participants) if session.participants else 0,
            "issue_count": len(session.issues) if session.issues else 0,
            "estimator_count": len(session.estimators) if session.estimators else 0,
        }
        return session_dict

    @staticmethod
    def create_session(db: Session, session_data: SessionCreate, creator_id: int) -> dict:
        """Create a new session"""
        db_session = SessionModel(
            name=session_data.name,
            description=session_data.description,
            project_key=session_data.project_key,
            created_by_id=creator_id,
            status=SessionStatus.ACTIVE,
        )
        db.add(db_session)
        db.commit()
        db.refresh(db_session)
        return SessionService._enrich_session(db_session)

    @staticmethod
    def get_session(db: Session, session_id: int) -> SessionModel:
        """Get session by ID (returns ORM object with eager-loaded relationships)"""
        return db.query(SessionModel).options(
            joinedload(SessionModel.participants),
            joinedload(SessionModel.estimators),
            joinedload(SessionModel.issues)
        ).filter(SessionModel.id == session_id).first()

    @staticmethod
    def get_sessions(db: Session, skip: int = 0, limit: int = 10) -> list[dict]:
        """Get list of sessions with computed fields and eager-loaded relationships"""
        sessions = db.query(SessionModel).options(
            joinedload(SessionModel.participants),
            joinedload(SessionModel.estimators),
            joinedload(SessionModel.issues)
        ).offset(skip).limit(limit).all()
        return [SessionService._enrich_session(session) for session in sessions]

    @staticmethod
    def update_session(db: Session, session_id: int, session_data: SessionUpdate) -> dict:
        """Update session"""
        session = SessionService.get_session(db, session_id)
        if not session:
            return None
        
        update_data = session_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(session, field, value)
        
        db.add(session)
        db.commit()
        db.refresh(session)
        return SessionService._enrich_session(session)

    @staticmethod
    def close_session(db: Session, session_id: int) -> dict:
        """Close a session"""
        session = SessionService.get_session(db, session_id)
        if not session:
            return None
        
        session.status = SessionStatus.CLOSED
        session.closed_at = datetime.utcnow()
        db.add(session)
        db.commit()
        db.refresh(session)
        return SessionService._enrich_session(session)

    @staticmethod
    def add_user_to_session(db: Session, session_id: int, user_id: int) -> None:
        """Add user to session participants"""
        session = SessionService.get_session(db, session_id)
        if session:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user not in session.participants:
                session.participants.append(user)
                db.commit()

    @staticmethod
    def remove_user_from_session(db: Session, session_id: int, user_id: int) -> None:
        """Remove user from session participants"""
        session = SessionService.get_session(db, session_id)
        if session:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user in session.participants:
                session.participants.remove(user)
                db.commit()

    @staticmethod
    def add_estimator_to_session(db: Session, session_id: int, user_id: int) -> None:
        """Add user as estimator for the session"""
        session = SessionService.get_session(db, session_id)
        if session:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user not in session.estimators:
                session.estimators.append(user)
                db.commit()

    @staticmethod
    def remove_estimator_from_session(db: Session, session_id: int, user_id: int) -> None:
        """Remove user from session estimators"""
        session = SessionService.get_session(db, session_id)
        if session:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user in session.estimators:
                session.estimators.remove(user)
                db.commit()

    @staticmethod
    def get_session_estimators(db: Session, session_id: int) -> list:
        """Get all estimators for a session"""
        session = SessionService.get_session(db, session_id)
        if session:
            return session.estimators
        return []

    @staticmethod
    def get_estimator_count(db: Session, session_id: int) -> int:
        """Get count of estimators for a session"""
        session = SessionService.get_session(db, session_id)
        if session:
            return len(session.estimators)
        return 0
