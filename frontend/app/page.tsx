'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import StatusBar from '@/components/StatusBar';
import NewAuditModal from '@/components/NewAuditModal';
import AgentCard from '@/components/AgentCard';
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
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Swarm Status */}
          <div className="col-span-3">
            <h2 className="text-lg font-semibold mb-4 tracking-tight">Active Agents</h2>
            <div className="space-y-3">
              {/* Red Team Card */}
              <AgentCard
                name="asi-red-team-01"
                status="Thinking..."
                model="asi1-agentic"
                logs={logs}
                icon={
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                  </span>
                }
              />

              {/* Target Card */}
              <AgentCard
                name="dummy-contract-v2"
                status="Listening on port 8000"
                logs={logs}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[#F5A623] hover:filter hover:brightness-125 transition-all duration-200"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <circle cx="12" cy="12" r="6"></circle>
                    <circle cx="12" cy="12" r="2"></circle>
                  </svg>
                }
              />

              {/* Judge Card */}
              <AgentCard
                name="judge-oracle"
                status="Standby"
                logs={logs}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-[#00B4D8] hover:filter hover:brightness-125 transition-all duration-200"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 7h16"></path>
                    <path d="M12 4v16"></path>
                    <path d="M9 20h6"></path>
                    <path d="M4 7l-2 6"></path>
                    <path d="M4 7l2 6"></path>
                    <path d="M2 13h4"></path>
                    <path d="M20 7l-2 6"></path>
                    <path d="M20 7l2 6"></path>
                    <path d="M18 13h4"></path>
                  </svg>
                }
              />
            </div>
          </div>

          {/* Center Column: Live Terminal */}
          <div className="col-span-6">
            <Terminal logs={logs} />
          </div>

          {/* Right Column: Memory & Proofs */}
          <div className="col-span-3 space-y-6">
            <HivemindList logs={logs} />
            <ZKProofsList logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
}
