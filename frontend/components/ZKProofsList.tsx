'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { LogEntry } from '@/types';

interface ProofItem {
  hash: string;
  timestamp: string;
}

export default function ZKProofsList({ logs }: { logs: LogEntry[] }) {
  const [proofs, setProofs] = useState<ProofItem[]>([]);

  useEffect(() => {
    const knownProofs = new Set<string>();
    const newProofs: ProofItem[] = [];

    logs.forEach((log) => {
      if (log.type === 'proof' || (log.message.includes('Proof') && log.message.includes('Hash'))) {
        const match = log.message.match(/Hash:\s*([a-zA-Z0-9_]+)/);
        if (match && match[1] && !knownProofs.has(match[1])) {
          knownProofs.add(match[1]);
          newProofs.push({
            hash: match[1],
            timestamp: log.timestamp,
          });
        }
      }
    });

    // Keep only last 10 entries
    setProofs(newProofs.slice(-10).reverse());
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
          proofs.map((proof, index) => (
            <Link
              key={index}
              href={`/proof/${proof.hash}`}
              className="flex items-center gap-2 py-2 border-b border-[#27272a] last:border-0 hover:bg-black/30 transition-all duration-200 rounded px-1 cursor-pointer slide-in"
            >
              <svg className="w-4 h-4 text-[#06b6d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="mono text-sm text-[#06b6d4] hover:text-[#22d3ee] transition-colors duration-200">
                {proof.hash.length > 20 ? proof.hash.substring(0, 20) + '...' : proof.hash}
              </span>
              <span className="ml-auto text-xs text-green-500 font-medium">Verified</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

