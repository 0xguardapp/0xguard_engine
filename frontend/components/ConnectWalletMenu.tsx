"use client";

import { useState } from "react";
import Image from "next/image";
import { useConnect } from "wagmi";
import {
  metaMaskConnector,
  coinbaseConnector,
  phantomConnector,
} from "../lib/walletConnectors";

export default function ConnectWalletMenu() {
  const [open, setOpen] = useState(false);
  const { connect } = useConnect();

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* MAIN BUTTON - Smaller size */}
      <button
        className="
          bg-white text-black border border-gray-200 
          px-3 py-1.5 rounded-lg shadow-sm 
          hover:shadow-md transition-all font-medium text-sm
        "
        style={{ color: '#000000' }}
      >
        Connect Wallet
      </button>

      {/* HOVER MENU - Black Glassmorphism Effect */}
      {open && (
        <div
          className="
            absolute top-10 left-0 w-48 
            rounded-lg border border-white/10 
            shadow-2xl shadow-black/80
            animate-fadeIn z-50
            overflow-hidden
          "
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          <div
            onClick={() => connect({ connector: metaMaskConnector })}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer text-white transition-all duration-200 border-b border-white/5"
          >
            <Image
              src="/MetaMask-icon-fox.svg"
              alt="MetaMask"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span className="font-medium text-sm">MetaMask</span>
          </div>
          <div
            onClick={() => connect({ connector: coinbaseConnector })}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer text-white transition-all duration-200 border-b border-white/5"
          >
            <Image
              src="/download.png"
              alt="Base Wallet"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span className="font-medium text-sm">Base Wallet</span>
          </div>
          <div
            onClick={() => connect({ connector: phantomConnector })}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer text-white transition-all duration-200"
          >
            <Image
              src="/4850.sp3ow1.192x192.png"
              alt="Phantom"
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <span className="font-medium text-sm">Phantom</span>
          </div>
        </div>
      )}
    </div>
  );
}

