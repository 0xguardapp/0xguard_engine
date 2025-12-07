'use client';

import { useState, useEffect, useCallback } from 'react';
import { Audit } from '@/types';

interface UseAuditsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  status?: Audit['status'];
  owner?: string; // Filter by owner wallet address
}

interface UseAuditsReturn {
  audits: Audit[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
}

export function useAudits(options: UseAuditsOptions = {}): UseAuditsReturn {
  const { autoRefresh = false, refreshInterval = 30000, status, owner } = options;
  
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseAuditsReturn['pagination']>(null);

  const fetchAudits = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const params = new URLSearchParams();
      if (status) {
        params.append('status', status);
      }
      if (owner) {
        params.append('owner', owner);
      }
      
      const queryString = params.toString();
      const url = `/api/audits${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch audits' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch audits`);
      }

      const data = await response.json();
      
      if (data.audits && Array.isArray(data.audits)) {
        setAudits(data.audits);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch audits';
      setError(errorMessage);
      console.error('Error fetching audits:', err);
      setAudits([]); // Clear audits on error
    } finally {
      setLoading(false);
    }
  }, [status, owner]);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAudits();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAudits]);

  return {
    audits,
    loading,
    error,
    refetch: fetchAudits,
    pagination,
  };
}

