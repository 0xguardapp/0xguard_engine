'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { LogEntry } from '@/types';
import { useToast } from './useToast';

export function useLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastLogCount, setLastLogCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const toast = useToast();
  const processedLogsRef = useRef<Set<string>>(new Set());

  const resetLogs = useCallback(() => {
    setLogs([]);
    setLastLogCount(0);
    processedLogsRef.current.clear();
  }, []);

  useEffect(() => {
    const pollLogs = async () => {
      try {
        const response = await fetch('/api/logs');
        if (!response.ok) {
          return;
        }
        const newLogs: LogEntry[] = await response.json();
        
        if (newLogs.length > lastLogCount) {
          const newEntries = newLogs.slice(lastLogCount);
          
          // Process new entries and trigger toasts
          newEntries.forEach((entry) => {
            const logKey = `${entry.timestamp}-${entry.actor}-${entry.message}`;
            if (!processedLogsRef.current.has(logKey)) {
              processedLogsRef.current.add(logKey);
              
              // Trigger toasts based on log content
              if (entry.actor.includes('ASI') && entry.message.includes('Generating')) {
                toast.thinking();
              } else if (entry.type === 'vulnerability' || entry.is_vulnerability) {
                toast.success('Vulnerability Found & Saved to Memory');
              } else if (entry.type === 'proof' || (entry.message.includes('Proof') && entry.message.includes('Minted'))) {
                toast.proof('ZK Proof Minted on Midnight');
              }
            }
          });
          
          setLogs((prev) => [...prev, ...newEntries]);
          setLastLogCount(newLogs.length);
        }
      } catch (error) {
        // Silently fail if logs.json doesn't exist yet
        console.debug('Logs not available yet');
      }
    };

    // Initial poll
    pollLogs();

    // Set up polling interval
    intervalRef.current = setInterval(pollLogs, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastLogCount, toast]);

  return { logs, resetLogs };
}

