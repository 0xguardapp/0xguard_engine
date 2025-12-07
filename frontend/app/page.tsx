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
import { Audit, CreateAuditResponse } from '@/types';
import AuditCard from '@/components/AuditCard';
import { useAudits } from '@/hooks/useAudits';

// Generate placeholder audit data for a user
const generatePlaceholderAudits = (ownerAddress: string): Audit[] => [
  {
    id: 'audit_001',
    name: 'DeFi Lending Protocol Security Audit',
    description: 'Comprehensive security audit of a decentralized lending protocol with flash loan functionality and interest rate mechanisms. Focus on reentrancy vulnerabilities, oracle manipulation, and economic attack vectors.',
    targetAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    target: 'https://github.com/defi-protocol/lending-contracts',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    vulnerabilityCount: 3,
    riskScore: 72,
    intensity: 'deep',
    ownerAddress,
    tags: ['defi', 'lending', 'flash-loans', 'smart-contract'],
    difficulty: 'high',
    priority: 'high',
    metadata: {
      proofs: [
        {
          hash: 'zk_proof_0x8a3f2e1d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9a0b1',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
          contractTxId: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7',
          blockHeight: 1847293,
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          riskScore: 85,
          auditorId: 'agent1q8k3j2h1g9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9',
          exploitHash: '0x5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x7b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3',
          timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
          contractTxId: '0x8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6',
          blockHeight: 1847289,
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          riskScore: 68,
          auditorId: 'agent1q8k3j2h1g9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x6a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2',
          timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
          verified: false,
          status: 'pending',
          riskScore: 72,
          auditorId: 'agent1q8k3j2h1g9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9',
          network: 'midnight',
        },
      ],
      vulnerabilities: [
        { type: 'Reentrancy', severity: 'high', status: 'confirmed' },
        { type: 'Oracle Manipulation', severity: 'medium', status: 'confirmed' },
        { type: 'Flash Loan Attack Vector', severity: 'high', status: 'investigating' },
      ],
      agents: {
        redTeam: 'agent1q8k3j2h1g9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9',
        target: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
        judge: 'agent1q9k4j3h2g1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6',
      },
    },
  },
  {
    id: 'audit_002',
    name: 'NFT Marketplace Smart Contract Review',
    description: 'Security assessment of an NFT marketplace platform including auction mechanisms, royalty distribution, and cross-chain NFT transfers. Emphasis on access control, price manipulation, and token standard compliance.',
    targetAddress: '0x8ba1f109551bD432803012645Hac136c22C37e04',
    target: 'https://github.com/nft-marketplace/core-contracts',
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    vulnerabilityCount: 8,
    riskScore: 45,
    intensity: 'quick',
    ownerAddress,
    tags: ['nft', 'marketplace', 'erc721', 'auction', 'royalties'],
    difficulty: 'medium',
    priority: 'medium',
    metadata: {
      proofs: [
        {
          hash: 'zk_proof_0x9c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
          contractTxId: '0x7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5',
          blockHeight: 1845123,
          contractAddress: '0x8ba1f109551bD432803012645Hac136c22C37e04',
          riskScore: 42,
          auditorId: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x8b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4',
          timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6',
          contractTxId: '0x6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4',
          blockHeight: 1845120,
          contractAddress: '0x8ba1f109551bD432803012645Hac136c22C37e04',
          riskScore: 48,
          auditorId: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x7a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3',
          timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7',
          contractTxId: '0x5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3',
          blockHeight: 1845117,
          contractAddress: '0x8ba1f109551bD432803012645Hac136c22C37e04',
          riskScore: 45,
          auditorId: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x6a1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2',
          timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
          contractTxId: '0x4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2',
          blockHeight: 1845114,
          contractAddress: '0x8ba1f109551bD432803012645Hac136c22C37e04',
          riskScore: 43,
          auditorId: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x5a0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1',
          timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
          contractTxId: '0x3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1',
          blockHeight: 1845111,
          contractAddress: '0x8ba1f109551bD432803012645Hac136c22C37e04',
          riskScore: 47,
          auditorId: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
          network: 'midnight',
        },
      ],
      vulnerabilities: [
        { type: 'Access Control Bypass', severity: 'low', status: 'fixed' },
        { type: 'Price Manipulation', severity: 'medium', status: 'fixed' },
        { type: 'Royalty Calculation Error', severity: 'low', status: 'fixed' },
        { type: 'Front-running Vulnerability', severity: 'medium', status: 'fixed' },
        { type: 'Integer Overflow', severity: 'low', status: 'fixed' },
        { type: 'Missing Input Validation', severity: 'low', status: 'fixed' },
        { type: 'Gas Optimization', severity: 'info', status: 'fixed' },
        { type: 'Event Emission', severity: 'info', status: 'fixed' },
      ],
      agents: {
        redTeam: 'agent1q7j2i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4',
        target: 'agent1q6i1h0g9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3',
        judge: 'agent1q8k3j2h1g9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9',
      },
    },
  },
  {
    id: 'audit_003',
    name: 'Cross-Chain Bridge Protocol Audit',
    description: 'Critical security review of a cross-chain bridge protocol handling multi-chain asset transfers. Focus on validator consensus mechanisms, message verification, economic security, and potential bridge exploit vectors. This is a high-stakes audit for a protocol handling millions in TVL.',
    targetAddress: '0x9cA8eF8b5f3E2d1C0b9A8F7E6D5C4B3A2F1E0D9C8',
    target: 'https://github.com/crosschain-bridge/protocol-v2',
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    vulnerabilityCount: 1,
    riskScore: 89,
    intensity: 'deep',
    ownerAddress,
    tags: ['bridge', 'cross-chain', 'multichain', 'critical', 'defi'],
    difficulty: 'critical',
    priority: 'critical',
    metadata: {
      proofs: [
        {
          hash: 'zk_proof_0xad4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          verified: true,
          status: 'verified',
          transactionId: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0',
          contractTxId: '0x2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0',
          blockHeight: 1847298,
          contractAddress: '0x9cA8eF8b5f3E2d1C0b9A8F7E6D5C4B3A2F1E0D9C8',
          riskScore: 92,
          auditorId: 'agent1q9k4j3h2g1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6',
          exploitHash: '0x6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4',
          network: 'midnight',
        },
        {
          hash: 'zk_proof_0x9c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          verified: false,
          status: 'submitted',
          riskScore: 87,
          auditorId: 'agent1q9k4j3h2g1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6',
          network: 'midnight',
        },
      ],
      vulnerabilities: [
        { type: 'Validator Consensus Bypass', severity: 'critical', status: 'confirmed' },
      ],
      agents: {
        redTeam: 'agent1q9k4j3h2g1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6',
        target: 'agent1q8j3i2h1g0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5',
        judge: 'agent1q8k3j2h1g9f7e5d3c1b9a7f5e3d1c9b7a5f3e1d9c7b5a3f1e9d7c5b3a1f9',
      },
      tvl: '$12.5M',
      chains: ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'],
    },
  },
];

// Component that shows placeholder audits when connected
function AuditListWithPlaceholders({ 
  searchQuery, 
  ownerAddress, 
  newAudit 
}: { 
  searchQuery: string; 
  ownerAddress: string;
  newAudit?: Audit | null;
}) {
  const { audits, loading, error, refetch } = useAudits({
    autoRefresh: false,
    refreshInterval: 30000,
    owner: ownerAddress, // Filter by owner address
  });

  // Show placeholders if connected and no audits loaded yet, or if loading completes with no audits
  const showPlaceholders = !loading && (!audits || audits.length === 0) && !error && !newAudit;
  const auditsToShow = (() => {
    if (newAudit) {
      // Optimistically show new audit first, then existing audits
      return [newAudit, ...(audits || [])];
    }
    return showPlaceholders ? generatePlaceholderAudits(ownerAddress) : (audits || []);
  })();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
          <div className="text-gray-400">Loading audits...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load audits</h3>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  // Filter audits by search query
  const filteredAudits = auditsToShow.filter((audit) =>
    audit.targetAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">
          {filteredAudits.length} {filteredAudits.length === 1 ? 'audit' : 'audits'}
        </span>
      </div>

      {/* Audit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredAudits.map((audit) => (
          <AuditCard key={audit.id} audit={audit} />
        ))}
      </div>
    </div>
  );
}

function HomeContent() {
  const toast = useToast();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [newAudit, setNewAudit] = useState<Audit | null>(null);
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

  const handleCreateAudit = useCallback(async (response: CreateAuditResponse) => {
    // Convert backend response to Audit format
    const audit: Audit = {
      id: response.audit_id,
      name: response.name,
      status: (response.status as Audit['status']) || 'pending',
      createdAt: response.created_at,
      updatedAt: response.created_at,
      targetAddress: response.metadata?.target || response.metadata?.targetAddress || '',
      target: response.metadata?.target,
      description: response.metadata?.description,
      tags: response.metadata?.tags,
      difficulty: response.metadata?.difficulty,
      priority: response.metadata?.priority,
      ownerAddress: address || undefined,
      metadata: response.metadata,
    };

    // Optimistically update UI
    setNewAudit(audit);

    // Refresh audits list after a short delay to get the latest from backend
    setTimeout(() => {
      setNewAudit(null);
      window.location.reload(); // Simple refresh to sync with backend
    }, 1000);
  }, [address]);

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
      <div className="space-y-4">
        {/* Projects Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
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
          {isConnected && address ? (
            <AuditListWithPlaceholders 
              searchQuery={searchQuery} 
              ownerAddress={address} 
              newAudit={newAudit}
            />
          ) : (
            <AuditList searchQuery={searchQuery} />
          )}
        </ErrorBoundary>
      </div>
      <NewAuditModal 
        isOpen={isModalOpen} 
        onClose={() => !isDeploying && setIsModalOpen(false)} 
        onDeploy={handleDeploy}
        onCreate={handleCreateAudit}
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