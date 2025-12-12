"""Add joker card support to estimates

Revision ID: 002_add_joker_card
Revises: 
Create Date: 2025-12-12 14:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_joker_card'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_joker column to estimates table
    op.add_column('estimates', sa.Column('is_joker', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    # Remove is_joker column
    op.drop_column('estimates', 'is_joker')
