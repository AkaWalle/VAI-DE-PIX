from sqlalchemy import Column, Integer, String, Float, Numeric, DateTime, Boolean, Text, ForeignKey, JSON, Index, CheckConstraint
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
    # Última vez que o job semanal de insights notificou o usuário (C2)
    insights_last_notified_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    envelopes = relationship("Envelope", back_populates="user", cascade="all, delete-orphan")
    automation_rules = relationship("AutomationRule", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    shared_expenses_created = relationship("SharedExpense", back_populates="creator", cascade="all, delete-orphan")
    expense_shares = relationship("ExpenseShare", back_populates="user", cascade="all, delete-orphan")
    expense_share_events = relationship("ExpenseShareEvent", back_populates="performer", cascade="all, delete-orphan")
    activity_feed_items = relationship("ActivityFeedItem", back_populates="user", cascade="all, delete-orphan")
    
    # Constraints
    # Note: Regex constraints removed for SQLite compatibility
    # Email validation is handled in Pydantic schemas
    __table_args__ = (
        CheckConstraint("length(name) >= 2", name="check_user_name_length"),
    )

class Account(Base):
    """
    Conta do usuário. row_version (Trilha 6.2) para concorrência segura:
    incrementado a cada mudança de saldo; validação em UPDATE evita conflitos (409).
    """
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # checking, savings, investment, credit, cash
    balance = Column(Numeric(15, 2), default=0, nullable=False)
    row_version = Column(Integer, default=0, nullable=False)  # Trilha 6.2: optimistic locking
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    balance_snapshots = relationship("AccountBalanceSnapshot", back_populates="account", cascade="all, delete-orphan")

    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint("type IN ('checking', 'savings', 'investment', 'credit', 'cash')", name="check_account_type"),
        CheckConstraint("length(name) >= 1", name="check_account_name_length"),
        Index('idx_accounts_user_type', 'user_id', 'type'),
    )


class AccountBalanceSnapshot(Base):
    """
    Snapshot mensal de saldo por conta (Trilha 5 — performance sem perder verdade).
    snapshot_date = primeiro dia do mês (YYYY-MM-01). Saldo = soma do ledger até o fim do mês.
    Ledger continua sendo a fonte da verdade; snapshots são cache derivado.
    """
    __tablename__ = "account_balance_snapshots"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date = Column(DateTime(timezone=True), nullable=False, index=True)  # YYYY-MM-01 00:00:00
    balance = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    account = relationship("Account", back_populates="balance_snapshots")

    __table_args__ = (
        Index("idx_balance_snapshots_account_date", "account_id", "snapshot_date", unique=True),
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
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(String(200), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transfer_transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True)  # migração c42fc5c6c743
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # soft delete (migração final_pre_launch_critical_fixes)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    transaction_tag_links = relationship(
        "TransactionTag",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )

    @property
    def tags(self):
        """Lista de nomes de tags (via tabela transaction_tags)."""
        return [tt.tag.name for tt in self.transaction_tag_links]

    # Constraints and Indexes
    __table_args__ = (
        CheckConstraint("type IN ('income', 'expense', 'transfer')", name="check_transaction_type"),
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
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0, nullable=False)
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
    balance = Column(Numeric(15, 2), default=0, nullable=False)
    target_amount = Column(Numeric(15, 2), nullable=True)
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


class Notification(Base):
    """Notificações in-app para o usuário (alertas, lembretes, resumos)."""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # budget_alert, goal_reminder, low_balance, summary, etc.
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Dados extras (ex: category_id, goal_id) para link no front
    metadata_ = Column("metadata", JSON, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        CheckConstraint("length(title) >= 1", name="check_notification_title_length"),
        Index('idx_notifications_user_read', 'user_id', 'read_at'),
        Index('idx_notifications_user_created', 'user_id', 'created_at'),
    )


class SharedExpense(Base):
    """Despesa compartilhada criada por um usuário; pode ter shares (convites) para outros."""
    __tablename__ = "shared_expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # active, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    creator = relationship("User", back_populates="shared_expenses_created")
    shares = relationship("ExpenseShare", back_populates="expense", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('active', 'cancelled')", name="check_shared_expense_status"),
        CheckConstraint("amount > 0", name="check_shared_expense_amount_positive"),
    )


class ExpenseShare(Base):
    """Parcela/convite de uma despesa compartilhada para um usuário; status pending/accepted/rejected."""
    __tablename__ = "expense_shares"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id = Column(String, ForeignKey("shared_expenses.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="pending", nullable=False)  # pending, accepted, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    expense = relationship("SharedExpense", back_populates="shares")
    user = relationship("User", back_populates="expense_shares")
    events = relationship("ExpenseShareEvent", back_populates="share", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'accepted', 'rejected')", name="check_expense_share_status"),
        Index("idx_expense_shares_expense_user", "expense_id", "user_id"),
    )


class ExpenseShareEvent(Base):
    """Auditoria de ações em expense_shares (created, accepted, rejected)."""
    __tablename__ = "expense_share_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    share_id = Column(String, ForeignKey("expense_shares.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(20), nullable=False)  # created, accepted, rejected
    performed_by = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    share = relationship("ExpenseShare", back_populates="events")
    performer = relationship("User", back_populates="expense_share_events")

    __table_args__ = (
        CheckConstraint("action IN ('created', 'accepted', 'rejected')", name="check_expense_share_event_action"),
    )


class ActivityFeedItem(Base):
    """Activity feed por usuário (eventos, convites, etc.). Fonte: expense_share_events e futuras."""
    __tablename__ = "activity_feed"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    user = relationship("User", back_populates="activity_feed_items")


class Tag(Base):
    """Tags para categorização de transações (tabela tags)."""
    __tablename__ = "tags"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    transaction_links = relationship(
        "TransactionTag",
        back_populates="tag",
    )


class TransactionTag(Base):
    """Associação transação–tag (tabela transaction_tags)."""
    __tablename__ = "transaction_tags"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id = Column(String, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    transaction = relationship("Transaction", back_populates="transaction_tag_links")
    tag = relationship("Tag", back_populates="transaction_links")


class LedgerEntry(Base):
    """
    Ledger contábil imutável (append-only).
    Cada movimento de conta gera uma entrada; saldo = SUM(amount) por account_id.
    Não permitir UPDATE nem DELETE; apenas INSERT.
    """
    __tablename__ = "ledger_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True)
    amount = Column(Numeric(15, 2), nullable=False)  # signed: credit > 0, debit < 0
    entry_type = Column(String(10), nullable=False)  # 'credit' | 'debit'
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "entry_type IN ('credit', 'debit')",
            name="check_ledger_entry_type"
        ),
        CheckConstraint(
            "(entry_type = 'credit' AND amount > 0) OR (entry_type = 'debit' AND amount < 0)",
            name="check_ledger_amount_sign"
        ),
        Index("idx_ledger_entries_account_created", "account_id", "created_at"),
        Index("idx_ledger_entries_user_created", "user_id", "created_at"),
    )


class IdempotencyKey(Base):
    """
    Chaves de idempotência (Trilha 5 — Idempotência Real).
    Mesmo (user_id, key, endpoint) → mesmo efeito e mesma resposta.
    status: in_progress | completed | failed (erro antes do commit não é cacheado).
    TTL: expires_at (default 24h); limpeza futura via job (documentado).
    """
    __tablename__ = "idempotency_keys"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(64), nullable=False, index=True)
    endpoint = Column(String(128), nullable=False, index=True)
    request_hash = Column(String(64), nullable=False)
    status = Column(String(20), nullable=False, default="in_progress")  # in_progress | completed | failed
    response_status = Column(Integer, nullable=True)  # HTTP status da resposta cacheada
    response_body = Column(JSON, nullable=True)  # corpo da resposta (apenas se status=completed)
    response_payload = Column(JSON, nullable=True)  # legado; preferir response_body
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # TTL default 24h

    __table_args__ = (
        CheckConstraint(
            "status IN ('in_progress', 'completed', 'failed')",
            name="check_idempotency_status",
        ),
        Index("idx_idempotency_user_key_endpoint", "user_id", "key", "endpoint", unique=True),
        Index("idx_idempotency_expires_at", "expires_at"),
    )


class UserSession(Base):
    """
    Sessão de usuário para refresh tokens.
    refresh_token_hash: hash do token (nunca armazenar o token em claro).
    Revogação: deletar a linha ou marcar revoked_at.
    """
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256 hex
    device = Column(String(200), nullable=True)
    ip = Column(String(45), nullable=True)  # IPv6 max
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sessions")

    __table_args__ = (
        Index("idx_user_sessions_user_expires", "user_id", "expires_at"),
    )


class InsightCache(Base):
    """
    Cache de insights financeiros por usuário (preenchido pelo job diário).
    GET /insights lê daqui; se ausente ou antigo, recalcula e salva.
    """
    __tablename__ = "insight_cache"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    computed_at = Column(DateTime(timezone=True), nullable=False)
    data = Column(JSON, nullable=False)  # { category_monthly_variation, goals_at_risk, computed_at }


class InsightFeedback(Base):
    """
    Feedback do usuário sobre insights: visto ou ignorado.
    Insights marcados como 'ignored' não reaparecem por 30 dias (TTL).
    """
    __tablename__ = "insight_feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    insight_type = Column(String(50), nullable=False)  # category_variation | goal_at_risk
    insight_hash = Column(String(255), nullable=False, index=True)  # identificador estável do insight
    status = Column(String(20), nullable=False)  # seen | ignored
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("status IN ('seen', 'ignored')", name="check_insight_feedback_status"),
        Index("idx_insight_feedback_user_ignored", "user_id", "insight_hash", "created_at"),
    )


class UserInsightPreferences(Base):
    """
    Preferências do usuário sobre quais insights exibir no dashboard.
    Se não existir linha para o usuário, assume-se habilitado (True) para ambos.
    """
    __tablename__ = "user_insight_preferences"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    enable_category_variation = Column(Boolean, default=True, nullable=False)
    enable_goals_at_risk = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
