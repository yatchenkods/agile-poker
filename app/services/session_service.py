"""Planning Poker session service"""

from datetime import datetime
from sqlalchemy.orm import Session
from app.models.session import Session as SessionModel, SessionStatus, session_users
from app.schemas.session import SessionCreate, SessionUpdate


class SessionService:
    """Session business logic"""

    @staticmethod
    def create_session(db: Session, session_data: SessionCreate, creator_id: int) -> SessionModel:
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
        return db_session

    @staticmethod
    def get_session(db: Session, session_id: int) -> SessionModel:
        """Get session by ID"""
        return db.query(SessionModel).filter(SessionModel.id == session_id).first()

    @staticmethod
    def get_sessions(db: Session, skip: int = 0, limit: int = 10) -> list[SessionModel]:
        """Get list of sessions"""
        return db.query(SessionModel).offset(skip).limit(limit).all()

    @staticmethod
    def update_session(db: Session, session_id: int, session_data: SessionUpdate) -> SessionModel:
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
        return session

    @staticmethod
    def close_session(db: Session, session_id: int) -> SessionModel:
        """Close a session"""
        session = SessionService.get_session(db, session_id)
        if not session:
            return None
        
        session.status = SessionStatus.CLOSED
        session.closed_at = datetime.utcnow()
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def add_user_to_session(db: Session, session_id: int, user_id: int) -> None:
        """Add user to session"""
        session = SessionService.get_session(db, session_id)
        if session:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user not in session.participants:
                session.participants.append(user)
                db.commit()

    @staticmethod
    def remove_user_from_session(db: Session, session_id: int, user_id: int) -> None:
        """Remove user from session"""
        session = SessionService.get_session(db, session_id)
        if session:
            from app.models.user import User
            user = db.query(User).filter(User.id == user_id).first()
            if user and user in session.participants:
                session.participants.remove(user)
                db.commit()
