/**
 * WebSocket Hook for Real-Time Updates
 *
 * Provides WebSocket connection management with automatic reconnection
 * and message handling for PDF generation progress.
 *
 * Usage:
 *   const { isConnected, lastMessage } = useWebSocket();
 *
 *   useEffect(() => {
 *     if (lastMessage?.type === 'pdf_complete') {
 *       // Reload PDF preview
 *     }
 *   }, [lastMessage]);
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

// Debug on module load
console.log('%c[WebSocket Module] Loaded', 'color: blue; font-weight: bold');
console.log('[WebSocket Module] WS_URL:', WS_URL);

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 2000; // 2 seconds

  const connect = useCallback(() => {
    // Get token from localStorage (same key as api.js uses)
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('❌ No auth token found - skipping WebSocket connection');
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      // Create WebSocket connection with token
      const wsUrl = `${WS_URL}/api/projects/ws?token=${token}`;
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully!');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        ws.pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        // Handle pong response
        if (event.data === 'pong') {
          return;
        }

        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected - Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);

        // Clear ping interval
        if (ws.pingInterval) {
          clearInterval(ws.pingInterval);
        }

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
        }
      };

      wsRef.current = ws;

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }, []);

  // Debug: Log when hook initializes
  useEffect(() => {
    console.log('🚀 useWebSocket hook initialized');
    console.log('🔑 Token available:', !!localStorage.getItem('access_token'));
    console.log('🌐 WS_URL:', WS_URL);
  }, []);

  const disconnect = useCallback(() => {
    console.log('🛑 DISCONNECT called - Stack trace:', new Error().stack);

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      if (wsRef.current.pingInterval) {
        clearInterval(wsRef.current.pingInterval);
      }
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount/unmount

  // Reconnect when token changes (e.g., user logs in)
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !isConnected && wsRef.current?.readyState !== WebSocket.CONNECTING) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]); // Only depend on isConnected, not connect function

  return {
    isConnected,
    lastMessage,
    reconnect: connect,
    disconnect
  };
};

export default useWebSocket;
