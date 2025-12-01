'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import StatusBar from '@/components/StatusBar';
import NewAuditModal from '@/components/NewAuditModal';
import AgentCard from '@/components/AgentCard';
import { RedTeamStatus } from '@/components/RedTeamStatus';
import { TargetStatus } from '@/components/TargetStatus';
import { JudgeStatus } from '@/components/JudgeStatus';
import Terminal from '@/components/Terminal';
import HivemindList from '@/components/HivemindList';
import ZKProofsList from '@/components/ZKProofsList';
import { useLogs } from '@/hooks/useLogs';
import { useToast } from '@/hooks/useToast';

export default function Home() {
  const { logs, resetLogs } = useLogs();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAuditAddress, setActiveAuditAddress] = useState<string | undefined>();

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
        // Clear terminal logs
        resetLogs();
        
        // Update active audit address
        setActiveAuditAddress(targetAddress);
        
        // Show success toast
        toast.info('Swarm deployed successfully');
        
        // Close modal
        setIsModalOpen(false);
      } else {
        toast.error(data.error || 'Failed to deploy swarm');
      }
    } catch (error) {
      console.error('Error deploying swarm:', error);
      toast.error('Failed to deploy swarm');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <StatusBar activeAuditAddress={activeAuditAddress} onNewAuditClick={handleNewAuditClick} />
      <NewAuditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onDeploy={handleDeploy} />

      {/* Main Dashboard Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        <div className="bg-[#0f1114] rounded-lg p-6 shadow-[0_0_10px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-12 gap-4">
            {/* Left Column: Swarm Status */}
            <div className="col-span-3">
              <h2 className="text-lg font-semibold mb-4 tracking-tight">Active Agents</h2>
              <div className="space-y-2">
              {/* Red Team Status */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
                <RedTeamStatus />
              </div>

              {/* Target Status */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
                <TargetStatus />
              </div>

              {/* Judge Status */}
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
                <JudgeStatus />
              </div>
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
  );
}
