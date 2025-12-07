'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useAgentStatus } from '@/hooks/useAgentStatus';

const TargetStatusContent = () => {
  const { status, isLoading, error, isBackendOffline } = useAgentStatus(5000);
  const targetStatus = status?.target;

  const isRunning = targetStatus?.is_running ?? false;
  const healthStatus = targetStatus?.health_status ?? 'down';
  const port = targetStatus?.port ?? 8000;
  const lastSeen = targetStatus?.last_seen;

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
    if (!isRunning || healthStatus === 'down') {
      return 'bg-gray-500';
    } else if (healthStatus === 'degraded') {
      return 'bg-yellow-500';
    } else {
      return 'bg-amber-500';
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
      <div className={`relative flex items-center justify-center h-4 w-4 ${isRunning && healthStatus === 'healthy' && !isBackendOffline ? 'text-amber-500' : 'text-gray-500'} transition-all duration-300 ${isRunning && healthStatus === 'healthy' && !isBackendOffline ? 'group-hover:text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''}`}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Outer Ring */}
          <circle cx="12" cy="12" r="10" />
          {/* Middle Ring */}
          <circle cx="12" cy="12" r="6" />
          {/* Inner Core (Filled) */}
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Text Label */}
      <span className="font-mono text-sm text-gray-400 group-hover:text-gray-100 transition-colors">
        {isBackendOffline ? 'Backend offline' : 'target-agent'}
      </span>

      {/* Custom Tooltip */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded shadow-xl whitespace-nowrap flex items-center gap-2">
          {/* Status Dot */}
          <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></span>
          {getStatusText()} {port && `(Port ${port})`}
          {lastSeen && (
            <span className="text-gray-400 text-[10px] ml-2">
              • Last seen: {formatLastSeen(lastSeen)}
            </span>
          )}
        </div>
        {isBackendOffline && (
          <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded shadow-xl mt-1">
            <div className="text-red-400 text-[10px]">
              Cannot connect to backend API
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const TargetStatus = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 text-gray-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <span className="font-mono text-sm text-gray-400">target-agent (error)</span>
        </div>
      }
    >
      <TargetStatusContent />
    </ErrorBoundary>
  );
};
