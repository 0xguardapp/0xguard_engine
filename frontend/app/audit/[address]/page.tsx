'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import StatusBar from '@/components/StatusBar';
import NewAuditModal from '@/components/NewAuditModal';
import { RedTeamStatus } from '@/components/RedTeamStatus';
import { TargetStatus } from '@/components/TargetStatus';
import { JudgeStatus } from '@/components/JudgeStatus';
import Terminal from '@/components/Terminal';
import HivemindList from '@/components/HivemindList';
import ZKProofsList from '@/components/ZKProofsList';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useLogs } from '@/hooks/useLogs';
import { useToast } from '@/hooks/useToast';

export default function AuditDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { logs, resetLogs } = useLogs();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [auditAddress, setAuditAddress] = useState<string>('');

  useEffect(() => {
    if (params?.address) {
      const address = typeof params.address === 'string' 
        ? decodeURIComponent(params.address)
        : Array.isArray(params.address) 
          ? decodeURIComponent(params.address[0])
          : '';
      setAuditAddress(address);
    }
  }, [params]);

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
        resetLogs();
        setAuditAddress(targetAddress);
        toast.info('Swarm deployed successfully');
        setIsModalOpen(false);
        router.push(`/audit/${encodeURIComponent(targetAddress)}`);
      } else {
        toast.error(data.error || 'Failed to deploy swarm');
      }
    } catch (error) {
      console.error('Error deploying swarm:', error);
      toast.error('Failed to deploy swarm');
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white">
        <Header />
      <StatusBar activeAuditAddress={auditAddress} onNewAuditClick={handleNewAuditClick} />
      <NewAuditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onDeploy={handleDeploy} />

      {/* Back Button */}
      <div className="max-w-[1920px] mx-auto px-6 pt-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Overview
        </button>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-[1920px] mx-auto px-6 pb-6">
        <div className="bg-[#0f1114] rounded-lg p-6 shadow-[0_0_10px_rgba(0,0,0,0.25)]">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Audit Details</h1>
            <p className="text-sm text-gray-400 mono">{auditAddress || 'Loading...'}</p>
          </div>

          <div className="grid grid-cols-12 gap-4 mt-6">
            {/* Left Column: Swarm Status */}
            <div className="col-span-3">
              <h2 className="text-lg font-semibold mb-4 tracking-tight">Active Agents</h2>
              <div className="space-y-2">
                {/* Red Team Status */}
                <ErrorBoundary
                  fallback={
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 text-xs text-gray-400">
                      Status unavailable
                    </div>
                  }
                >
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
                    <RedTeamStatus />
                  </div>
                </ErrorBoundary>

                {/* Target Status */}
                <ErrorBoundary
                  fallback={
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 text-xs text-gray-400">
                      Status unavailable
                    </div>
                  }
                >
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
                    <TargetStatus />
                  </div>
                </ErrorBoundary>

                {/* Judge Status */}
                <ErrorBoundary
                  fallback={
                    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 text-xs text-gray-400">
                      Status unavailable
                    </div>
                  }
                >
                  <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
                    <JudgeStatus />
                  </div>
                </ErrorBoundary>
              </div>
            </div>

            {/* Center Column: Live Terminal */}
            <div className="col-span-6">
              <Terminal logs={logs} />
            </div>

            {/* Right Column: Memory & Proofs */}
            <div className="col-span-3 space-y-4">
              <HivemindList logs={logs} />
              <ZKProofsList logs={logs} />
            </div>
          </div>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
}
