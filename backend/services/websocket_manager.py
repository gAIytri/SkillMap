"""
WebSocket Connection Manager

Handles WebSocket connections for real-time updates:
- PDF generation progress
- System notifications
- Real-time collaboration (future)

Usage:
    from services.websocket_manager import manager
    await manager.send_message(user_id, {"type": "pdf_progress", "data": {...}})
"""

import logging
from typing import Dict
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections for real-time updates

    Key features:
    - Per-user connection tracking
    - Broadcast to specific users
    - Automatic cleanup on disconnect
    - Type-safe message sending
    """

    def __init__(self):
        # Store active connections: {user_id: WebSocket}
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        """
        Register WebSocket connection for user
        (Note: websocket.accept() should be called BEFORE this method)

        Args:
            websocket: WebSocket instance (already accepted)
            user_id: User ID for this connection
        """
        # Close existing connection if user reconnects
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].close()
                logger.info(f"Closed old connection for user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to close old connection: {e}")

        self.active_connections[user_id] = websocket
        logger.info(f"✓ WebSocket connected: user_id={user_id} (total: {len(self.active_connections)})")

    def disconnect(self, user_id: int):
        """
        Remove user connection

        Args:
            user_id: User ID to disconnect
        """
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"✗ WebSocket disconnected: user_id={user_id} (total: {len(self.active_connections)})")

    async def send_message(self, user_id: int, message: dict):
        """
        Send message to specific user

        Args:
            user_id: Target user ID
            message: Message dictionary (will be JSON-serialized)

        Returns:
            bool: True if sent successfully, False if user not connected
        """
        if user_id not in self.active_connections:
            logger.warning(f"Cannot send message - user {user_id} not connected")
            return False

        try:
            websocket = self.active_connections[user_id]
            await websocket.send_json(message)
            logger.debug(f"Message sent to user {user_id}: {message.get('type', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"Failed to send message to user {user_id}: {e}")
            # Connection broken, clean up
            self.disconnect(user_id)
            return False

    async def send_pdf_progress(self, user_id: int, project_id: int, progress: str, status: str = "generating"):
        """
        Send PDF generation progress update

        Args:
            user_id: Target user ID
            project_id: Project being compiled
            progress: Progress message (e.g., "Building DOCX...", "Converting to PDF...")
            status: Status ("generating", "ready", "error")
        """
        message = {
            "type": "pdf_progress",
            "data": {
                "project_id": project_id,
                "status": status,
                "progress": progress
            }
        }
        await self.send_message(user_id, message)

    async def send_pdf_complete(self, user_id: int, project_id: int):
        """
        Send PDF generation complete notification

        Args:
            user_id: Target user ID
            project_id: Project that finished compiling
        """
        message = {
            "type": "pdf_complete",
            "data": {
                "project_id": project_id,
                "status": "ready"
            }
        }
        await self.send_message(user_id, message)

    async def send_pdf_error(self, user_id: int, project_id: int, error: str):
        """
        Send PDF generation error notification

        Args:
            user_id: Target user ID
            project_id: Project that failed
            error: Error message
        """
        message = {
            "type": "pdf_error",
            "data": {
                "project_id": project_id,
                "status": "error",
                "error": error
            }
        }
        await self.send_message(user_id, message)

    def is_connected(self, user_id: int) -> bool:
        """
        Check if user is currently connected

        Args:
            user_id: User ID to check

        Returns:
            bool: True if connected
        """
        return user_id in self.active_connections

    def get_connection_count(self) -> int:
        """
        Get total number of active connections

        Returns:
            int: Number of connected users
        """
        return len(self.active_connections)


# Global singleton instance
manager = ConnectionManager()
