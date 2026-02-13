"""migrate_tags_data_and_remove_old_column

Revision ID: 3847e4a390ba
Revises: c42fc5c6c743
Create Date: 2025-11-21 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import json
import uuid
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = '3847e4a390ba'
down_revision: Union[str, Sequence[str], None] = 'c42fc5c6c743'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Migra dados de tags JSON para tabelas relacionais e remove coluna antiga."""
    
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # Verificar se a coluna tags ainda existe
    inspector = sa.inspect(bind)
    transactions_columns = [col['name'] for col in inspector.get_columns('transactions')]
    
    if 'tags' not in transactions_columns:
        # Coluna já foi removida, nada a fazer
        return
    
    # 1. MIGRAR DADOS DE TAGS JSON PARA TABELAS RELACIONAIS
    print("Migrando tags de JSON para tabelas relacionais...")
    
    # Buscar todas as transações com tags
    if is_postgresql:
        # PostgreSQL: usar JSONB functions
        result = bind.execute(sa.text("""
            SELECT id, user_id, tags
            FROM transactions
            WHERE tags IS NOT NULL
            AND tags::text != 'null'
            AND tags::text != '[]'
        """))
    else:
        # SQLite: tags é JSON armazenado como texto
        result = bind.execute(sa.text("""
            SELECT id, user_id, tags
            FROM transactions
            WHERE tags IS NOT NULL
            AND tags != ''
            AND tags != 'null'
            AND tags != '[]'
        """))
    
    transactions_with_tags = result.fetchall()
    
    # Dicionário para cache de tags criadas (user_id -> {tag_name: tag_id})
    tags_cache = {}
    
    for transaction_id, user_id, tags_json in transactions_with_tags:
        if not tags_json:
            continue
        
        try:
            # Parse do JSON
            if isinstance(tags_json, str):
                tags_list = json.loads(tags_json)
            else:
                tags_list = tags_json
            
            # Garantir que é uma lista
            if not isinstance(tags_list, list):
                continue
            
            # Processar cada tag
            for tag_name_raw in tags_list:
                if not tag_name_raw:
                    continue
                
                # Limpar e normalizar nome da tag
                tag_name = str(tag_name_raw).strip()
                if not tag_name:
                    continue
                
                # Se a tag contém vírgulas, separar
                if ',' in tag_name or ', ' in tag_name:
                    # Separar por vírgula
                    sub_tags = [t.strip() for t in tag_name.replace(', ', ',').split(',') if t.strip()]
                    for sub_tag in sub_tags:
                        _process_tag(bind, is_postgresql, transaction_id, user_id, sub_tag, tags_cache)
                else:
                    _process_tag(bind, is_postgresql, transaction_id, user_id, tag_name, tags_cache)
        
        except (json.JSONDecodeError, ValueError, TypeError) as e:
            print(f"Erro ao processar tags da transação {transaction_id}: {e}")
            continue
    
    print(f"Migração de tags concluída. {len(transactions_with_tags)} transações processadas.")
    
    # 2. REMOVER COLUNA TAGS ANTIGA
    print("Removendo coluna tags antiga...")
    op.drop_column('transactions', 'tags')
    print("Coluna tags removida com sucesso.")


def _process_tag(bind, is_postgresql, transaction_id, user_id, tag_name, tags_cache):
    """Processa uma tag individual, criando se necessário e vinculando à transação."""
    
    # Normalizar nome (trim, lowercase opcional - você pode remover lowercase se quiser case-sensitive)
    tag_name_normalized = tag_name.strip()
    if not tag_name_normalized:
        return
    
    # Verificar cache
    if user_id not in tags_cache:
        tags_cache[user_id] = {}
    
    # Verificar se tag já existe no cache
    if tag_name_normalized in tags_cache[user_id]:
        tag_id = tags_cache[user_id][tag_name_normalized]
    else:
        # Verificar se tag já existe no banco
        existing_tag = bind.execute(sa.text("""
            SELECT id FROM tags
            WHERE user_id = :user_id AND LOWER(TRIM(name)) = LOWER(:tag_name)
        """), {"user_id": user_id, "tag_name": tag_name_normalized}).fetchone()
        
        if existing_tag:
            tag_id = existing_tag[0]
        else:
            # Criar nova tag
            tag_id = str(uuid.uuid4())
            try:
                bind.execute(sa.text("""
                    INSERT INTO tags (id, name, user_id, created_at)
                    VALUES (:id, :name, :user_id, CURRENT_TIMESTAMP)
                """), {
                    "id": tag_id,
                    "name": tag_name_normalized,
                    "user_id": user_id
                })
            except Exception:
                # Se falhar (ex: unique constraint), buscar tag existente
                existing_tag = bind.execute(sa.text("""
                    SELECT id FROM tags
                    WHERE user_id = :user_id AND LOWER(TRIM(name)) = LOWER(:tag_name)
                """), {"user_id": user_id, "tag_name": tag_name_normalized}).fetchone()
                if existing_tag:
                    tag_id = existing_tag[0]
                else:
                    raise
        
        # Adicionar ao cache
        tags_cache[user_id][tag_name_normalized] = tag_id
    
    # Verificar se vínculo já existe
    existing_link = bind.execute(sa.text("""
        SELECT id FROM transaction_tags
        WHERE transaction_id = :transaction_id AND tag_id = :tag_id
    """), {"transaction_id": transaction_id, "tag_id": tag_id}).fetchone()
    
    if not existing_link:
        # Criar vínculo
        link_id = str(uuid.uuid4())
        bind.execute(sa.text("""
            INSERT INTO transaction_tags (id, transaction_id, tag_id, created_at)
            VALUES (:id, :transaction_id, :tag_id, CURRENT_TIMESTAMP)
        """), {
            "id": link_id,
            "transaction_id": transaction_id,
            "tag_id": tag_id
        })


def downgrade() -> None:
    """Reverter migração - restaurar coluna tags e migrar dados de volta."""
    
    bind = op.get_bind()
    is_postgresql = bind.dialect.name == 'postgresql'
    
    # 1. Recriar coluna tags
    op.add_column('transactions', 
        sa.Column('tags', postgresql.JSON(astext_type=sa.Text()) if is_postgresql else sa.JSON(), nullable=True))
    
    # 2. Migrar dados de volta de transaction_tags para JSON
    # Buscar todas as transações com tags
    result = bind.execute(sa.text("""
        SELECT t.id, array_agg(tg.name) as tag_names
        FROM transactions t
        JOIN transaction_tags tt ON t.id = tt.transaction_id
        JOIN tags tg ON tt.tag_id = tg.id
        GROUP BY t.id
    """))
    
    transactions_with_tags = result.fetchall()
    
    for transaction_id, tag_names in transactions_with_tags:
        if tag_names:
            tags_json = json.dumps(tag_names)
            bind.execute(sa.text("""
                UPDATE transactions
                SET tags = :tags
                WHERE id = :transaction_id
            """), {
                "tags": tags_json if is_postgresql else json.loads(tags_json),
                "transaction_id": transaction_id
            })
