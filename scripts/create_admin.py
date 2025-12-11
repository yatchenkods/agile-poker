#!/usr/bin/env python
"""Create admin user script"""

import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.utils.security import hash_password


def create_admin():
    """Create admin user"""
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if admin:
            print("Admin user already exists")
            return
        
        # Create admin
        admin = User(
            email="admin@example.com",
            full_name="Admin User",
            hashed_password=hash_password("admin"),
            is_admin=True,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully")
        print("Email: admin@example.com")
        print("Password: admin")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
