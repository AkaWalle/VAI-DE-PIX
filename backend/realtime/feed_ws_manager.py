"""
Gerenciador de conexões WebSocket para activity feed.
Nunca envia feed de outro usuário; logs mascarados.
"""
import asyncio
import json
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


def _mask(s: str, length: int = 4) -> str:
    if not s or len(s) < length:
        return "***"
    return f"{s[:2]}...{s[-2:]}"


class FeedWSManager:
    """Mantém conexões por user_id e envia mensagens apenas ao usuário dono."""

    def __init__(self) -> None:
        self._connections_by_user: Dict[str, List[Any]] = {}

    def connect(self, user_id: str, websocket: Any) -> None:
        if user_id not in self._connections_by_user:
            self._connections_by_user[user_id] = []
        self._connections_by_user[user_id].append(websocket)
        logger.info("Feed WS: user %s connected (total %d)", _mask(user_id), len(self._connections_by_user[user_id]))

    def disconnect(self, user_id: str, websocket: Any) -> None:
        if user_id not in self._connections_by_user:
            return
        try:
            self._connections_by_user[user_id].remove(websocket)
        except ValueError:
            pass
        if not self._connections_by_user[user_id]:
            del self._connections_by_user[user_id]
        logger.info("Feed WS: user %s disconnected", _mask(user_id))

    async def send_to_user(self, user_id: str, message: dict) -> None:
        """Envia mensagem apenas às conexões deste user_id. Nunca envia feed de outro usuário."""
        if user_id not in self._connections_by_user:
            return
        payload = json.dumps(message, default=str)
        dead = []
        for ws in self._connections_by_user[user_id]:
            try:
                await ws.send_text(payload)
            except Exception as e:
                logger.warning("Feed WS send to user %s failed: %s", _mask(user_id), type(e).__name__)
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


_manager: FeedWSManager | None = None


def get_feed_ws_manager() -> FeedWSManager:
    global _manager
    if _manager is None:
        _manager = FeedWSManager()
    return _manager
