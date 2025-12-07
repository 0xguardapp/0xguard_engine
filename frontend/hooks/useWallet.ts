'use client';

import { useState, useCallback } from 'react';

// Mock user object for hackathon demo
const MOCK_USER = {
  address: '0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B',
  displayName: '0x742d...5f0bEb',
  isConnected: true,
  walletType: 'ethereum' as const,
};

export function useWallet() {
  // Mock wallet state - always connected with fake user
  const [isConnected] = useState(true);
  const [address] = useState<string>(MOCK_USER.address);
  const [walletType] = useState<'ethereum' | 'keplr' | null>('ethereum');
  const [isLoading] = useState(false);

  // Mock connect wallet - just returns success
  const connectWallet = useCallback(async () => {
    // Mock login - do nothing, user is already "connected"
    return Promise.resolve();
  }, []);

  // Mock disconnect - does nothing
  const disconnectWallet = useCallback(() => {
    // Mock disconnect - do nothing for demo
    console.log('[Mock] Disconnect called (no-op for demo)');
  }, []);

  // Get truncated address for display
  const getTruncatedAddress = useCallback(() => {
    return MOCK_USER.displayName;
  }, []);

  return {
    isConnected,
    address,
    isLoading,
    walletType,
    connectWallet,
    disconnectWallet,
    getTruncatedAddress,
    isKeplrAvailable: false,
  };
}





