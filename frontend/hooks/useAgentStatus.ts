'use client';

import { useState, useEffect, useCallback } from 'react';

interface AgentStatus {
  is_running: boolean;
  port?: number;
  address?: string;
  last_seen?: string;
  health_status: 'healthy' | 'degraded' | 'down';
}

interface AgentsStatus {
  judge: AgentStatus;
  target: AgentStatus;
  red_team: AgentStatus;
  started_at?: string;
}

export function useAgentStatus(pollInterval: number = 5000) {
  const [status, setStatus] = useState<AgentsStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/agent-status', {
        cache: 'no-store',
      });
      
      if (!response.ok) {
        // Check if it's a connection error (503, 504, etc.)
        if (response.status === 503 || response.status === 504) {
          setIsBackendOffline(true);
          setError('Backend offline');
        } else {
          throw new Error(`Failed to fetch agent status: ${response.status}`);
        }
        setIsLoading(false);
        return;
      }
      
      const data: AgentsStatus = await response.json();
      
      // Check if response has error field indicating backend issue
      if (data.error) {
        setIsBackendOffline(true);
        setError('Backend offline');
      } else {
        setIsBackendOffline(false);
        setError(null);
      }
      
      setStatus(data);
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsBackendOffline(true);
      setIsLoading(false);
      // Set default status on error
      setStatus({
        judge: { is_running: false, health_status: 'down' },
        target: { is_running: false, health_status: 'down' },
        red_team: { is_running: false, health_status: 'down' },
      });
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up polling interval (5 seconds)
    const interval = setInterval(fetchStatus, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchStatus, pollInterval]);

  return {
    status,
    isLoading,
    error,
    isBackendOffline,
    refetch: fetchStatus,
  };
}

