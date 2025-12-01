'use client';

import React from 'react';

export const TargetStatus = () => {
  return (
    <div className="group relative flex items-center gap-3 cursor-help select-none w-fit">
      {/* 1. The Icon Container 
          - Color: Amber-500 (Warm orange)
          - Effect: Static by default. On hover, it brightens and adds a subtle glow drop-shadow.
      */}
      <div className="relative flex items-center justify-center h-4 w-4 text-amber-500 transition-all duration-300 group-hover:text-amber-400 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
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
        dummy-contract-v2
      </span>

      {/* 3. The Custom Tooltip */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded shadow-xl whitespace-nowrap flex items-center gap-2">
          {/* Static Amber Dot for Status */}
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Status: Listening (Port 8001)
        </div>
      </div>
    </div>
  );
};

