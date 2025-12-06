'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface AgentStatus {
  is_running: boolean;
  port?: number;
  address?: string;
  last_seen?: string;
  health_status: 'healthy' | 'degraded' | 'down';
  last_activity?: string;
  message_count?: number;
  recent_errors?: string[];
  connection_status?: Record<string, boolean>;
}

interface AgentsStatus {
  judge: AgentStatus;
  target: AgentStatus;
  red_team: AgentStatus;
  started_at?: string;
}

interface UseAgentStatusWebSocketOptions {
  enabled?: boolean;
  pollInterval?: number;
  wsUrl?: string;
  apiUrl?: string;
}

export function useAgentStatusWebSocket(options: UseAgentStatusWebSocketOptions = {}) {
  const {
    enabled = true,
    pollInterval = 2000,
    wsUrl,
    apiUrl = '/api/agent-status',
  } = options;

  const [status, setStatus] = useState<AgentsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'polling'>('connecting');
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Determine WebSocket URL
  const getWebSocketUrl = useCallback(() => {
    if (wsUrl) return wsUrl;
    
    // Construct WebSocket URL from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_AGENT_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8003';
    return `${protocol}//${host}/api/agents/status/stream`;
  }, [wsUrl]);

  // Polling fallback
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch agent status');
      }
      const data: AgentsStatus = await response.json();
      setStatus(data);
      setError(null);
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsLoading(false);
      // Set default status on error
      setStatus({
        judge: { is_running: false, health_status: 'down' },
        target: { is_running: false, health_status: 'down' },
        red_team: { is_running: false, health_status: 'down' },
      });
    }
  }, [apiUrl]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!enabled) return;

    try {
      const url = getWebSocketUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setConnectionStatus('connecting');

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        
        // Clear polling if WebSocket is connected
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          // Handle heartbeat
          if (event.data === 'heartbeat' || event.data === 'pong') {
            return;
          }

          // Handle JSON status updates
          const data: AgentsStatus = JSON.parse(event.data);
          setStatus(data);
          setError(null);
          setIsLoading(false);
        } catch (err) {
          console.error('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnectionStatus('disconnected');
        wsRef.current = null;

        // Fallback to polling
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          setConnectionStatus('polling');
          reconnectAttempts.current += 1;
          
          // Start polling immediately
          fetchStatus();
          pollIntervalRef.current = setInterval(fetchStatus, pollInterval);

          // Try to reconnect WebSocket after delay
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (enabled) {
          // Max reconnection attempts reached, use polling only
          setConnectionStatus('polling');
          fetchStatus();
          pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
        }
      };

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      ws.addEventListener('close', () => {
        clearInterval(pingInterval);
      });
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
      setConnectionStatus('polling');
      // Fallback to polling
      fetchStatus();
      pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
    }
  }, [enabled, getWebSocketUrl, fetchStatus, pollInterval]);

  // Cleanup
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    // Try WebSocket first
    const wsEnabled = process.env.NEXT_PUBLIC_AGENT_WS_ENABLED !== 'false';
    if (wsEnabled) {
      connectWebSocket();
    } else {
      // Use polling only
      setConnectionStatus('polling');
      fetchStatus();
      pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
    }

    return () => {
      // Cleanup WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Cleanup polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Cleanup reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, connectWebSocket, fetchStatus, pollInterval]);

  const refetch = useCallback(() => {
    if (connectionStatus === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
      // WebSocket is connected, status will be updated automatically
      return;
    }
    // Force fetch if using polling
    fetchStatus();
  }, [connectionStatus, fetchStatus]);

  return {
    status,
    isLoading,
    error,
    connectionStatus,
    refetch,
  };
}

