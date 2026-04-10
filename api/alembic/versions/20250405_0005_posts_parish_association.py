"""posts_parish_association — no-op (posts table removed)

Revision ID: 0005
Revises: 0004
Create Date: 2025-04-05
"""
from typing import Sequence, Union

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
