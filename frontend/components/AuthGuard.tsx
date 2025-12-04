'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isConnected, address, isLoading } = useWallet();

  useEffect(() => {
    // Only redirect if we're not loading and not connected
    if (!isLoading && (!isConnected || !address)) {
      router.push('/login');
    }
  }, [isConnected, address, isLoading, router]);

  // Show nothing while checking or redirecting
  if (isLoading || !isConnected || !address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 text-sm">Checking wallet connection...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

