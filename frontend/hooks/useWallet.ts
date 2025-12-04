'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useDisconnect } from 'wagmi';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  isLoading: boolean;
  walletType: 'ethereum' | 'keplr' | null;
}

export function useWallet() {
  // Ethereum wallet state from wagmi
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { disconnect: disconnectEth } = useDisconnect();

  // Local state for Keplr and combined wallet state
  const [keplrState, setKeplrState] = useState<{
    isConnected: boolean;
    address: string | null;
  }>({
    isConnected: false,
    address: null,
  });

  const [isConnecting, setIsConnecting] = useState(false);

  // Check if Keplr is available
  const isKeplrAvailable = typeof window !== 'undefined' && 'keplr' in window;

  // Determine current wallet state
  const isConnected = isEthConnected || keplrState.isConnected;
  const address = ethAddress || keplrState.address;
  const walletType: 'ethereum' | 'keplr' | null = ethAddress
    ? 'ethereum'
    : keplrState.address
    ? 'keplr'
    : null;

  // Connect wallet - for Ethereum, RainbowKit handles this via ConnectButton
  // This function is mainly for Keplr fallback
  const connectWallet = useCallback(async () => {
    setIsConnecting(true);

    try {
      // If no Ethereum wallet, try Keplr
      if (isKeplrAvailable) {
        const keplr = (window as any).keplr;
        if (keplr) {
          try {
            // Request access to Fetch.ai chain
            await keplr.enable('fetchhub-4');
            const key = await keplr.getKey('fetchhub-4');
            
            if (key && key.bech32Address) {
              setKeplrState({
                isConnected: true,
                address: key.bech32Address,
              });
              setIsConnecting(false);
              return;
            }
          } catch (error) {
            console.error('Failed to connect Keplr:', error);
          }
        }
      }

      setIsConnecting(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setIsConnecting(false);
    }
  }, [isKeplrAvailable]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    if (walletType === 'ethereum') {
      disconnectEth();
    } else if (walletType === 'keplr') {
      setKeplrState({
        isConnected: false,
        address: null,
      });
    }
  }, [walletType, disconnectEth]);

  // Get truncated address for display
  const getTruncatedAddress = useCallback(() => {
    if (!address) return null;
    if (address.includes('...')) return address; // Already truncated
    
    // Ethereum addresses (0x...)
    if (address.startsWith('0x')) {
      if (address.length <= 16) return address;
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    // Cosmos addresses (fetch1...)
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  }, [address]);

  return {
    isConnected,
    address,
    isLoading: isConnecting,
    walletType,
    connectWallet,
    disconnectWallet,
    getTruncatedAddress,
    isKeplrAvailable,
  };
}




