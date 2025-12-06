'use client';

import React, { useState } from 'react';
import Link from 'next/link';

interface ProofDetailProps {
  hash: string;
  timestamp?: string;
  riskScore?: number;
  auditorId?: string;
}

export default function ProofDetail({ hash, timestamp, riskScore = 98, auditorId }: ProofDetailProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return new Date().toLocaleString();
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200 mb-8"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Audit Verification</h1>
          <p className="text-gray-400">Zero-Knowledge Proof Certificate</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Proof Hash</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-4 py-2 bg-black border border-[#27272a] rounded-lg mono text-sm text-gray-300">
                {hash}
              </code>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] rounded-lg transition-colors duration-200 text-sm"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Timestamp</label>
            <div className="px-4 py-2 bg-black border border-[#27272a] rounded-lg mono text-sm text-gray-300">
              {formatTimestamp(timestamp)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Risk Score</label>
            <div className="px-4 py-2 bg-black border border-[#27272a] rounded-lg mono text-sm text-red-500 font-semibold">
              {riskScore}/100
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400 mb-2 block">Validator</label>
            <div className="px-4 py-2 bg-black border border-[#27272a] rounded-lg mono text-sm text-gray-300">
              Midnight Network Compact Verifier
            </div>
          </div>
        </div>

        <div className="bg-black border border-[#27272a] rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Zero Knowledge</h3>
          <p className="text-gray-400 leading-relaxed">
            This proof confirms a critical vulnerability was found and reproduced by the swarm. The specific exploit
            vector is encrypted and stored on Unibase, accessible only to the contract owner. The risk score has been
            verified to exceed the threshold (≥90) without revealing the actual score or exploit details.
          </p>
        </div>
      </div>
    </div>
  );
}





