'use client';

import React from 'react';
import Link from 'next/link';
import { Audit } from '@/types';

interface AuditCardProps {
  audit: Audit;
}

export default function AuditCard({ audit }: AuditCardProps) {
  const getStatusColor = (status: Audit['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'completed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getRiskScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-red-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-green-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 20) return address;
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  return (
    <Link href={`/audit/${encodeURIComponent(audit.targetAddress)}`}>
      <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200 cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-sm tracking-tight group-hover:text-white transition-colors">
                {truncateAddress(audit.targetAddress)}
              </h3>
              <p className="text-xs text-gray-500 mono">{audit.targetAddress.slice(0, 8)}...{audit.targetAddress.slice(-6)}</p>
            </div>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStatusColor(audit.status)}`}>
            {audit.status}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Created {formatDate(audit.createdAt)}</span>
            {audit.updatedAt !== audit.createdAt && (
              <span>Updated {formatDate(audit.updatedAt)}</span>
            )}
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-[#27272a]">
            {audit.vulnerabilityCount !== undefined && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs">{audit.vulnerabilityCount} vulnerabilities</span>
              </div>
            )}
            {audit.riskScore !== undefined && (
              <div className={`flex items-center gap-1 ${getRiskScoreColor(audit.riskScore)}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-xs font-medium">Risk: {audit.riskScore}</span>
              </div>
            )}
          </div>

          {audit.intensity && (
            <div className="text-xs text-gray-500">
              Intensity: <span className="text-gray-400">{audit.intensity === 'deep' ? 'Deep Probe' : 'Quick Scan'}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
    </Link>
  );
}


