"""WebSocket connection handler for sessions"""

import json
import logging
from typing import Dict, List
from fastapi import WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.session import Session as SessionModel
from app.utils.security import jwt
from app.config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket connection manager"""

    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        """Accept WebSocket connection"""
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        logger.info(f"User connected to session {session_id}")

    async def disconnect(self, websocket: WebSocket, session_id: int):
        """Close WebSocket connection"""
        self.active_connections[session_id].remove(websocket)
        if not self.active_connections[session_id]:
            del self.active_connections[session_id]
        logger.info(f"User disconnected from session {session_id}")

    async def broadcast(self, session_id: int, message: dict):
        """Broadcast message to all users in session"""
        if session_id not in self.active_connections:
            return
        
        for connection in self.active_connections[session_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting message: {str(e)}")

    async def broadcast_to_others(self, websocket: WebSocket, session_id: int, message: dict):
        """Broadcast message to all users except sender"""
        if session_id not in self.active_connections:
            return
        
        for connection in self.active_connections[session_id]:
            if connection != websocket:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting message: {str(e)}")


manager = ConnectionManager()


async def websocket_endpoint(websocket: WebSocket, session_id: int, token: str):
    """WebSocket endpoint for session updates"""
    
    # Verify token
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email = payload.get("sub")
    except Exception as e:
        logger.error(f"WebSocket authentication failed: {str(e)}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Connect to session
    db: Session = SessionLocal()
    try:
        await manager.connect(websocket, session_id)
        
        # Verify session exists
        session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if not session:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Send connection confirmation
        await websocket.send_json({
            "type": "connection",
            "data": {
                "session_id": session_id,
                "message": "Connected to session",
            },
        })
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "estimate":
                # Broadcast estimate to all users
                await manager.broadcast(session_id, {
                    "type": "estimate_update",
                    "data": message.get("data"),
                })
            
            elif message.get("type") == "ping":
                # Respond to ping
                await websocket.send_json({"type": "pong"})
    
    except WebSocketDisconnect:
        manager.active_connections[session_id].remove(websocket)
        
        # Notify others
        await manager.broadcast(session_id, {
            "type": "user_disconnected",
            "data": {"email": email},
        })
    
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    
    finally:
        db.close()
        await manager.disconnect(websocket, session_id)
