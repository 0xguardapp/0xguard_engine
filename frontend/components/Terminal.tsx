'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/types';

interface TerminalProps {
  logs: LogEntry[];
}

export default function Terminal({ logs }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [followLogs, setFollowLogs] = useState(true);

  useEffect(() => {
    if (followLogs && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, followLogs]);

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-lg overflow-hidden hover:border-gray-700 transition-all duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold tracking-tight">Terminal</h2>
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={followLogs}
            onChange={(e) => setFollowLogs(e.target.checked)}
            className="w-4 h-4 cursor-pointer accent-gray-700 hover:accent-gray-600 transition-colors duration-200"
          />
          <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-200">
            Follow
          </span>
        </label>
      </div>
      <div
        ref={terminalRef}
        className="h-[600px] overflow-y-auto p-4 bg-black mono text-sm terminal-scrollbar"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">Waiting for agent activity...</div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              className={`terminal-line ${log.is_vulnerability ? 'vulnerability-line' : ''}`}
            >
              <span className="terminal-timestamp">[{log.timestamp}]</span>
              <span className="terminal-icon">{log.icon}</span>
              <span className="terminal-actor">{log.actor}:</span>
              <span className="terminal-message"> {log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

