'use client';

import React from 'react';
import { useAgentStatusWebSocket } from '@/hooks/useAgentStatusWebSocket';

export const RedTeamStatus = () => {
  const { status, connectionStatus, isLoading, error } = useAgentStatusWebSocket();
  const redTeamStatus = status?.red_team;

  const isRunning = redTeamStatus?.is_running ?? false;
  const healthStatus = redTeamStatus?.health_status ?? 'down';
  const port = redTeamStatus?.port ?? 8001;
  const address = redTeamStatus?.address;
  const lastActivity = redTeamStatus?.last_activity;
  const messageCount = redTeamStatus?.message_count ?? 0;
  const recentErrors = redTeamStatus?.recent_errors ?? [];
  const connectionStatusMap = redTeamStatus?.connection_status ?? {};

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
      return 'Status: Engaging Target...';
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
      {/* 1. The Icon Container */}
      <div className="relative flex h-3 w-3">
        {/* Outer Ring:
            - Default: 'animate-pulse' (Slow breathing) 
            - Hover: 'animate-ping' (Frenetic active state) 
        */}
        {isRunning && healthStatus === 'healthy' && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-pulse group-hover:animate-ping transition-all duration-300"></span>
        )}
        
        {/* Inner Solid Circle */}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${isRunning && healthStatus === 'healthy' ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]' : 'bg-gray-600'}`}></span>
      </div>
      
      {/* 2. The Text Label */}
      <span className="font-mono text-sm text-gray-400 group-hover:text-gray-100 transition-colors">
        {address ? `${address.slice(0, 8)}...${address.slice(-4)}` : 'asi-red-team-01'}
      </span>
      
      {/* 3. The Custom Tooltip (Appears on Hover) */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-3 py-2 rounded shadow-xl min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning && healthStatus === 'healthy' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
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





