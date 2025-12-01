'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import type { LogEntry } from '@/types';

interface HivemindItem {
  vector: string;
  timestamp: string;
}

export default function HivemindList({ logs }: { logs: LogEntry[] }) {
  const [attacks, setAttacks] = useState<HivemindItem[]>([]);
  const [newAttackIndex, setNewAttackIndex] = useState<number | null>(null);

  useEffect(() => {
    const knownAttacks = new Set<string>();
    const newAttacks: HivemindItem[] = [];
    let foundNew = false;

    logs.forEach((log) => {
      if (log.type === 'attack' && log.message.includes('Executing vector:')) {
        const match = log.message.match(/'([^']+)'/);
        if (match && match[1] && !knownAttacks.has(match[1])) {
          knownAttacks.add(match[1]);
          newAttacks.push({
            vector: match[1],
            timestamp: log.timestamp,
          });
          foundNew = true;
        }
      }
    });

    // Keep only last 10 entries
    const updatedAttacks = newAttacks.slice(-10).reverse();
    
    if (foundNew && updatedAttacks.length > attacks.length) {
      setNewAttackIndex(0);
      setTimeout(() => setNewAttackIndex(null), 1000);
    }
    
    setAttacks(updatedAttacks);
  }, [logs, attacks.length]);

  return (
    <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 hover:border-gray-700 transition-all duration-200">
      <div className="flex items-center gap-2 mb-4">
        {/* Unibase Protocol Symbol */}
        <Image
          src="/MsMpvtzV_200x200.png"
          alt="Unibase Protocol"
          width={20}
          height={20}
          className="w-5 h-5"
        />
        <h2 className="text-lg font-semibold tracking-tight">Learned Exploits</h2>
      </div>
      <div className="space-y-2">
        {attacks.length === 0 ? (
          <div className="text-gray-500 text-sm">No attacks learned yet...</div>
        ) : (
          attacks.map((attack, index) => (
            <div
              key={index}
              className={`flex items-center justify-between py-1.5 border-b border-[#27272a] last:border-0 hover:bg-black/30 transition-all duration-200 rounded px-1 slide-in ${
                newAttackIndex === index ? 'green-flash' : ''
              }`}
            >
              <span className="mono text-sm text-gray-300">{attack.vector}</span>
              <span className="text-xs text-gray-500 mono">
                {new Date(attack.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

