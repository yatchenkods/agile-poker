#!/usr/bin/env python
"""Seed database with example data

Usage:
    python scripts/seed_data.py          # Run from project root
    python -m scripts.seed_data          # Alternative method
    
Requirements:
    - Must run from project root directory
    - Database must be initialized: alembic upgrade head
    - Dependencies must be installed: pip install -r requirements.txt
"""

import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Check if we're in the right directory
if not (PROJECT_ROOT / 'app').exists():
    print(f"\n❌ Error: Could not find 'app' directory!")
    print(f"ℹ️  Make sure you run this script from the project root directory.")
    print(f"ℹ️  Current directory: {os.getcwd()}")
    print(f"ℹ️  Expected app directory at: {PROJECT_ROOT / 'app'}")
    print(f"\n💡 Try: cd {PROJECT_ROOT} && python scripts/seed_data.py")
    sys.exit(1)

try:
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import SQLAlchemyError
    from app.database import SessionLocal, engine, Base
    from app.models.user import User
    from app.models.session import Session as SessionModel
    from app.models.issue import Issue
    from app.utils.security import hash_password
except ImportError as e:
    print(f"\n❌ Error: Missing required module: {str(e)}")
    print("\n📝 Please install dependencies:")
    print("   pip install -r requirements.txt")
    print("\nℹ️  If using Docker:")
    print("   docker-compose exec api python scripts/seed_data.py")
    sys.exit(1)


def seed_database():
    """Seed database with example data"""
    try:
        # Create tables
        Base.metadata.create_all(bind=engine)
        
        db: Session = SessionLocal()
        try:
            # Check if data already exists
            existing_users = db.query(User).filter(User.email == "alice@example.com").first()
            if existing_users:
                print("\n⚠️  Seed data already exists in database")
                print("   Skipping seed operation")
                print("\n💡 To reset database:")
                print("   docker-compose down -v")
                print("   docker-compose up -d")
                return False
            
            print("\n🌱 Seeding database...\n")
            
            # Create users
            print("👥 Creating users...")
            users = [
                User(
                    email="alice@example.com",
                    full_name="Alice Developer",
                    hashed_password=hash_password("password123"),
                    is_active=True,
                ),
                User(
                    email="bob@example.com",
                    full_name="Bob Developer",
                    hashed_password=hash_password("password123"),
                    is_active=True,
                ),
                User(
                    email="charlie@example.com",
                    full_name="Charlie Developer",
                    hashed_password=hash_password("password123"),
                    is_active=True,
                ),
            ]
            db.add_all(users)
            db.commit()
            print(f"   ✅ Created {len(users)} users")
            
            # Create session
            print("\n📋 Creating session...")
            session = SessionModel(
                name="Sprint 45 Planning",
                description="Q4 2024 Sprint Planning",
                project_key="PROJ",
                created_by_id=users[0].id,
            )
            session.participants = users
            db.add(session)
            db.commit()
            print(f"   ✅ Created session: {session.name}")
            
            # Create issues
            print("\n📝 Creating issues...")
            issues = [
                Issue(
                    session_id=session.id,
                    jira_key="PROJ-123",
                    title="Implement user authentication",
                    description="Add JWT-based authentication",
                ),
                Issue(
                    session_id=session.id,
                    jira_key="PROJ-124",
                    title="Add email notifications",
                    description="Send email notifications for important events",
                ),
                Issue(
                    session_id=session.id,
                    jira_key="PROJ-125",
                    title="Improve UI responsiveness",
                    description="Make the UI more responsive on mobile devices",
                ),
            ]
            db.add_all(issues)
            db.commit()
            print(f"   ✅ Created {len(issues)} issues")
            
            print("\n✅ Database seeding completed!\n")
            print("📊 Summary:")
            print(f"   Users: {len(users)}")
            print(f"   Sessions: 1")
            print(f"   Issues: {len(issues)}")
            print("\n📝 Sample login credentials:")
            print("   Email: alice@example.com")
            print("   Password: password123")
            
            return True
            
        except SQLAlchemyError as e:
            db.rollback()
            print(f"\n❌ Database error: {str(e)}")
            print("\n💡 Troubleshooting:")
            print("   1. Check DATABASE_URL in .env file")
            print("   2. Ensure PostgreSQL is running")
            print("   3. Run migrations: alembic upgrade head")
            return False
        except Exception as e:
            db.rollback()
            print(f"\n❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            db.close()
    
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    try:
        success = seed_database()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
