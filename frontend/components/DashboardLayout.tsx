'use client';

import React, { useState, ReactNode, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SearchContext = createContext<{ searchQuery: string; setSearchQuery: (query: string) => void } | null>(null);

export const useSearch = () => {
  const context = useContext(SearchContext);
  return context;
};

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { href: '/', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  return (
    <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className="min-h-screen bg-black text-white">
        {/* Top Navigation Bar */}
        <div className="border-b border-[#27272a] bg-black sticky top-0 z-40">
          <div className="max-w-[1920px] mx-auto px-6">
            <div className="flex items-center gap-8">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href === '/' && pathname === '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative py-4 text-sm font-medium transition-colors ${
                      isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar */}
            <div className="col-span-3 space-y-6">
              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Q Search Projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-[#09090b] border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors duration-200 text-sm"
                />
              </div>

              {/* Usage Section */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2">Usage</h3>
                <p className="text-xs text-gray-400 mb-4">Last 30 days</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-gray-400">Audits Run</span>
                    </div>
                    <span className="text-xs text-white">0 / 100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-gray-400">Vulnerabilities Found</span>
                    </div>
                    <span className="text-xs text-white">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-xs text-gray-400">Active Audits</span>
                    </div>
                    <span className="text-xs text-white">0</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
                <div className="space-y-3">
                  <div className="text-xs text-gray-500">No recent activity</div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="col-span-9">
              {children}
            </div>
          </div>
        </div>
      </div>
    </SearchContext.Provider>
  );
}