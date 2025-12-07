'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import DashboardLayout, { useSearch } from '@/components/DashboardLayout';
import AuditList from '@/components/AuditList';
import NewAuditModal from '@/components/NewAuditModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';

function HomeContent() {
  const toast = useToast();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const searchContext = useSearch();
  const searchQuery = searchContext?.searchQuery || '';
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      fetch('/api/register-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_address: address }),
      }).catch((error) => {
        console.error('Failed to register agent:', error);
      });
    }
  }, [isConnected, address]);

  const handleNewAuditClick = () => {
    setIsModalOpen(true);
  };

  const handleDeploy = useCallback(async (targetAddress: string, intensity: string) => {
    setIsDeploying(true);
    
    try {
      console.log('[Home] Starting audit deployment:', { targetAddress, intensity });
      
      const response = await fetch('/api/audit/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAddress, intensity }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle HTTP errors
        const errorMessage = data.error || data.message || `HTTP ${response.status}: Failed to start audit`;
        console.error('[Home] Audit deployment failed:', {
          status: response.status,
          error: errorMessage,
          data,
        });
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      if (data.success) {
        console.log('[Home] Audit deployed successfully:', data.auditId);
        
        toast.success(`Audit started successfully! Audit ID: ${data.auditId || 'Unknown'}`);
        setIsModalOpen(false);
        
        // Wait a moment before refreshing to ensure the notification is visible
        setTimeout(() => {
          router.refresh();
        }, 500);
      } else {
        const errorMessage = data.error || data.message || 'Failed to start audit';
        console.error('[Home] Audit deployment failed:', errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[Home] Error starting audit:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error: Unable to connect to server. Please check your connection.');
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to start audit. Please try again.');
      }
      
      // Re-throw to let the modal handle it
      throw error;
    } finally {
      setIsDeploying(false);
    }
  }, [router, toast]);

  return (
    <>
      <div className="space-y-6">
        {/* Projects Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <button
            onClick={handleNewAuditClick}
            disabled={isDeploying}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New...
          </button>
        </div>

        {/* Audit List */}
        <ErrorBoundary
          fallback={
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
                <h3 className="text-lg font-semibold text-white mb-2">Failed to load audits</h3>
                <p className="text-sm text-gray-400 mb-4">
                  An error occurred while loading the audit list. Please refresh the page.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Refresh page
                </button>
              </div>
            </div>
          }
        >
          <AuditList searchQuery={searchQuery} />
        </ErrorBoundary>
      </div>
      <NewAuditModal 
        isOpen={isModalOpen} 
        onClose={() => !isDeploying && setIsModalOpen(false)} 
        onDeploy={handleDeploy} 
      />
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