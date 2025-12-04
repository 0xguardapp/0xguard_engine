'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/hooks/useWallet';

export default function Header() {
  const router = useRouter();
  const { isConnected, address, isLoading, connectWallet, disconnectWallet, getTruncatedAddress, walletType } = useWallet();

  return (
    <header className="border-b border-[#27272a] bg-black sticky top-0 z-50 backdrop-blur-sm bg-black/95">
      <div className="max-w-[1920px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* OxGuard Symbol */}
            <Image
              src="/oxguard.png"
              alt="0xGuard"
              width={24}
              height={24}
              className="w-6 h-6"
              style={{ aspectRatio: '1 / 1' }}
            />
            <span className="font-semibold text-xl tracking-tight">0xGuard</span>
          </Link>
          <div className="text-gray-400 text-sm">my-team / audit-production</div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && address ? (
            <>
              {walletType === 'ethereum' ? (
                // Use RainbowKit's ConnectButton for Ethereum wallets (it handles connected state)
                <div className="[&>div>button]:px-3 [&>div>button]:py-1.5 [&>div>button]:bg-[#09090b] [&>div>button]:rounded-lg [&>div>button]:border [&>div>button]:border-[#27272a] [&>div>button]:hover:border-gray-700 [&>div>button]:transition-all [&>div>button]:duration-200">
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
                          {(() => {
                            if (!connected) {
                              return (
                                <button
                                  onClick={openConnectModal}
                                  type="button"
                                  className="px-4 py-1.5 bg-white text-black rounded-lg border border-[#27272a] hover:bg-gray-100 transition-all duration-200 text-sm font-medium"
                                >
                                  Connect Wallet
                                </button>
                              );
                            }

                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={openAccountModal}
                                  type="button"
                                  className="flex items-center gap-2 px-3 py-1.5 bg-[#09090b] rounded-lg border border-[#27272a] hover:border-gray-700 transition-all duration-200 cursor-pointer"
                                >
                                  <div className="relative w-6 h-6 rounded-full overflow-hidden">
                                    <Image
                                      src="/a10449a3-3a09-4686-bee2-96074c95c47d.png"
                                      alt="Profile"
                                      width={24}
                                      height={24}
                                      className="w-6 h-6 rounded-full object-cover"
                                      style={{ aspectRatio: '1 / 1' }}
                                    />
                                  </div>
                                  <div className="w-2 h-2 bg-green-500 rounded-full pulse-green"></div>
                                  <span className="text-sm mono text-gray-300">
                                    {account.displayName}
                                  </span>
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    }}
                  </ConnectButton.Custom>
                </div>
              ) : (
                // Keplr wallet display
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#09090b] rounded-lg border border-[#27272a] hover:border-gray-700 transition-all duration-200 cursor-pointer" 
                  onClick={disconnectWallet}
                >
                  <div className="relative w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src="/a10449a3-3a09-4686-bee2-96074c95c47d.png"
                      alt="Profile"
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover"
                      style={{ aspectRatio: '1 / 1' }}
                    />
                  </div>
                  <div className="w-2 h-2 bg-green-500 rounded-full pulse-green"></div>
                  <span className="text-sm mono text-gray-300">{getTruncatedAddress()}</span>
                </div>
              )}
              <div className="w-px h-6 bg-[#27272a]"></div>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-1.5 bg-white text-black rounded-lg border border-[#27272a] hover:bg-gray-100 transition-all duration-200 text-sm font-medium"
              >
                Connect Wallet
              </button>
              <div className="w-px h-6 bg-[#27272a]"></div>
            </>
          )}
          <div className="flex items-center gap-3">
            <a
              href="#"
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-all duration-200 rounded-lg hover:bg-[#09090b]"
              aria-label="GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
            <a
              href="#"
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition-all duration-200 rounded-lg hover:bg-[#09090b]"
              aria-label="Documentation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}

