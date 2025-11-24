from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON, Index, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    envelopes = relationship("Envelope", back_populates="user", cascade="all, delete-orphan")
    automation_rules = relationship("AutomationRule", back_populates="user", cascade="all, delete-orphan")
    
    # Constraints
    # Note: Regex constraints removed for SQLite compatibility
    # Email validation is handled in Pydantic schemas
    __table_args__ = (
        CheckConstraint("length(name) >= 2", name="check_user_name_length"),
    )

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # checking, savings, investment, credit, cash
    balance = Column(Float, default=0.0, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    
    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint("type IN ('checking', 'savings', 'investment', 'credit', 'cash')", name="check_account_type"),
        CheckConstraint("length(name) >= 1", name="check_account_name_length"),
        Index('idx_accounts_user_type', 'user_id', 'type'),
    )

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False)
    type = Column(String(20), nullable=False)  # income, expense
    color = Column(String(7), nullable=False)  # Hex color format
    icon = Column(String(10), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category", cascade="all, delete-orphan")
    
    # Constraints and Indexes
    # Note: Color format validation is handled in Pydantic schemas for SQLite compatibility
    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_category_type"),
        CheckConstraint("length(name) >= 1", name="check_category_name_length"),
        CheckConstraint("length(color) = 7", name="check_category_color_length"),  # #RRGGBB format
        Index('idx_categories_user_type', 'user_id', 'type'),
        Index('idx_categories_user_name', 'user_id', 'name'),
    )

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(20), nullable=False)  # income, expense
    amount = Column(Float, nullable=False)
    description = Column(String(200), nullable=False)
    tags = Column(JSON, nullable=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    
    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense')", name="check_transaction_type"),
        CheckConstraint("amount > 0", name="check_transaction_amount_positive"),
        CheckConstraint("length(description) >= 1", name="check_transaction_description_length"),
        Index('idx_transactions_user_date', 'user_id', 'date'),
        Index('idx_transactions_user_type', 'user_id', 'type'),
        Index('idx_transactions_account_date', 'account_id', 'date'),
        Index('idx_transactions_category_date', 'category_id', 'date'),
    )

class Goal(Base):
    __tablename__ = "goals"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0, nullable=False)
    target_date = Column(DateTime(timezone=True), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)
    priority = Column(String(20), nullable=False)  # low, medium, high
    status = Column(String(20), default="active", nullable=False)  # active, achieved, on_track, at_risk, overdue
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="goals")
    
    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint("target_amount > 0", name="check_goal_target_amount_positive"),
        CheckConstraint("current_amount >= 0", name="check_goal_current_amount_non_negative"),
        CheckConstraint("current_amount <= target_amount", name="check_goal_current_not_exceed_target"),
        CheckConstraint("priority IN ('low', 'medium', 'high')", name="check_goal_priority"),
        CheckConstraint("status IN ('active', 'achieved', 'on_track', 'at_risk', 'overdue')", name="check_goal_status"),
        CheckConstraint("length(name) >= 1", name="check_goal_name_length"),
        Index('idx_goals_user_status', 'user_id', 'status'),
        Index('idx_goals_user_priority', 'user_id', 'priority'),
        Index('idx_goals_user_target_date', 'user_id', 'target_date'),
    )

class Envelope(Base):
    __tablename__ = "envelopes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    balance = Column(Float, default=0.0, nullable=False)
    target_amount = Column(Float, nullable=True)
    color = Column(String(7), nullable=False)  # Hex color format
    description = Column(Text, nullable=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="envelopes")
    
    # Constraints and Indexes
    # Note: Color format validation is handled in Pydantic schemas for SQLite compatibility
    __table_args__ = (
        CheckConstraint("balance >= 0", name="check_envelope_balance_non_negative"),
        CheckConstraint("target_amount IS NULL OR target_amount > 0", name="check_envelope_target_amount_positive"),
        CheckConstraint("length(color) = 7", name="check_envelope_color_length"),  # #RRGGBB format
        CheckConstraint("length(name) >= 1", name="check_envelope_name_length"),
        Index('idx_envelopes_user_name', 'user_id', 'name'),
    )

class AutomationRule(Base):
    __tablename__ = "automation_rules"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(30), nullable=False)  # recurring_transaction, budget_alert, goal_reminder, webhook
    is_active = Column(Boolean, default=True, nullable=False)
    conditions = Column(JSON, nullable=False)
    actions = Column(JSON, nullable=False)
    last_run = Column(DateTime(timezone=True), nullable=True)
    next_run = Column(DateTime(timezone=True), nullable=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="automation_rules")
    
    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint("type IN ('recurring_transaction', 'budget_alert', 'goal_reminder', 'webhook')", name="check_automation_type"),
        CheckConstraint("length(name) >= 1", name="check_automation_name_length"),
        Index('idx_automation_user_active', 'user_id', 'is_active'),
        Index('idx_automation_user_type', 'user_id', 'type'),
        Index('idx_automation_next_run', 'next_run'),
    )
