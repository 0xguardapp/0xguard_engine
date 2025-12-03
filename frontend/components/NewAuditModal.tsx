'use client';

import React, { useState } from 'react';

interface NewAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (targetAddress: string, intensity: string) => Promise<void>;
}

export default function NewAuditModal({ isOpen, onClose, onDeploy }: NewAuditModalProps) {
  const [targetAddress, setTargetAddress] = useState('agent1qf2mssnkhf29fk7vj2fy8ekmhdfke0ptu4k9dyvfcuk7tt6easatge9z96d');
  const [intensity, setIntensity] = useState('deep');
  const [isDeploying, setIsDeploying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeploying(true);
    try {
      await onDeploy(targetAddress, intensity);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#09090b] border border-[#27272a] rounded-lg p-6 w-full max-w-md shadow-2xl modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Deploy Security Swarm</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="targetAddress" className="block text-sm font-medium mb-2 text-gray-300">
              Target Address / Agent Endpoint
            </label>
            <input
              id="targetAddress"
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="agent1q..."
              className="w-full px-4 py-2 bg-black border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors duration-200 mono text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="intensity" className="block text-sm font-medium mb-2 text-gray-300">
              Intensity
            </label>
            <select
              id="intensity"
              value={intensity}
              onChange={(e) => setIntensity(e.target.value)}
              className="w-full px-4 py-2 bg-black border border-[#27272a] rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors duration-200"
            >
              <option value="quick">Quick Scan (ASI-Mini)</option>
              <option value="deep">Deep Probe (ASI-Agentic)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isDeploying}
            className="w-full px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeploying ? 'Deploying...' : 'Deploy Swarm'}
          </button>
        </form>
      </div>
    </div>
  );
}




