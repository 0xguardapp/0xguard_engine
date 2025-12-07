'use client';

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useAgentStatus } from '@/hooks/useAgentStatus';

const RedTeamStatusContent = () => {
  const { status, isLoading, error, isBackendOffline } = useAgentStatus(5000);
  const redTeamStatus = status?.red_team;

  const isRunning = redTeamStatus?.is_running ?? false;
  const healthStatus = redTeamStatus?.health_status ?? 'down';
  const port = redTeamStatus?.port ?? 8001;
  const lastSeen = redTeamStatus?.last_seen;

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
      <div className="relative flex h-3 w-3">
        {/* Outer Ring */}
        {isRunning && healthStatus === 'healthy' && !isBackendOffline && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-pulse group-hover:animate-ping transition-all duration-300"></span>
        )}
        
        {/* Inner Solid Circle */}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning && healthStatus === 'healthy' && !isBackendOffline ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]' : 'bg-gray-600'}`}></span>
      </div>
      
      {/* Text Label */}
      <span className="font-mono text-sm text-gray-400 group-hover:text-gray-100 transition-colors">
        {isBackendOffline ? 'Backend offline' : 'red-team-agent'}
      </span>
      
      {/* Custom Tooltip */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded shadow-xl whitespace-nowrap flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isRunning && healthStatus === 'healthy' && !isBackendOffline ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
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

export const RedTeamStatus = () => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-gray-600"></div>
          <span className="font-mono text-sm text-gray-400">red-team-agent (error)</span>
        </div>
      }
    >
      <RedTeamStatusContent />
    </ErrorBoundary>
  );
};
