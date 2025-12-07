'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { AuthGuard } from '@/components/AuthGuard';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface AgentIdentity {
  name?: string;
  role?: string;
  capabilities?: string[];
  version?: string;
  address: string;
  started_at?: string;
  unibase_key?: string;
  identity_uri?: string;
}

interface Reputation {
  score: number;
  lastUpdated: number;
  evidenceURI: string;
  history?: Array<{
    delta: number;
    timestamp: string;
    metadata: any;
  }>;
}

interface Validation {
  valid: boolean;
  evidenceURI: string;
  lastValidated?: string;
}

interface AgentMemory {
  [key: string]: any;
}

interface OnChainEvent {
  type: 'AgentRegistered' | 'IdentityURIUpdated' | 'ReputationUpdated' | 'AgentValidated' | 'AgentRevoked';
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  data: any;
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const address = params.address as string;

  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<AgentIdentity | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [memory, setMemory] = useState<AgentMemory>({});
  const [events, setEvents] = useState<OnChainEvent[]>([]);
  const [erc3009Available, setErc3009Available] = useState(false);

  useEffect(() => {
    if (address) {
      fetchAgentData();
    }
  }, [address]);

  const fetchAgentData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent data');
      }
      const data = await response.json();
      
      setIdentity(data.identity || null);
      setReputation(data.reputation || null);
      setValidation(data.validation || null);
      setMemory(data.memory || {});
      setEvents(data.events || []);
      setErc3009Available(data.erc3009Available || false);
    } catch (error) {
      console.error('Error fetching agent data:', error);
      toast.error('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIdentity = () => {
    // Open modal or navigate to update page
    toast.info('Update identity feature coming soon');
  };

  const handleSubmitReputationEvidence = () => {
    // Open modal for submitting evidence
    toast.info('Submit reputation evidence feature coming soon');
  };

  const handleViewValidationRecord = () => {
    if (validation?.evidenceURI) {
      window.open(validation.evidenceURI, '_blank');
    } else {
      toast.error('No validation record available');
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Header />
        <DashboardLayout>
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading agent data...</div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  if (!identity) {
    return (
      <AuthGuard>
        <Header />
        <DashboardLayout>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold text-white mb-2">Agent Not Found</h3>
              <p className="text-sm text-gray-400 mb-4">
                The agent with address {address} was not found in the registry.
              </p>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </DashboardLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <Header />
      <DashboardLayout>
        <ErrorBoundary
          fallback={
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Error Loading Agent</h3>
              <p className="text-sm text-gray-400">An error occurred while loading agent data.</p>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{identity.name || 'Unknown Agent'}</h1>
                <p className="text-sm text-gray-400 font-mono mt-1">{address}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpdateIdentity}
                  className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-200"
                >
                  Update Identity
                </button>
                <button
                  onClick={handleSubmitReputationEvidence}
                  className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-200"
                >
                  Submit Evidence
                </button>
                {validation?.valid && (
                  <button
                    onClick={handleViewValidationRecord}
                    className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-all duration-200"
                  >
                    View Validation
                  </button>
                )}
              </div>
            </div>

            {/* Identity Card */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Identity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Role</div>
                  <div className="text-sm text-white">{identity.role || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Version</div>
                  <div className="text-sm text-white">{identity.version || 'N/A'}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Capabilities</div>
                  <div className="flex flex-wrap gap-2">
                    {identity.capabilities?.map((cap, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                        {cap}
                      </span>
                    )) || <span className="text-sm text-gray-400">No capabilities listed</span>}
                  </div>
                </div>
                {identity.unibase_key && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Unibase Key</div>
                    <div className="text-sm font-mono text-gray-300 break-all">{identity.unibase_key}</div>
                  </div>
                )}
                {identity.identity_uri && (
                  <div className="col-span-2">
                    <div className="text-xs text-gray-500 mb-1">Identity URI</div>
                    <div className="text-sm font-mono text-gray-300 break-all">{identity.identity_uri}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Reputation Card */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Reputation</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-bold text-white">{reputation?.score || 0}</div>
                <div>
                  <div className="text-xs text-gray-500">Last Updated</div>
                  <div className="text-sm text-gray-300">
                    {reputation?.lastUpdated
                      ? new Date(reputation.lastUpdated * 1000).toLocaleString()
                      : 'Never'}
                  </div>
                </div>
              </div>
              {reputation?.history && reputation.history.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 mb-2">Recent History</div>
                  <div className="space-y-2">
                    {reputation.history.slice(0, 5).map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className={entry.delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {entry.delta >= 0 ? '+' : ''}{entry.delta}
                        </span>
                        <span className="text-gray-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Card */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Validation Status</h2>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${validation?.valid ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {validation?.valid ? 'Validated' : 'Not Validated'}
                  </div>
                  {validation?.lastValidated && (
                    <div className="text-xs text-gray-400">
                      Last validated: {new Date(validation.lastValidated).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              {validation?.evidenceURI && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-1">Evidence URI</div>
                  <div className="text-sm font-mono text-gray-300 break-all">{validation.evidenceURI}</div>
                </div>
              )}
            </div>

            {/* Memory Preview */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Agent Memory Preview</h2>
              {Object.keys(memory).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(memory).slice(0, 10).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 min-w-[120px]">{key}:</span>
                      <span className="text-gray-300 break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No memory data available</div>
              )}
            </div>

            {/* ERC-3009 Gasless Transactions */}
            {erc3009Available && (
              <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Gasless Transactions (ERC-3009)</h2>
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>This agent supports gasless transactions</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  You can send tokens to this agent without them needing to pay gas fees.
                </p>
              </div>
            )}

            {/* Recent On-Chain Events */}
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Recent On-Chain Events</h2>
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event, idx) => (
                    <div key={idx} className="border-b border-[#27272a] pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-white">{event.type}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono break-all">
                        TX: {event.transactionHash}
                      </div>
                      <div className="text-xs text-gray-500">
                        Block: {event.blockNumber}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400">No recent events found</div>
              )}
            </div>
          </div>
        </ErrorBoundary>
      </DashboardLayout>
    </AuthGuard>
  );
}

