'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import {
  metaMaskConnector,
  coinbaseConnector,
  phantomConnector,
} from '@/lib/walletConnectors';

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (isConnected && address) {
      // Register agent and redirect
      fetch('/api/register-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_address: address }),
      })
        .then(() => {
          router.push('/');
        })
        .catch((error) => {
          console.error('Failed to register agent:', error);
          // Still redirect even if registration fails
          router.push('/');
        });
    }
  }, [isConnected, address, router]);

  const handleConnect = async (connector: any) => {
    try {
      setIsConnecting(true);
      connect({ connector });
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/oxguard.png"
              alt="0xGuard"
              width={64}
              height={64}
              className="w-16 h-16"
              style={{ aspectRatio: '1 / 1' }}
            />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">0xGuard</h1>
          <p className="text-gray-400 text-sm">
            Connect your wallet to get started
          </p>
        </div>

        {/* Wallet Connection Card */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Connect Wallet</h2>
            <p className="text-gray-400 text-sm">
              Choose a wallet to connect to 0xGuard
            </p>
          </div>

          <div className="space-y-3">
            {/* MetaMask */}
            <button
              onClick={() => handleConnect(metaMaskConnector)}
              disabled={isConnecting}
              className="w-full flex items-center gap-4 px-4 py-3 bg-[#000000] border border-[#27272a] rounded-lg hover:bg-[#18181b] hover:border-[#3f3f46] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                src="/MetaMask-icon-fox.svg"
                alt="MetaMask"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-white">MetaMask</div>
                <div className="text-xs text-gray-400">Connect using MetaMask</div>
              </div>
              {isConnecting && (
                <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
              )}
            </button>

            {/* Coinbase Wallet */}
            <button
              onClick={() => handleConnect(coinbaseConnector)}
              disabled={isConnecting}
              className="w-full flex items-center gap-4 px-4 py-3 bg-[#000000] border border-[#27272a] rounded-lg hover:bg-[#18181b] hover:border-[#3f3f46] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                src="/download.png"
                alt="Base Wallet"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-white">Base Wallet</div>
                <div className="text-xs text-gray-400">Connect using Coinbase Wallet</div>
              </div>
              {isConnecting && (
                <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
              )}
            </button>

            {/* Phantom */}
            <button
              onClick={() => handleConnect(phantomConnector)}
              disabled={isConnecting}
              className="w-full flex items-center gap-4 px-4 py-3 bg-[#000000] border border-[#27272a] rounded-lg hover:bg-[#18181b] hover:border-[#3f3f46] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Image
                src="/4850.sp3ow1.192x192.png"
                alt="Phantom"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-white">Phantom</div>
                <div className="text-xs text-gray-400">Connect using Phantom</div>
              </div>
              {isConnecting && (
                <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
              )}
            </button>
          </div>

          {/* Status Message */}
          {isConnecting && (
            <div className="pt-4 border-t border-[#27272a]">
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Connecting wallet...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>By connecting, you agree to 0xGuard's Terms of Service</p>
        </div>
      </div>
    </div>
  );
}

