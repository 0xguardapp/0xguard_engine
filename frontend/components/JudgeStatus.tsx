'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useAgentStatus } from '@/hooks/useAgentStatus';

const JudgeStatusContent = () => {
  const { status, isLoading, error, isBackendOffline } = useAgentStatus(5000);
  const judgeStatus = status?.judge;

  const isRunning = judgeStatus?.is_running ?? false;
  const healthStatus = judgeStatus?.health_status ?? 'down';
  const port = judgeStatus?.port ?? 8002;
  const lastSeen = judgeStatus?.last_seen;

  const getStatusText = () => {
    if (isLoading) {
      return 'Status: Loading...';
    }
    if (isBackendOffline || error) {
      return 'Status: Backend offline';
    }
    if (!isRunning || healthStatus === 'down') {
      return 'Status: Not running';
    } else if (healthStatus === 'degraded') {
      return 'Status: Degraded';
    } else {
      return 'Status: Running';
    }
  };

  const getStatusColor = () => {
    if (isBackendOffline || error) {
      return 'bg-gray-600';
    }
    if (error || (!isRunning && !isLoading)) {
      return 'bg-gray-500';
    } else if (healthStatus === 'degraded') {
      return 'bg-yellow-500';
    } else if (isLoading) {
      return 'bg-gray-400';
    } else {
      return 'bg-cyan-500';
    }
  };

  const formatLastSeen = (timestamp?: string) => {
    if (!timestamp) return null;
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      
      if (diffSecs < 60) return `${diffSecs}s ago`;
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return null;
    }
  };

  return (
    <div className="group relative flex items-center gap-3 cursor-help select-none w-fit">
      {/* Icon Container */}
      <div className={`relative flex items-center justify-center h-4 w-4 ${isRunning && healthStatus === 'healthy' && !isBackendOffline ? 'text-cyan-400' : 'text-gray-500'} transition-all duration-300 ${isRunning && healthStatus === 'healthy' && !isBackendOffline ? 'group-hover:text-cyan-300 group-hover:rotate-6 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''} origin-center`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Main Balance Beam */}
          <path d="M3 7h18" />
          {/* Central Stand */}
          <path d="M12 4v16" />
          <path d="M8 20h8" />
          {/* Left Pan */}
          <path d="M3 7l2 6" />
          <path d="M3 7l-2 6" />
          <path d="M1 13h4" />
          {/* Right Pan */}
          <path d="M21 7l-2 6" />
          <path d="M21 7l2 6" />
          <path d="M19 13h4" />
        </svg>
      </div>

      {/* Text Label */}
      <span className="font-mono text-sm text-gray-400 group-hover:text-gray-100 transition-colors">
        {isBackendOffline ? 'Backend offline' : 'judge-agent'}
      </span>

      {/* Custom Tooltip */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-3 py-2 rounded shadow-xl min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            {/* Status Dot */}
            <span className={`relative flex h-1.5 w-1.5 rounded-full ${getStatusColor()}`}>
              {isRunning && healthStatus === 'healthy' && !isBackendOffline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              )}
            </span>
            <span>{getStatusText()}</span>
            {port && <span className="text-gray-400">(Port {port})</span>}
          </div>
          
          {lastSeen && (
            <div className="text-gray-400 text-[10px] mb-1">
              Last seen: {formatLastSeen(lastSeen)}
            </div>
          )}
          {isBackendOffline && (
            <div className="text-red-400 text-[10px] mt-1 border-t border-zinc-700 pt-1">
              Cannot connect to backend API
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const JudgeStatus = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 text-gray-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h18" />
              <path d="M12 4v16" />
              <path d="M8 20h8" />
            </svg>
          </div>
          <span className="font-mono text-sm text-gray-400">judge-agent (error)</span>
        </div>
      }
    >
      <JudgeStatusContent />
    </ErrorBoundary>
  );
};
