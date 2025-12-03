'use client';

import React from 'react';

export const JudgeStatus = () => {
  return (
    <div className="group relative flex items-center gap-3 cursor-help select-none w-fit">
      {/* 1. The Icon Container 
          - Color: Cyan-400 (Electric Blue)
          - Effect: Static by default. 
          - Hover: Glows bright cyan and tilts slightly (weighing evidence).
      */}
      <div className="relative flex items-center justify-center h-4 w-4 text-cyan-400 transition-all duration-300 group-hover:text-cyan-300 group-hover:rotate-6 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)] origin-center">
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

      {/* 2. The Text Label */}
      <span className="font-mono text-sm text-gray-400 group-hover:text-gray-100 transition-colors">
        unibase-judge-oracle
      </span>

      {/* 3. The Custom Tooltip */}
      <div className="absolute left-0 -bottom-8 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-10">
        <div className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded shadow-xl whitespace-nowrap flex items-center gap-2">
          {/* Pulsing Cyan Dot for 'Processing' */}
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
          </span>
          Status: Verifying Logs...
        </div>
      </div>
    </div>
  );
};




