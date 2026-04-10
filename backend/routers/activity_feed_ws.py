"""
WebSocket /ws/activity-feed. Auth via message handshake (never via query param).

Handshake flow:
  1. Client connects (no token in URL).
  2. Server accepts and sends {"type": "auth_required"}.
  3. Client must reply with {"type": "auth", "token": "<JWT>"} within 10 seconds.
  4. Server validates the token; closes with 4001 on failure or timeout.
  5. On success the connection enters normal receive loop.
"""
import asyncio
import json
import logging
from fastapi import WebSocket, WebSocketDisconnect, HTTPException

logger = logging.getLogger(__name__)

_AUTH_TIMEOUT_SECONDS = 10


async def ws_activity_feed_handle(websocket: WebSocket) -> None:
    await websocket.accept()

    # Step 1: challenge the client
    await websocket.send_json({"type": "auth_required"})

    # Step 2: wait for auth message
    try:
        raw = await asyncio.wait_for(
            websocket.receive_text(),
            timeout=_AUTH_TIMEOUT_SECONDS,
        )
        msg = json.loads(raw)
    except asyncio.TimeoutError:
        logger.warning("Feed WS: auth timeout — connection closed")
        await websocket.close(code=4001)
        return
    except Exception:
        await websocket.close(code=4001)
        return

    if msg.get("type") != "auth" or not msg.get("token"):
        await websocket.close(code=4001)
        return

    token: str = msg["token"]

    # Step 3: validate token
    from database import SessionLocal
    from auth_utils import verify_token

    db = SessionLocal()
    try:
        user = verify_token(token, db)
        user_id = user.id
    except (HTTPException, Exception):
        logger.warning("Feed WS: invalid token — connection closed")
        await websocket.close(code=4001)
        return
    finally:
        db.close()

    # Step 4: register connection and enter receive loop
    from realtime.feed_ws_manager import get_feed_ws_manager
    manager = get_feed_ws_manager()
    manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
