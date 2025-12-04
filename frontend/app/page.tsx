'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import DashboardLayout, { useSearch } from '@/components/DashboardLayout';
import AuditList from '@/components/AuditList';
import NewAuditModal from '@/components/NewAuditModal';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';

function HomeContent() {
  const toast = useToast();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchContext = useSearch();
  const searchQuery = searchContext?.searchQuery || '';

  const handleNewAuditClick = () => {
    setIsModalOpen(true);
  };

  const handleDeploy = async (targetAddress: string, intensity: string) => {
    try {
      const response = await fetch('/api/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAddress, intensity }),
      });

      const data = await response.json();

      if (data.success) {
        toast.info('Audit started successfully');
        setIsModalOpen(false);
        // Refresh the page to show the new audit
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to start audit');
      }
    } catch (error) {
      console.error('Error starting audit:', error);
      toast.error('Failed to start audit');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Projects Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewAuditClick}
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add New...
            </button>
          </div>
        </div>

        {/* Audit List */}
        <AuditList searchQuery={searchQuery} />
      </div>
      <NewAuditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onDeploy={handleDeploy} />
    </>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Header />
      <DashboardLayout>
        <HomeContent />
      </DashboardLayout>
    </AuthGuard>
  );
}