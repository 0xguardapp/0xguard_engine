'use client';

import React, { useState, useEffect } from 'react';
import { Audit } from '@/types';
import AuditCard from './AuditCard';

interface AuditListProps {
  searchQuery?: string;
}

export default function AuditList({ searchQuery = '' }: AuditListProps) {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | Audit['status']>('all');

  useEffect(() => {
    const fetchAudits = async () => {
      try {
        const response = await fetch('/api/audits');
        const data = await response.json();
        setAudits(data.audits || []);
      } catch (error) {
        console.error('Error fetching audits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAudits();
  }, []);

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = audit.targetAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || audit.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading audits...</div>
      </div>
    );
  }

  if (filteredAudits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <svg className="w-12 h-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-gray-400 mb-2">No audits found</p>
        <p className="text-sm text-gray-500">Create a new audit to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              filterStatus === 'all'
                ? 'bg-white text-black'
                : 'bg-[#09090b] text-gray-400 hover:text-white border border-[#27272a]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              filterStatus === 'active'
                ? 'bg-white text-black'
                : 'bg-[#09090b] text-gray-400 hover:text-white border border-[#27272a]'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              filterStatus === 'completed'
                ? 'bg-white text-black'
                : 'bg-[#09090b] text-gray-400 hover:text-white border border-[#27272a]'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              filterStatus === 'failed'
                ? 'bg-white text-black'
                : 'bg-[#09090b] text-gray-400 hover:text-white border border-[#27272a]'
            }`}
          >
            Failed
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[#09090b] border border-[#27272a] rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'grid' ? 'bg-[#27272a] text-white' : 'text-gray-400 hover:text-white'
            }`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-all ${
              viewMode === 'list' ? 'bg-[#27272a] text-white' : 'text-gray-400 hover:text-white'
            }`}
            aria-label="List view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Audit Cards */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }
      >
        {filteredAudits.map((audit) => (
          <AuditCard key={audit.id} audit={audit} />
        ))}
      </div>
    </div>
  );
}


