'use client';

import React from 'react';
import { useAgentStatusWebSocket } from '@/hooks/useAgentStatusWebSocket';

export const TargetStatus = () => {
  const { status, connectionStatus, isLoading, error } = useAgentStatusWebSocket();
  const targetStatus = status?.target;

  const isRunning = targetStatus?.is_running ?? false;
  const healthStatus = targetStatus?.health_status ?? 'down';
  const port = targetStatus?.port ?? 8000;
  const address = targetStatus?.address;
  const lastActivity = targetStatus?.last_activity;
  const messageCount = targetStatus?.message_count ?? 0;
  const recentErrors = targetStatus?.recent_errors ?? [];
  const connectionStatusMap = targetStatus?.connection_status ?? {};

  const getStatusText = () => {
    if (isLoading) {
      return 'Status: Loading...';
    }
    if (error) {
      return 'Status: Error';
    }
    if (!isRunning || healthStatus === 'down') {
      return 'Status: Offline';
    } else if (healthStatus === 'degraded') {
      return 'Status: Degraded';
    } else {
      return 'Status: Listening';
    }
  };

  const getStatusColor = () => {
    if (error || (!isRunning && !isLoading)) {
      return 'bg-gray-500';
    } else if (healthStatus === 'degraded') {
      return 'bg-yellow-500';
    } else if (isLoading) {
      return 'bg-gray-400';
    } else {
      return 'bg-amber-500';
    }
  };

  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'Never';
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
      return 'Unknown';
    }
  };

  return (
    <div className="group relative flex items-center gap-3 cursor-help select-none w-fit">
      {/* 1. The Icon Container 
          - Color: Amber-500 (Warm orange)
          - Effect: Static by default. On hover, it brightens and adds a subtle glow drop-shadow.
      */}
      <div className={`relative flex items-center justify-center h-4 w-4 ${isRunning && healthStatus === 'healthy' ? 'text-amber-500' : 'text-gray-500'} transition-all duration-300 ${isRunning && healthStatus === 'healthy' ? 'group-hover:text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : ''}`}>
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

      {/* 2. The Text Label */}
      <span className="font-mono text-sm text-gray-400 group-hover:text-gray-100 transition-colors">
        {address ? `${address.slice(0, 8)}...${address.slice(-4)}` : 'dummy-contract-v2'}
      </span>

      {/* 3. The Custom Tooltip */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-3 py-2 rounded shadow-xl min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            {/* Status Dot */}
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`}></span>
            <span>{getStatusText()}</span>
            {port && <span className="text-gray-400">(Port {port})</span>}
          </div>
          
          {/* Enhanced Information */}
          {address && (
            <div className="text-gray-400 text-[10px] mb-1">
              Address: {address.slice(0, 8)}...{address.slice(-4)}
            </div>
          )}
          {lastActivity && (
            <div className="text-gray-400 text-[10px] mb-1">
              Last Activity: {formatLastActivity(lastActivity)}
            </div>
          )}
          {messageCount > 0 && (
            <div className="text-gray-400 text-[10px] mb-1">
              Messages: {messageCount}
            </div>
          )}
          {Object.keys(connectionStatusMap).length > 0 && (
            <div className="text-gray-400 text-[10px] mb-1">
              Connections: {Object.entries(connectionStatusMap)
                .filter(([_, connected]) => connected)
                .map(([agent]) => agent)
                .join(', ') || 'None'}
            </div>
          )}
          {recentErrors.length > 0 && (
            <div className="text-red-400 text-[10px] mt-1 border-t border-zinc-700 pt-1">
              Errors: {recentErrors.length}
            </div>
          )}
          {connectionStatus && (
            <div className="text-gray-500 text-[10px] mt-1 border-t border-zinc-700 pt-1">
              Connection: {connectionStatus === 'connected' ? 'WebSocket' : connectionStatus === 'polling' ? 'Polling' : 'Disconnected'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




