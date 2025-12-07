'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { LogEntry } from '@/types';

interface ProofData {
  hash: string;
  timestamp: string;
  status: 'submitted' | 'verified' | 'pending' | 'failed';
  auditId?: string;
  riskScore?: number;
  auditorId?: string;
  verified: boolean;
  transactionId?: string;
  contractTxId?: string;
  blockHeight?: number;
  midnightProofData?: {
    network: string;
    contractAddress?: string;
    transactionHash?: string;
  };
}

export default function ProofDetailPage() {
  const params = useParams();
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProofData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract proof hash from params
        const proofHash = typeof params.hash === 'string' 
          ? decodeURIComponent(params.hash)
          : Array.isArray(params.hash) 
            ? decodeURIComponent(params.hash[0])
            : '';

        if (!proofHash) {
          setError('Invalid proof hash');
          setLoading(false);
          return;
        }

        // Fetch logs from API
        const response = await fetch('/api/logs');
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }

        const logs: LogEntry[] = await response.json();

        // Filter logs to find entries matching the proof hash
        const proofLogs = logs.filter((log) => {
          if (log.type === 'proof' || (log.message && log.message.includes('Proof'))) {
            // Try multiple patterns to match the hash
            const hashPatterns = [
              new RegExp(`Hash:\\s*(${proofHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'),
              new RegExp(`hash:\\s*(${proofHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i'),
              new RegExp(proofHash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
            ];

            return hashPatterns.some(pattern => pattern.test(log.message));
          }
          return false;
        });

        if (proofLogs.length === 0) {
          setProofData(null);
          setLoading(false);
          return;
        }

        // Extract data from the first matching log
        const proofLog = proofLogs[0];
        
        // Extract hash
        const hashMatch = proofLog.message.match(/Proof Hash:\s*([a-zA-Z0-9_\-x]+)/i) ||
                         proofLog.message.match(/Hash:\s*([a-zA-Z0-9_\-x]+)/i) || 
                         proofLog.message.match(/(zk_proof_[a-zA-Z0-9_\-x]+)/i);
        const hash = hashMatch ? hashMatch[1] : proofHash;

        // Extract transaction ID / contract tx ID
        const txMatch = proofLog.message.match(/Transaction ID:\s*([a-zA-Z0-9_\-]+)/i) ||
                       proofLog.message.match(/Transaction[:\s]+([a-zA-Z0-9_\-]+)/i) ||
                       proofLog.message.match(/tx[_\s]?id[:\s]+([a-zA-Z0-9_\-]+)/i);
        const transactionId = txMatch ? txMatch[1] : undefined;

        // Extract audit ID
        const auditMatch = proofLog.message.match(/Audit ID:\s*([a-zA-Z0-9_\-]+)/i) ||
                          proofLog.message.match(/audit[_\s]?id[:\s]+([a-zA-Z0-9_\-]+)/i);
        const auditId = auditMatch ? auditMatch[1] : proofLog.auditId;

        // Extract risk score
        const riskMatch = proofLog.message.match(/Risk Score:\s*(\d+)/i) ||
                        proofLog.message.match(/risk[_\s]?score[:\s]+(\d+)/i);
        const riskScore = riskMatch ? parseInt(riskMatch[1], 10) : undefined;

        // Extract auditor ID
        const auditorMatch = proofLog.message.match(/Auditor[:\s]+([a-zA-Z0-9_\-]+)/i) ||
                            proofLog.message.match(/auditor[:\s]+([a-zA-Z0-9_\-]+)/i);
        const auditorId = auditorMatch ? auditorMatch[1] : undefined;

        // Extract status
        let status: 'submitted' | 'verified' | 'pending' | 'failed' = 'pending';
        let verified = false;
        if (proofLog.message.includes('[proof_submitted]') || proofLog.message.includes('submitted')) {
          status = 'submitted';
        } else if (proofLog.message.includes('[proof_verified]') || proofLog.message.includes('verified: true') || proofLog.message.includes('Verified')) {
          status = 'verified';
          verified = true;
        } else if (proofLog.message.includes('[zk_failure]') || proofLog.message.includes('failed')) {
          status = 'failed';
        } else if (proofLog.message.includes('pending')) {
          status = 'pending';
        }

        // Extract block height if available
        const blockMatch = proofLog.message.match(/block[:\s]+(\d+)/i) ||
                          proofLog.message.match(/block[_\s]?height[:\s]+(\d+)/i);
        const blockHeight = blockMatch ? parseInt(blockMatch[1], 10) : undefined;

        // Extract Midnight proof data
        const midnightProofData: ProofData['midnightProofData'] = {
          network: 'Midnight Network',
        };

        // Try to extract Midnight-specific data
        const contractMatch = proofLog.message.match(/contract[:\s]+(0x[a-fA-F0-9]{40})/i) ||
                             proofLog.message.match(/Contract Address[:\s]+(0x[a-fA-F0-9]{40})/i);
        if (contractMatch) {
          midnightProofData.contractAddress = contractMatch[1];
        }

        // Use transactionId as transactionHash if available
        if (transactionId) {
          midnightProofData.transactionHash = transactionId;
        } else {
          const txHashMatch = proofLog.message.match(/tx[:\s]+(0x[a-fA-F0-9]{64})/i) ||
                             proofLog.message.match(/transaction[:\s]+(0x[a-fA-F0-9]{64})/i);
          if (txHashMatch) {
            midnightProofData.transactionHash = txHashMatch[1];
          }
        }

        setProofData({
          hash,
          timestamp: proofLog.timestamp,
          status,
          auditId,
          riskScore,
          auditorId,
          verified,
          transactionId,
          contractTxId: transactionId, // Use transactionId as contractTxId
          blockHeight,
          midnightProofData: Object.keys(midnightProofData).length > 1 ? midnightProofData : undefined,
        });

      } catch (err) {
        console.error('Error fetching proof data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load proof data');
      } finally {
        setLoading(false);
      }
    };

    fetchProofData();
  }, [params.hash]);

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return timestamp;
    }
  };

  const formatHash = (hash: string, maxLength: number = 20) => {
    if (hash.length <= maxLength) return hash;
    return `${hash.substring(0, maxLength)}...`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading proof details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Proof</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link
              href="/"
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!proofData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-2">Proof Not Found</h1>
            <p className="text-gray-400 mb-2">The proof with this hash was not found in the logs.</p>
            <p className="text-sm text-gray-500 mb-6">
              Hash: <code className="text-gray-400">{formatHash(typeof params.hash === 'string' ? params.hash : params.hash?.[0] || '')}</code>
            </p>
            <Link
              href="/"
              className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Proof Detail Card */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
              proofData.verified ? 'bg-green-500/20' : 'bg-gray-500/20'
            }`}>
              <svg className={`w-8 h-8 ${proofData.verified ? 'text-green-500' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight mb-1">Proof Verification</h1>
              <p className="text-sm text-gray-400 font-mono">{formatHash(proofData.hash, 40)}</p>
            </div>
          </div>

          {/* Verification Status */}
          <div className={`mb-6 p-4 rounded-lg border ${
            proofData.status === 'verified'
              ? 'bg-green-500/10 border-green-500/30'
              : proofData.status === 'failed'
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                proofData.status === 'verified' ? 'bg-green-500' : 
                proofData.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
              } ${proofData.status === 'verified' ? 'animate-pulse' : ''}`}></div>
              <span className={`text-sm font-medium ${
                proofData.status === 'verified' ? 'text-green-400' : 
                proofData.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {proofData.status === 'verified' ? 'Verified on Midnight Network' : 
                 proofData.status === 'failed' ? 'Verification Failed' :
                 proofData.status === 'submitted' ? 'Submitted - Pending Verification' : 
                 'Pending Verification'}
              </span>
            </div>
          </div>

          {/* Proof Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Proof Hash */}
            <div className="bg-black border border-[#27272a] rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Proof Hash</div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-gray-300 break-all flex-1">{proofData.hash}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(proofData.hash);
                  }}
                  className="px-3 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded text-xs transition-colors"
                  title="Copy hash"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Timestamp */}
            <div className="bg-black border border-[#27272a] rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Timestamp</div>
              <div className="text-sm text-gray-300">{formatTimestamp(proofData.timestamp)}</div>
            </div>

            {/* Transaction ID / Contract Tx ID */}
            {(proofData.transactionId || proofData.contractTxId) && (
              <div className="bg-black border border-[#27272a] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Transaction ID</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-gray-300 break-all flex-1">
                    {proofData.transactionId || proofData.contractTxId}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(proofData.transactionId || proofData.contractTxId || '');
                    }}
                    className="px-3 py-1 bg-[#27272a] hover:bg-[#3f3f46] rounded text-xs transition-colors"
                    title="Copy transaction ID"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="bg-black border border-[#27272a] rounded-lg p-4">
              <div className="text-xs text-gray-500 mb-2">Status</div>
              <div className={`text-sm font-medium ${
                proofData.status === 'verified' ? 'text-green-400' : 
                proofData.status === 'failed' ? 'text-red-400' : 
                proofData.status === 'submitted' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {proofData.status.charAt(0).toUpperCase() + proofData.status.slice(1)}
              </div>
            </div>

            {/* Linked Audit */}
            {proofData.auditId && (
              <div className="bg-black border border-[#27272a] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Linked Audit</div>
                <Link
                  href={`/audit/${encodeURIComponent(proofData.auditId)}`}
                  className="text-sm font-mono text-cyan-400 hover:text-cyan-300 transition-colors break-all"
                >
                  {proofData.auditId}
                </Link>
              </div>
            )}

            {/* Risk Score */}
            {proofData.riskScore !== undefined && (
              <div className="bg-black border border-[#27272a] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Risk Score</div>
                <div className="text-sm font-semibold text-red-400">{proofData.riskScore}/100</div>
              </div>
            )}

            {/* Auditor ID */}
            {proofData.auditorId && (
              <div className="bg-black border border-[#27272a] rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Auditor ID</div>
                <div className="text-sm font-mono text-gray-300">{proofData.auditorId}</div>
              </div>
            )}
          </div>

          {/* Midnight Proof Data */}
          {proofData.midnightProofData && (
            <div className="bg-black border border-[#27272a] rounded-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-lg font-semibold">Midnight Network Data</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Network</div>
                  <div className="text-sm text-gray-300">{proofData.midnightProofData.network}</div>
                </div>
                {proofData.midnightProofData.contractAddress && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Contract Address</div>
                    <code className="text-sm font-mono text-gray-300 break-all">
                      {proofData.midnightProofData.contractAddress}
                    </code>
                  </div>
                )}
                {proofData.midnightProofData.transactionHash && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Transaction Hash</div>
                    <code className="text-sm font-mono text-gray-300 break-all">
                      {proofData.midnightProofData.transactionHash}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6 border-t border-[#27272a]">
            {proofData.auditId && (
              <Link
                href={`/audit/${encodeURIComponent(proofData.auditId)}`}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                View Audit
              </Link>
            )}
            <button
              onClick={() => navigator.clipboard.writeText(proofData.hash)}
              className="px-4 py-2 bg-[#27272a] text-white rounded-lg text-sm font-medium hover:bg-[#3f3f46] transition-colors"
            >
              Copy Hash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
