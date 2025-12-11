#!/usr/bin/env python
"""Create admin user script with interactive options

Usage:
    python scripts/create_admin.py                    # Interactive mode
    python scripts/create_admin.py --email admin@example.com --password secure123
    python scripts/create_admin.py --reset            # Reset admin password
    python scripts/create_admin.py --list             # List all admins
"""

import sys
import argparse
from getpass import getpass
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

try:
    from app.database import SessionLocal, engine, Base
    from app.models.user import User
    from app.utils.security import hash_password, verify_password
except ImportError as e:
    print(f"Error: Could not import required modules: {e}")
    print("Make sure you are in the project root directory and have installed dependencies.")
    sys.exit(1)


class AdminManager:
    """Manager for admin user operations"""

    def __init__(self):
        """Initialize database session"""
        Base.metadata.create_all(bind=engine)
        self.db: Session = SessionLocal()

    def __del__(self):
        """Close database session"""
        if hasattr(self, 'db'):
            self.db.close()

    def create_admin(self, email: str, password: str, full_name: str = None) -> bool:
        """Create a new admin user
        
        Args:
            email: Admin email address
            password: Admin password
            full_name: Admin full name (optional)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Check if user already exists
            existing = self.db.query(User).filter(User.email == email).first()
            if existing:
                print(f"❌ User with email '{email}' already exists")
                return False
            
            # Validate password strength
            if len(password) < 8:
                print("❌ Password must be at least 8 characters long")
                return False
            
            # Create admin user
            admin = User(
                email=email,
                full_name=full_name or "Admin User",
                hashed_password=hash_password(password),
                is_admin=True,
                is_active=True,
            )
            self.db.add(admin)
            self.db.commit()
            self.db.refresh(admin)
            
            print(f"✅ Admin user created successfully")
            print(f"   ID: {admin.id}")
            print(f"   Email: {admin.email}")
            print(f"   Full Name: {admin.full_name}")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"❌ Database error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

    def reset_password(self, email: str, new_password: str) -> bool:
        """Reset admin password
        
        Args:
            email: Admin email address
            new_password: New password
            
        Returns:
            True if successful, False otherwise
        """
        try:
            user = self.db.query(User).filter(User.email == email).first()
            if not user:
                print(f"❌ User '{email}' not found")
                return False
            
            if not user.is_admin:
                print(f"❌ User '{email}' is not an admin")
                return False
            
            # Validate password strength
            if len(new_password) < 8:
                print("❌ Password must be at least 8 characters long")
                return False
            
            user.hashed_password = hash_password(new_password)
            self.db.commit()
            
            print(f"✅ Password reset successfully for {email}")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"❌ Database error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

    def list_admins(self) -> bool:
        """List all admin users
        
        Returns:
            True if successful, False otherwise
        """
        try:
            admins = self.db.query(User).filter(User.is_admin == True).all()
            
            if not admins:
                print("ℹ️  No admin users found")
                return True
            
            print(f"\n📋 Admin Users ({len(admins)}):")
            print("-" * 70)
            print(f"{'ID':<5} {'Email':<30} {'Full Name':<25} {'Active':<7}")
            print("-" * 70)
            
            for admin in admins:
                active = "✅" if admin.is_active else "❌"
                print(f"{admin.id:<5} {admin.email:<30} {admin.full_name:<25} {active:<7}")
            
            print("-" * 70)
            return True
            
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

    def promote_to_admin(self, email: str) -> bool:
        """Promote regular user to admin
        
        Args:
            email: User email address
            
        Returns:
            True if successful, False otherwise
        """
        try:
            user = self.db.query(User).filter(User.email == email).first()
            if not user:
                print(f"❌ User '{email}' not found")
                return False
            
            if user.is_admin:
                print(f"ℹ️  User '{email}' is already an admin")
                return True
            
            user.is_admin = True
            self.db.commit()
            
            print(f"✅ User '{email}' promoted to admin")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"❌ Database error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

    def demote_from_admin(self, email: str) -> bool:
        """Demote admin to regular user
        
        Args:
            email: Admin email address
            
        Returns:
            True if successful, False otherwise
        """
        try:
            user = self.db.query(User).filter(User.email == email).first()
            if not user:
                print(f"❌ User '{email}' not found")
                return False
            
            if not user.is_admin:
                print(f"ℹ️  User '{email}' is not an admin")
                return True
            
            user.is_admin = False
            self.db.commit()
            
            print(f"✅ User '{email}' demoted from admin")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"❌ Database error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False

    def delete_user(self, email: str) -> bool:
        """Delete a user
        
        Args:
            email: User email address
            
        Returns:
            True if successful, False otherwise
        """
        try:
            user = self.db.query(User).filter(User.email == email).first()
            if not user:
                print(f"❌ User '{email}' not found")
                return False
            
            self.db.delete(user)
            self.db.commit()
            
            print(f"✅ User '{email}' deleted successfully")
            return True
            
        except SQLAlchemyError as e:
            self.db.rollback()
            print(f"❌ Database error: {str(e)}")
            return False
        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return False


def interactive_mode():
    """Interactive mode for creating admin"""
    print("\n" + "=" * 70)
    print("🎯 Agile Planning Poker - Admin User Manager")
    print("=" * 70 + "\n")
    
    manager = AdminManager()
    
    while True:
        print("\n📌 Choose an action:")
        print("  1. Create new admin user")
        print("  2. Reset admin password")
        print("  3. List all admin users")
        print("  4. Promote user to admin")
        print("  5. Demote admin to user")
        print("  6. Delete user")
        print("  0. Exit")
        
        choice = input("\nEnter your choice (0-6): ").strip()
        
        if choice == "0":
            print("\n👋 Goodbye!")
            break
        
        elif choice == "1":
            print("\n➕ Create New Admin User")
            email = input("Email: ").strip()
            if not email:
                print("❌ Email is required")
                continue
            
            full_name = input("Full Name (optional, press Enter to skip): ").strip()
            
            password = getpass("Password (min 8 characters): ")
            password_confirm = getpass("Confirm Password: ")
            
            if password != password_confirm:
                print("❌ Passwords do not match")
                continue
            
            manager.create_admin(email, password, full_name if full_name else None)
        
        elif choice == "2":
            print("\n🔐 Reset Admin Password")
            email = input("Email: ").strip()
            if not email:
                print("❌ Email is required")
                continue
            
            password = getpass("New Password (min 8 characters): ")
            password_confirm = getpass("Confirm Password: ")
            
            if password != password_confirm:
                print("❌ Passwords do not match")
                continue
            
            manager.reset_password(email, password)
        
        elif choice == "3":
            manager.list_admins()
        
        elif choice == "4":
            print("\n⬆️  Promote User to Admin")
            email = input("Email: ").strip()
            if not email:
                print("❌ Email is required")
                continue
            
            manager.promote_to_admin(email)
        
        elif choice == "5":
            print("\n⬇️  Demote Admin to User")
            email = input("Email: ").strip()
            if not email:
                print("❌ Email is required")
                continue
            
            confirm = input(f"Are you sure you want to demote {email}? (yes/no): ").strip().lower()
            if confirm == "yes":
                manager.demote_from_admin(email)
        
        elif choice == "6":
            print("\n🗑️  Delete User")
            email = input("Email: ").strip()
            if not email:
                print("❌ Email is required")
                continue
            
            confirm = input(f"Are you sure you want to delete {email}? (yes/no): ").strip().lower()
            if confirm == "yes":
                manager.delete_user(email)
        
        else:
            print("❌ Invalid choice. Please try again.")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Agile Planning Poker - Admin User Manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  python scripts/create_admin.py
  python scripts/create_admin.py --email admin@example.com --password secure123
  python scripts/create_admin.py --reset --email admin@example.com
  python scripts/create_admin.py --list
  python scripts/create_admin.py --promote --email user@example.com
  python scripts/create_admin.py --demote --email admin@example.com
  python scripts/create_admin.py --delete --email user@example.com
        """
    )
    
    parser.add_argument("--email", help="Admin email address")
    parser.add_argument("--password", help="Admin password")
    parser.add_argument("--name", help="Full name")
    parser.add_argument("--reset", action="store_true", help="Reset password for existing admin")
    parser.add_argument("--list", action="store_true", help="List all admin users")
    parser.add_argument("--promote", action="store_true", help="Promote user to admin")
    parser.add_argument("--demote", action="store_true", help="Demote admin to user")
    parser.add_argument("--delete", action="store_true", help="Delete user")
    
    args = parser.parse_args()
    manager = AdminManager()
    
    # If no arguments provided, use interactive mode
    if not any([args.email, args.reset, args.list, args.promote, args.demote, args.delete]):
        interactive_mode()
        return
    
    # Command-line mode
    if args.list:
        manager.list_admins()
    
    elif args.reset:
        if not args.email:
            print("❌ Email is required for password reset")
            sys.exit(1)
        
        if not args.password:
            password = getpass("New Password: ")
            password_confirm = getpass("Confirm Password: ")
            if password != password_confirm:
                print("❌ Passwords do not match")
                sys.exit(1)
        else:
            password = args.password
        
        manager.reset_password(args.email, password)
    
    elif args.promote:
        if not args.email:
            print("❌ Email is required")
            sys.exit(1)
        manager.promote_to_admin(args.email)
    
    elif args.demote:
        if not args.email:
            print("❌ Email is required")
            sys.exit(1)
        manager.demote_from_admin(args.email)
    
    elif args.delete:
        if not args.email:
            print("❌ Email is required")
            sys.exit(1)
        manager.delete_user(args.email)
    
    elif args.email:
        # Create new admin
        if not args.password:
            password = getpass("Password: ")
            password_confirm = getpass("Confirm Password: ")
            if password != password_confirm:
                print("❌ Passwords do not match")
                sys.exit(1)
        else:
            password = args.password
        
        manager.create_admin(args.email, password, args.name)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 Interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {str(e)}")
        sys.exit(1)
