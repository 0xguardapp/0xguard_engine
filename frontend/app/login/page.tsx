'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/hooks/useWallet';

export default function LoginPage() {
  const router = useRouter();
  const { isConnected, address, connectWallet, isLoading, walletType } = useWallet();

  // Redirect to dashboard if already connected
  useEffect(() => {
    if (isConnected && address) {
      router.push('/');
    }
  }, [isConnected, address, router]);

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
            Connect your wallet to access the dashboard
          </p>
        </div>

        {/* Wallet Connection Card */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Connect Wallet</h2>
            <p className="text-gray-400 text-sm">
              Connect your browser extension wallet to continue
            </p>
          </div>

          <div className="space-y-4">
            {/* Ethereum Wallet Connection */}
            {typeof window !== 'undefined' && (window as any).ethereum ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Ethereum Wallet
                </label>
                <div className="flex justify-center">
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      mounted,
                    }) => {
                      const ready = mounted;
                      const connected = ready && account && chain;

                      return (
                        <div
                          {...(!ready && {
                            'aria-hidden': true,
                            style: {
                              opacity: 0,
                              pointerEvents: 'none',
                              userSelect: 'none',
                            },
                          })}
                        >
                          {!connected ? (
                            <button
                              onClick={openConnectModal}
                              type="button"
                              className="w-full px-6 py-3 bg-white text-black rounded-lg border border-[#27272a] hover:bg-gray-100 transition-all duration-200 text-sm font-medium"
                            >
                              Connect Wallet
                            </button>
                          ) : (
                            <div className="w-full px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                              <p className="text-sm text-green-400">
                                Connected: {account.displayName}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              </div>
            ) : null}

            {/* Keplr Wallet Connection */}
            {typeof window !== 'undefined' && 'keplr' in window ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Keplr Wallet
                </label>
                <button
                  onClick={connectWallet}
                  disabled={isLoading || isConnected}
                  className="w-full px-6 py-3 bg-white text-black rounded-lg border border-[#27272a] hover:bg-gray-100 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading
                    ? 'Connecting...'
                    : isConnected && walletType === 'keplr'
                    ? 'Connected'
                    : 'Connect Keplr'}
                </button>
              </div>
            ) : null}

            {/* No Wallet Available */}
            {typeof window !== 'undefined' &&
            !(window as any).ethereum &&
            !('keplr' in window) ? (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-400 text-center">
                  No wallet extension detected. Please install MetaMask or another
                  Ethereum wallet extension.
                </p>
              </div>
            ) : null}
          </div>

          {/* Status Message */}
          {isConnected && address && (
            <div className="pt-4 border-t border-[#27272a]">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Wallet connected successfully</span>
              </div>
              <p className="text-xs text-gray-500 mt-2 font-mono">
                {address}
              </p>
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

