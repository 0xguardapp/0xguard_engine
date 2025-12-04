/**
 * Midnight Network Development Configuration
 * 
 * This file configures the Midnight Network development environment
 * including network settings, proof server, and contract deployment.
 */

import { NetworkId, setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Midnight Network Configuration
 */
export const midnightConfig = {
  // Network settings
  network: process.env.MIDNIGHT_NETWORK || "testnet",
  networkId: process.env.MIDNIGHT_NETWORK === "mainnet" 
    ? NetworkId.MainNet 
    : NetworkId.TestNet,

  // Proof server (local devnet)
  proofServer: {
    url: process.env.MIDNIGHT_PROOF_SERVER || "http://127.0.0.1:6300",
    enabled: process.env.MIDNIGHT_PROOF_SERVER_ENABLED !== "false",
  },

  // Midnight Network endpoints
  endpoints: {
    // Testnet endpoints (default)
    testnet: {
      indexer: process.env.MIDNIGHT_INDEXER || 
        "https://indexer.testnet-02.midnight.network/api/v1/graphql",
      indexerWS: process.env.MIDNIGHT_INDEXER_WS || 
        "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
      node: process.env.MIDNIGHT_NODE || 
        "https://rpc.testnet-02.midnight.network",
    },
    // Mainnet endpoints (if needed)
    mainnet: {
      indexer: process.env.MIDNIGHT_INDEXER || 
        "https://indexer.mainnet.midnight.network/api/v1/graphql",
      indexerWS: process.env.MIDNIGHT_INDEXER_WS || 
        "wss://indexer.mainnet.midnight.network/api/v1/graphql/ws",
      node: process.env.MIDNIGHT_NODE || 
        "https://rpc.mainnet.midnight.network",
    },
  },

  // Contract configuration
  contracts: {
    // Contract paths
    sourceDir: resolve(__dirname, "../contracts/midnight/src"),
    buildDir: resolve(__dirname, "../contracts/midnight/build"),
    distDir: resolve(__dirname, "../contracts/midnight/dist"),
    // Deployed contract addresses
    auditVerifier: process.env.MIDNIGHT_CONTRACT_ADDRESS || "",
  },

  // Private state storage
  privateState: {
    storeName: process.env.MIDNIGHT_STATE_STORE || "0xguard-devnet-state",
    path: process.env.MIDNIGHT_STATE_PATH || resolve(__dirname, "./.state"),
  },

  // Wallet configuration
  wallet: {
    mnemonic: process.env.MIDNIGHT_MNEMONIC || "",
    derivationPath: process.env.MIDNIGHT_DERIVATION_PATH || "m/44'/6174'/0'/0/0",
  },

  // Development settings
  dev: {
    verbose: process.env.MIDNIGHT_VERBOSE === "true",
    logLevel: process.env.MIDNIGHT_LOG_LEVEL || "info",
  },
};

/**
 * Get current network endpoints based on configuration
 */
export function getNetworkEndpoints() {
  const network = midnightConfig.network;
  return midnightConfig.endpoints[network] || midnightConfig.endpoints.testnet;
}

/**
 * Initialize network ID
 */
export function initializeNetwork() {
  setNetworkId(midnightConfig.networkId);
  if (midnightConfig.dev.verbose) {
    console.log(`🌙 Midnight Network initialized: ${midnightConfig.network}`);
    console.log(`   Proof Server: ${midnightConfig.proofServer.url}`);
    console.log(`   Network ID: ${midnightConfig.networkId}`);
  }
}

/**
 * Validate configuration
 */
export function validateConfig() {
  const errors = [];

  if (!midnightConfig.proofServer.url) {
    errors.push("MIDNIGHT_PROOF_SERVER is required");
  }

  if (midnightConfig.network === "mainnet" && !midnightConfig.wallet.mnemonic) {
    errors.push("MIDNIGHT_MNEMONIC is required for mainnet");
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join("\n")}`);
  }

  return true;
}

// Auto-initialize on import
initializeNetwork();

export default midnightConfig;

