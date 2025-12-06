'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Mock login page for hackathon demo
export default function LoginPage() {
  const router = useRouter();

  // Mock login function - just redirects to dashboard
  const handleMockLogin = () => {
    router.push('/');
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
            Demo Mode - Click Login to continue
          </p>
        </div>

        {/* Mock Login Card */}
        <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Login</h2>
            <p className="text-gray-400 text-sm">
              Click the button below to access the dashboard (demo mode)
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleMockLogin}
              className="w-full px-6 py-3 bg-white text-black rounded-lg border border-[#27272a] hover:bg-gray-100 transition-all duration-200 text-sm font-medium"
            >
              Login
            </button>
          </div>

          {/* Status Message */}
          <div className="pt-4 border-t border-[#27272a]">
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Demo Mode Active</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">
              Mock User: 0x742d...5f0bEb
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>By connecting, you agree to 0xGuard's Terms of Service</p>
        </div>
      </div>
    </div>
  );
}

