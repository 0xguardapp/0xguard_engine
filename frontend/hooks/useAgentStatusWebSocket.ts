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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'polling'>('polling'); // Default to polling
  
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

    // Don't try to connect if already connecting or connected
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      const url = getWebSocketUrl();
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (err) {
        // If WebSocket constructor fails, fall back to polling
        setConnectionStatus('polling');
        fetchStatus();
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
        }
        return;
      }
      
      wsRef.current = ws;
      setConnectionStatus('connecting');

      let pingInterval: NodeJS.Timeout | null = null;
      let isClosing = false;

      ws.onopen = () => {
        try {
          if (isClosing) return;
          console.log('[WebSocket] Connected');
          setConnectionStatus('connected');
          reconnectAttempts.current = 0;
          
          // Clear polling if WebSocket is connected
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          // Send ping every 30 seconds to keep connection alive
          pingInterval = setInterval(() => {
            try {
              if (ws.readyState === WebSocket.OPEN && !isClosing) {
                ws.send('ping');
              } else {
                if (pingInterval) {
                  clearInterval(pingInterval);
                }
              }
            } catch (err) {
              // Ignore send errors if connection is closing
              if (pingInterval) {
                clearInterval(pingInterval);
              }
            }
          }, 30000);
        } catch (err) {
          // Silently handle open errors
          setConnectionStatus('polling');
          if (!pollIntervalRef.current) {
            fetchStatus();
            pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          if (isClosing) return;
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
          // Silently handle parse errors
        }
      };

      ws.onerror = (error) => {
        try {
          // Silently handle errors - will fall back to polling
          setConnectionStatus('disconnected');
        } catch (err) {
          // Ignore error handler errors
        }
      };

      ws.onclose = (event) => {
        try {
          if (pingInterval) {
            clearInterval(pingInterval);
          }
          
          isClosing = true;
          setConnectionStatus('disconnected');
          wsRef.current = null;

          // Always fall back to polling - don't try to reconnect WebSocket
          if (enabled) {
            setConnectionStatus('polling');
            fetchStatus();
            if (!pollIntervalRef.current) {
              pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
            }
          }
        } catch (err) {
          // Silently handle close errors
          setConnectionStatus('polling');
          if (enabled && !pollIntervalRef.current) {
            fetchStatus();
            pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
          }
        }
      };
    } catch (err) {
      // Silently fall back to polling
      setConnectionStatus('polling');
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

    // Default to polling to avoid WebSocket connection errors
    // WebSocket can be enabled via NEXT_PUBLIC_AGENT_WS_ENABLED=true
    const wsEnabled = process.env.NEXT_PUBLIC_AGENT_WS_ENABLED === 'true';
    
    // Always use polling by default to avoid connection errors
    // WebSocket is disabled by default
    setConnectionStatus('polling');
    fetchStatus();
    pollIntervalRef.current = setInterval(fetchStatus, pollInterval);
    
    // Only try WebSocket if explicitly enabled
    if (wsEnabled) {
      // Add a small delay to ensure component is mounted
      const connectTimeout = setTimeout(() => {
        try {
          connectWebSocket();
        } catch (err) {
          // Silently fall back to polling on any error
        }
      }, 100);
      
      return () => {
        clearTimeout(connectTimeout);
      };
    }

    return () => {
      // Cleanup WebSocket gracefully
      if (wsRef.current) {
        try {
          // Remove all event listeners before closing
          wsRef.current.onopen = null;
          wsRef.current.onmessage = null;
          wsRef.current.onerror = null;
          wsRef.current.onclose = null;
          
          if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
            wsRef.current.close(1000, 'Component unmounting');
          }
        } catch (err) {
          // Ignore cleanup errors
        }
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

