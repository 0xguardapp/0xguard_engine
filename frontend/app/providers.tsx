"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { optimismSepolia } from "wagmi/chains";
import {
  RainbowKitProvider,
  getDefaultWallets,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";
import {
  metaMaskConnector,
  coinbaseConnector,
  phantomConnector,
} from "@/lib/walletConnectors";

const { connectors: defaultConnectors } = getDefaultWallets({
  appName: "0xGuard",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_WALLETCONNECT_ID",
  chains: [optimismSepolia],
});

// Combine default connectors with custom connectors
const connectors = [
  ...defaultConnectors,
  metaMaskConnector,
  coinbaseConnector,
  phantomConnector,
];

const config = createConfig({
  chains: [optimismSepolia],
  connectors,
  transports: {
    [optimismSepolia.id]: http(),
  },
});

// Create a QueryClient instance for wagmi
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern to keep the same query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

