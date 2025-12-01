'use client';

import React from 'react';
import type { LogEntry } from '@/types';

interface AgentCardProps {
  name: string;
  status: string;
  icon: React.ReactNode;
  model?: string;
  logs: LogEntry[];
}

export default function AgentCard({ name, status, icon, model, logs }: AgentCardProps) {
  // Determine status from logs
  const actorName = name.toLowerCase();
  const relevantLogs = logs.filter((log) => {
    const logActor = log.actor.toLowerCase();
    return logActor.includes(actorName.split('-')[0]) || logActor.includes(actorName);
  });

  let displayStatus = status;
  if (relevantLogs.length > 0) {
    const lastLog = relevantLogs[relevantLogs.length - 1];
    if (actorName.includes('red') || actorName.includes('asi')) {
      if (lastLog.message.includes('Generating') || lastLog.message.includes('ASI')) {
        displayStatus = 'Generating Vector via ASI...';
      } else if (lastLog.type === 'attack') {
        displayStatus = 'Attacking -> Target';
      } else {
        displayStatus = 'Thinking...';
      }
    } else if (actorName.includes('target') || actorName.includes('dummy') || actorName.includes('contract')) {
      if (lastLog.message.includes('Listening') || lastLog.message.includes('port')) {
        displayStatus = 'Port 8001: Listening';
      } else if (lastLog.type === 'vulnerability') {
        displayStatus = 'Vulnerability Triggered!';
      } else {
        displayStatus = 'Port 8001: Listening';
      }
    } else if (actorName.includes('judge')) {
      if (lastLog.type === 'proof' || lastLog.message.includes('Proof')) {
        displayStatus = 'Verifying output...';
      } else if (lastLog.message.includes('INTERCEPTION') || lastLog.message.includes('Monitoring')) {
        displayStatus = 'Monitoring Logs';
      } else {
        displayStatus = 'Monitoring Logs';
      }
    }
  }

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="flex items-center space-x-2">{icon}</div>
        <div className="flex-1">
          <div className="font-medium mono mb-1 text-white">{name}</div>
          <div className="text-sm text-gray-300 mono">{displayStatus}</div>
          {model && <div className="text-xs text-gray-500 mono mt-1">Model: {model}</div>}
        </div>
      </div>
    </div>
  );
}

