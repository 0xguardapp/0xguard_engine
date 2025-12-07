"use client";

import { useRouter } from "next/navigation";

export default function ConnectWalletMenu() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/login');
  };

  return (
    <button
      onClick={handleClick}
      className="
        bg-white text-black border border-gray-200 
        px-3 py-1.5 rounded-lg shadow-sm 
        hover:shadow-md transition-all font-medium text-sm
      "
      style={{ color: '#000000' }}
    >
      Connect Wallet
    </button>

  );
}

