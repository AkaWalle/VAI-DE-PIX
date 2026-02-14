"""
WebSocket /ws/activity-feed. Auth via JWT query param. Nunca logar tokens.
"""
import logging
from fastapi import WebSocket, WebSocketDisconnect, HTTPException

logger = logging.getLogger(__name__)


def _mask(s: str) -> str:
    if not s or len(s) < 6:
        return "***"
    return f"{s[:2]}...{s[-2:]}"


async def ws_activity_feed_handle(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return
    from database import SessionLocal
    from auth_utils import verify_token

    db = SessionLocal()
    try:
        user = verify_token(token, db)
        user_id = user.id
    except (HTTPException, Exception):
        logger.warning("Feed WS: token inválido para conexão")
        await websocket.close(code=4001)
        return
    finally:
        db.close()

    from realtime.feed_ws_manager import get_feed_ws_manager
    manager = get_feed_ws_manager()
    manager.connect(user_id, websocket)
    await websocket.accept()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
