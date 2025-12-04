'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import ProofDetail from '@/components/ProofDetail';

export default function ProofPage() {
  const params = useParams();
  const [hash, setHash] = useState<string>('unknown');

  useEffect(() => {
    if (params?.hash) {
      let decodedHash: string;
      try {
        decodedHash = typeof params.hash === 'string' 
          ? decodeURIComponent(params.hash)
          : Array.isArray(params.hash) 
            ? decodeURIComponent(params.hash[0])
            : 'unknown';
      } catch {
        decodedHash = typeof params.hash === 'string' 
          ? params.hash
          : Array.isArray(params.hash) 
            ? params.hash[0]
            : 'unknown';
      }
      
      if (decodedHash && decodedHash.length > 0) {
        setHash(decodedHash);
      }
    }
  }, [params]);

  return (
    <AuthGuard>
      <ProofDetail hash={hash} />
    </AuthGuard>
  );
}

