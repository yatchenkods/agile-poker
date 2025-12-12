"""Add session estimators table for selective voting

Revision ID: 003_add_session_estimators
Revises: 002_add_joker_card
Create Date: 2025-12-12 15:41:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_add_session_estimators'
down_revision = '002_add_joker_card'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create session_estimators table
    op.create_table(
        'session_estimators',
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('session_id', 'user_id')
    )


def downgrade() -> None:
    # Drop session_estimators table
    op.drop_table('session_estimators')
