'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LogEntry } from '@/types';

interface ProofItem {
  hash: string;
  timestamp: string;
  status: 'submitted' | 'verified' | 'pending' | 'failed';
  transactionId?: string;
  contractTxId?: string;
  auditId?: string;
}

export default function ZKProofsList({ logs }: { logs: LogEntry[] }) {
  const [proofs, setProofs] = useState<ProofItem[]>([]);

  useEffect(() => {
    const knownProofs = new Map<string, ProofItem>();

    logs.forEach((log) => {
      // Check for proof category or proof-related messages
      if (log.category === 'proof' || log.type === 'proof' || (log.message && (log.message.includes('Proof') || log.message.includes('[proof_')))) {
        // Extract proof hash
        const hashMatch = log.message.match(/Proof Hash:\s*([a-zA-Z0-9_\-]+)/i) ||
                         log.message.match(/Hash:\s*([a-zA-Z0-9_\-]+)/i) ||
                         log.message.match(/(zk_proof_[a-zA-Z0-9_\-]+)/i);
        
        if (hashMatch && hashMatch[1]) {
          const hash = hashMatch[1];
          
          // Extract transaction ID / contract tx ID
          const txMatch = log.message.match(/Transaction ID:\s*([a-zA-Z0-9_\-]+)/i) ||
                         log.message.match(/Transaction[:\s]+([a-zA-Z0-9_\-]+)/i) ||
                         log.message.match(/tx[_\s]?id[:\s]+([a-zA-Z0-9_\-]+)/i);
          const transactionId = txMatch ? txMatch[1] : undefined;
          
          // Extract status
          let status: 'submitted' | 'verified' | 'pending' | 'failed' = 'pending';
          if (log.message.includes('[proof_submitted]') || log.message.includes('submitted')) {
            status = 'submitted';
          } else if (log.message.includes('[proof_verified]') || log.message.includes('verified: true') || log.message.includes('Verified')) {
            status = 'verified';
          } else if (log.message.includes('[zk_failure]') || log.message.includes('failed')) {
            status = 'failed';
          } else if (log.message.includes('pending')) {
            status = 'pending';
          }
          
          // Extract audit ID
          const auditId = log.auditId || (log.message.match(/Audit ID:\s*([a-zA-Z0-9_\-]+)/i)?.[1]);
          
          // Update or create proof item (keep most recent status)
          if (!knownProofs.has(hash) || new Date(log.timestamp) > new Date(knownProofs.get(hash)!.timestamp)) {
            knownProofs.set(hash, {
              hash,
              timestamp: log.timestamp,
              status,
              transactionId,
              contractTxId: transactionId, // Use transactionId as contractTxId
              auditId,
            });
          }
        }
      }
    });

    // Convert to array, sort by timestamp (newest first), keep last 10
    const proofArray = Array.from(knownProofs.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
    
    setProofs(proofArray);
  }, [logs]);

  // No need for handleProofClick - we'll use Link instead

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        {/* Midnight Protocol Symbol */}
        <Image
          src="/Background.png"
          alt="Midnight Protocol"
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <h2 className="text-lg font-semibold tracking-tight">Verifications</h2>
      </div>
      <div className="space-y-2">
        {proofs.length === 0 ? (
          <div className="text-gray-500 text-sm">No proofs generated yet...</div>
        ) : (
          proofs.map((proof, index) => {
            const getStatusColor = () => {
              switch (proof.status) {
                case 'verified':
                  return 'text-green-500';
                case 'submitted':
                  return 'text-yellow-500';
                case 'failed':
                  return 'text-red-500';
                default:
                  return 'text-gray-500';
              }
            };
            
            const getStatusText = () => {
              switch (proof.status) {
                case 'verified':
                  return 'Verified';
                case 'submitted':
                  return 'Submitted';
                case 'failed':
                  return 'Failed';
                default:
                  return 'Pending';
              }
            };
            
            return (
              <Link
                key={index}
                href={`/proof/${encodeURIComponent(proof.hash)}`}
                className="flex items-center gap-2 py-2 border-b border-[#27272a] last:border-0 hover:bg-black/30 transition-all duration-200 rounded px-1 cursor-pointer slide-in"
              >
                <svg className="w-4 h-4 text-[#06b6d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="mono text-sm text-[#06b6d4] hover:text-[#22d3ee] transition-colors duration-200 truncate">
                    {proof.hash.length > 20 ? proof.hash.substring(0, 20) + '...' : proof.hash}
                  </div>
                  {proof.transactionId && (
                    <div className="text-xs text-gray-500 mono truncate">
                      TX: {proof.transactionId.length > 12 ? proof.transactionId.substring(0, 12) + '...' : proof.transactionId}
                    </div>
                  )}
                </div>
                <span className={`ml-auto text-xs font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

