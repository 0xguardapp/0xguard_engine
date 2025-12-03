'use client';

import { useState, useEffect, useCallback } from 'react';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isLoading: false,
  });

  // Check if Keplr is available
  const isKeplrAvailable = typeof window !== 'undefined' && 'keplr' in window;

  // Generate mock address
  const generateMockAddress = useCallback(() => {
    const prefix = 'fetch1';
    const randomChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let address = prefix;
    for (let i = 0; i < 10; i++) {
      address += randomChars[Math.floor(Math.random() * randomChars.length)];
    }
    address += '...9zX';
    return address;
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (isKeplrAvailable) {
        // Try to connect with Keplr
        const keplr = (window as any).keplr;
        if (keplr) {
          // Request access to Fetch.ai chain
          // For now, we'll use a mock since we don't have the exact chain ID
          // In production, you would use: await keplr.enable('fetchhub-4');
          const accounts = await keplr.getKey('fetchhub-4').catch(() => null);
          
          if (accounts) {
            setState({
              isConnected: true,
              address: accounts.bech32Address,
              isLoading: false,
            });
            return;
          }
        }
      }

      // Fallback to mock wallet
      const mockAddress = generateMockAddress();
      setState({
        isConnected: true,
        address: mockAddress,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // Fallback to mock on error
      const mockAddress = generateMockAddress();
      setState({
        isConnected: true,
        address: mockAddress,
        isLoading: false,
      });
    }
  }, [isKeplrAvailable, generateMockAddress]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      isLoading: false,
    });
  }, []);

  // Get truncated address for display
  const getTruncatedAddress = useCallback(() => {
    if (!state.address) return null;
    if (state.address.includes('...')) return state.address; // Already truncated
    if (state.address.length <= 16) return state.address;
    return `${state.address.slice(0, 8)}...${state.address.slice(-4)}`;
  }, [state.address]);

  return {
    ...state,
    connectWallet,
    disconnectWallet,
    getTruncatedAddress,
    isKeplrAvailable,
  };
}




