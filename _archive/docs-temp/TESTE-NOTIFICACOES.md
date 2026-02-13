# Como testar a funcionalidade de Notificações in-app

## 1. Backend

### Aplicar a migração (se usar Alembic)

```bash
cd backend
alembic upgrade head
```

### Rodar os testes de notificações

```bash
cd backend
python -m pytest tests/test_notifications.py -v
```

Os testes verificam:

- Listagem vazia e com dados
- Contagem de não lidas (`/api/notifications/unread-count`)
- Obter uma notificação por ID
- Marcar uma como lida
- Marcar todas como lidas
- Exigência de autenticação (401/403 sem token)
- Isolamento entre usuários (não ver notificação de outro usuário)

## 2. Frontend

O sino de notificações aparece no **header** (canto superior direito), ao lado do botão de tema.

- Clique no sino para abrir a lista.
- Se houver não lidas, aparece um badge com o número.
- Clique em uma notificação não lida para marcá-la como lida.
- Use "Marcar todas como lidas" para limpar o badge.

## 3. Testar ponta a ponta (manual)

1. Subir o backend: `cd backend && python main.py`
2. Subir o frontend: `npm run dev`
3. Fazer login (ex.: admin@vaidepix.com / 123456)
4. Criar uma notificação de teste (por exemplo via script ou endpoint interno).  
   Ou aguardar uma automação futura (ex.: budget_alert) que crie notificações.
5. Abrir o sino no header e conferir se a notificação aparece e se marcar como lida funciona.

## 4. Criar notificação de teste via Python (opcional)

No diretório do backend, com o ambiente ativado:

```python
from database import SessionLocal
from services.notification_service import create_notification
from models import User

db = SessionLocal()
user = db.query(User).filter(User.email == "admin@vaidepix.com").first()
if user:
    create_notification(db, user.id, "info", "Teste", "Esta é uma notificação de teste.")
    print("Notificação criada!")
db.close()
```

Depois, atualize a página do frontend e abra o sino para ver a notificação.
