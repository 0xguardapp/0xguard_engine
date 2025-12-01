'use client';

import toast from 'react-hot-toast';

export function useToast() {
  return {
    thinking: () => {
      toast('🧠 ASI is hallucinating new vectors...', {
        icon: '🧠',
        duration: 3000,
        style: {
          border: '1px solid #06b6d4',
        },
      });
    },
    success: (message: string = 'Vulnerability Found & Saved to Memory') => {
      toast.success(message, {
        duration: 4000,
        style: {
          border: '1px solid #22c55e',
        },
      });
    },
    proof: (message: string = 'ZK Proof Minted on Midnight') => {
      toast('🛡️ ' + message, {
        icon: '🛡️',
        duration: 4000,
        style: {
          border: '1px solid #06b6d4',
        },
      });
    },
    error: (message: string) => {
      toast.error(message, {
        duration: 4000,
      });
    },
    info: (message: string) => {
      toast(message, {
        duration: 3000,
      });
    },
  };
}

