'use client';

import React from 'react';

interface StatusBarProps {
  activeAuditAddress?: string;
  onNewAuditClick: () => void;
}

export default function StatusBar({ activeAuditAddress, onNewAuditClick }: StatusBarProps) {
  const displayAddress = activeAuditAddress || 'Contract-0x8a...';

  return (
    <div className="border-b border-[#27272a] bg-[#09090b]">
      <div className="max-w-[1920px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Active Audit: {displayAddress}</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#09090b] rounded border border-[#27272a]">
              <div className="w-2 h-2 bg-[#f59e0b] rounded-full pulse-amber"></div>
              <span className="text-sm font-medium text-gray-300">In Progress</span>
            </div>
          </div>
          <button
            onClick={onNewAuditClick}
            className="px-4 py-1.5 bg-white text-black rounded-lg border border-[#27272a] hover:bg-gray-100 transition-all duration-200 font-medium text-sm"
          >
            New Audit
          </button>
        </div>
      </div>
    </div>
  );
}

