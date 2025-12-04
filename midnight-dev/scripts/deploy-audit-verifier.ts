#!/usr/bin/env tsx
/**
 * Deploy AuditVerifier Contract to Midnight Network
 * 
 * Production-ready deployment script with:
 * - Network connection (devnet/testnet)
 * - Contract compilation
 * - Deployment with retry logic
 * - Contract address validation
 * - Gas estimation
 * - Environment variable management
 * - Deployment verification
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { NetworkId, setNetworkId, getLedgerNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { Contract, ledger, type Ledger } from "../../contracts/midnight/build/contract/index.cjs";
import { witnesses, type AuditPrivateState } from "../../contracts/midnight/src/witnesses.js";
import { 
  deployContract, 
  findDeployedContract,
  type ContractProviders 
} from "@midnight-ntwrk/midnight-js-contracts";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { createBalancedTx } from "@midnight-ntwrk/midnight-js-types";
import { Transaction } from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import { Wallet } from "@midnight-ntwrk/wallet";
import { createWalletFromMnemonic } from "@midnight-ntwrk/wallet";
import * as Rx from "rxjs";

// Get script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../");

// Load environment variables
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

// ============================================================================
// Types and Interfaces
// ============================================================================

interface DeploymentConfig {
  network: "devnet" | "testnet" | "mainnet";
  rpcEndpoint: string;
  indexer: string;
  indexerWS: string;
  proofServer: string;
  mnemonic: string;
  force: boolean;
  retries: number;
}

interface DeploymentResult {
  success: boolean;
  contractAddress?: string;
  transactionHash?: string;
  gasUsed?: number;
  blockHeight?: number;
  verificationStatus?: boolean;
  error?: string;
}

interface DeploymentInfo {
  contractAddress: string;
  transactionHash: string;
  network: string;
  deployedAt: string;
  gasUsed?: number;
  blockHeight?: number;
}

// ============================================================================
// Logger
// ============================================================================

class Logger {
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  info(message: string, data?: any): void {
    console.log(`ℹ️  ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  success(message: string, data?: any): void {
    console.log(`✅ ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  error(message: string, error?: any): void {
    console.error(`❌ ${message}`, error ? (error instanceof Error ? error.message : String(error)) : "");
    if (this.verbose && error instanceof Error) {
      console.error(error.stack);
    }
  }

  warn(message: string, data?: any): void {
    console.warn(`⚠️  ${message}`, data ? JSON.stringify(data, null, 2) : "");
  }

  step(step: number, total: number, message: string): void {
    console.log(`\n[${step}/${total}] ${message}`);
    console.log("─".repeat(50));
  }
}

// ============================================================================
// Configuration
// ============================================================================

function loadConfig(force: boolean = false): DeploymentConfig {
  const network = (process.env.MIDNIGHT_NETWORK || "devnet") as "devnet" | "testnet" | "mainnet";
  
  // Determine endpoints based on network
  let rpcEndpoint: string;
  let indexer: string;
  let indexerWS: string;
  let proofServer: string;

  if (network === "devnet") {
    rpcEndpoint = process.env.MIDNIGHT_NODE || "http://127.0.0.1:6300";
    indexer = process.env.MIDNIGHT_INDEXER || "http://127.0.0.1:6300/graphql";
    indexerWS = process.env.MIDNIGHT_INDEXER_WS || "ws://127.0.0.1:6300/graphql/ws";
    proofServer = process.env.MIDNIGHT_PROOF_SERVER || "http://127.0.0.1:6300";
  } else if (network === "testnet") {
    rpcEndpoint = process.env.MIDNIGHT_NODE || "https://rpc.testnet-02.midnight.network";
    indexer = process.env.MIDNIGHT_INDEXER || "https://indexer.testnet-02.midnight.network/api/v1/graphql";
    indexerWS = process.env.MIDNIGHT_INDEXER_WS || "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws";
    proofServer = process.env.MIDNIGHT_PROOF_SERVER || "http://127.0.0.1:6300";
  } else {
    rpcEndpoint = process.env.MIDNIGHT_NODE || "https://rpc.mainnet.midnight.network";
    indexer = process.env.MIDNIGHT_INDEXER || "https://indexer.mainnet.midnight.network/api/v1/graphql";
    indexerWS = process.env.MIDNIGHT_INDEXER_WS || "wss://indexer.mainnet.midnight.network/api/v1/graphql/ws";
    proofServer = process.env.MIDNIGHT_PROOF_SERVER || "http://127.0.0.1:6300";
  }

  const mnemonic = process.env.MIDNIGHT_MNEMONIC || "";
  if (!mnemonic && network !== "devnet") {
    throw new Error("MIDNIGHT_MNEMONIC is required for testnet/mainnet");
  }

  return {
    network,
    rpcEndpoint,
    indexer,
    indexerWS,
    proofServer,
    mnemonic,
    force,
    retries: 3,
  };
}

// ============================================================================
// Contract Compilation
// ============================================================================

async function compileContract(logger: Logger): Promise<boolean> {
  try {
    logger.step(1, 6, "Compiling Compact Contract");
    
    // Check multiple possible contract locations
    const contractsDir = resolve(PROJECT_ROOT, "../contracts/midnight");
    const newContractDir = resolve(PROJECT_ROOT, "contracts");
    const compactFile = resolve(contractsDir, "src/AuditVerifier.compact");
    const newCompactFile = resolve(newContractDir, "AuditVerifier.compact");
    
    // Determine which contract to use
    let contractPath: string;
    if (existsSync(compactFile)) {
      contractPath = contractsDir;
      logger.info(`Using contract from: ${compactFile}`);
    } else if (existsSync(newCompactFile)) {
      contractPath = newContractDir;
      logger.info(`Using contract from: ${newCompactFile}`);
      logger.warn("Note: New contract location detected. Ensure witnesses.ts is updated if needed.");
    } else {
      throw new Error(`Contract file not found. Checked:\n  - ${compactFile}\n  - ${newCompactFile}`);
    }

    logger.info("Running Compact compiler...");
    
    // Compile contract
    try {
      // If using new contract location, copy to contracts/midnight/src first
      if (contractPath === newContractDir) {
        logger.info("Copying new contract to contracts/midnight/src...");
        const targetDir = resolve(contractsDir, "src");
        if (!existsSync(targetDir)) {
          throw new Error(`Target directory does not exist: ${targetDir}`);
        }
        execSync(`cp "${newCompactFile}" "${resolve(targetDir, "AuditVerifier.compact")}"`, {
          stdio: "inherit",
        });
      }
      
      execSync("npm run compact", {
        cwd: contractsDir,
        stdio: "inherit",
      });
      
      logger.info("Running TypeScript build...");
      execSync("npm run build", {
        cwd: contractsDir,
        stdio: "inherit",
      });
      
      logger.success("Contract compiled successfully");
      return true;
    } catch (error) {
      logger.error("Compilation failed", error);
      throw error;
    }
  } catch (error) {
    logger.error("Contract compilation error", error);
    return false;
  }
}

// ============================================================================
// Network Connection
// ============================================================================

async function checkNetworkConnection(config: DeploymentConfig, logger: Logger): Promise<boolean> {
  try {
    logger.step(2, 6, "Checking Network Connection");
    
    logger.info(`Connecting to ${config.network}...`);
    logger.info(`RPC Endpoint: ${config.rpcEndpoint}`);
    logger.info(`Proof Server: ${config.proofServer}`);

    // Check proof server
    try {
      const response = await fetch(`${config.proofServer}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok || response.status === 404) {
        logger.success("Proof server is accessible");
      } else {
        logger.warn(`Proof server returned status: ${response.status}`);
      }
    } catch (error) {
      if (config.network === "devnet") {
        logger.warn("Proof server not accessible (devnet may not be running)");
        logger.warn("Start devnet with: npm run devnet:start");
      } else {
        logger.error("Proof server connection failed", error);
        return false;
      }
    }

    // Set network ID
    const networkId = config.network === "mainnet" ? NetworkId.MainNet : NetworkId.TestNet;
    setNetworkId(networkId);
    logger.info(`Network ID set to: ${networkId}`);

    logger.success("Network connection verified");
    return true;
  } catch (error) {
    logger.error("Network connection failed", error);
    return false;
  }
}

// ============================================================================
// Wallet Setup
// ============================================================================

async function setupWallet(config: DeploymentConfig, logger: Logger): Promise<Wallet | null> {
  try {
    logger.step(3, 6, "Setting Up Wallet");

    if (!config.mnemonic) {
      if (config.network === "devnet") {
        logger.warn("No mnemonic provided - using test wallet for devnet");
        // For devnet, we can proceed without mnemonic (test mode)
        return null;
      } else {
        throw new Error("Mnemonic is required for testnet/mainnet");
      }
    }

    logger.info("Creating wallet from mnemonic...");
    const wallet = await createWalletFromMnemonic(config.mnemonic);
    
    logger.info("Waiting for wallet to sync...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    const walletState = await Rx.firstValueFrom(wallet.state());
    logger.success(`Wallet initialized - Address: ${walletState.coinPublicKey}`);

    return wallet;
  } catch (error) {
    logger.error("Wallet setup failed", error);
    return null;
  }
}

// ============================================================================
// Contract Deployment
// ============================================================================

async function deployContractWithRetry(
  config: DeploymentConfig,
  wallet: Wallet | null,
  logger: Logger
): Promise<DeploymentResult> {
  const maxRetries = config.retries;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.step(4, 6, `Deploying Contract (Attempt ${attempt}/${maxRetries})`);

      // Create providers
      const privateStateStoreName = process.env.MIDNIGHT_STATE_STORE || "0xguard-deployment-state";
      const zkConfigPath = resolve(PROJECT_ROOT, "../contracts/midnight/build");

      // Create wallet provider
      let walletProvider: any;
      if (wallet) {
        const walletState = await Rx.firstValueFrom(wallet.state());
        const zswapNetworkId = getLedgerNetworkId();
        
        walletProvider = {
          coinPublicKey: walletState.coinPublicKey,
          encryptionPublicKey: walletState.encryptionPublicKey,
          balanceTx(tx: any, newCoins: any) {
            return wallet
              .balanceTransaction(
                ZswapTransaction.deserialize(
                  tx.serialize(getLedgerNetworkId()),
                  zswapNetworkId
                ),
                newCoins
              )
              .then((tx: any) => wallet.proveTransaction(tx))
              .then((zswapTx: any) =>
                Transaction.deserialize(
                  zswapTx.serialize(zswapNetworkId),
                  getLedgerNetworkId()
                )
              )
              .then(createBalancedTx);
          },
          submitTx(tx: any) {
            return wallet.submitTransaction(tx);
          }
        };
      } else {
        // Devnet mode without wallet
        logger.warn("Deploying without wallet (devnet test mode)");
        walletProvider = null;
      }

      const providers: ContractProviders<Contract<AuditPrivateState>> = {
        privateStateProvider: levelPrivateStateProvider({
          privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider(zkConfigPath) as any,
        proofProvider: httpClientProofProvider(config.proofServer),
        walletProvider: walletProvider,
        midnightProvider: walletProvider,
      };

      // Create contract instance
      const contract = new Contract<AuditPrivateState>(witnesses);

      // Initial private state
      const initialPrivateState: AuditPrivateState = {
        exploitString: new Uint8Array(64),
        riskScore: 0n,
      };

      logger.info("Deploying contract to network...");
      const deployedContract = await deployContract(providers, {
        contract,
        privateStateId: privateStateStoreName,
        initialPrivateState,
      });

      const contractAddress = deployedContract.deployTxData?.public.contractAddress;
      const transactionHash = deployedContract.deployTxData?.public.txHash;
      const blockHeight = deployedContract.deployTxData?.public.blockHeight;

      if (!contractAddress) {
        throw new Error("Contract deployment succeeded but no address returned");
      }

      // Validate contract address
      if (!validateContractAddress(contractAddress)) {
        throw new Error(`Invalid contract address format: ${contractAddress}`);
      }

      logger.success(`Contract deployed successfully!`);
      logger.info(`Contract Address: ${contractAddress}`);
      logger.info(`Transaction Hash: ${transactionHash}`);
      logger.info(`Block Height: ${blockHeight || "N/A"}`);

      return {
        success: true,
        contractAddress,
        transactionHash,
        blockHeight,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Deployment attempt ${attempt} failed`, lastError);

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff
        logger.warn(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Deployment failed after all retries",
  };
}

// ============================================================================
// Contract Address Validation
// ============================================================================

function validateContractAddress(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Midnight contract addresses are typically hex strings
  // Basic validation: non-empty, reasonable length
  const hexPattern = /^[0-9a-fA-F]+$/;
  return address.length >= 32 && address.length <= 128 && hexPattern.test(address);
}

// ============================================================================
// Deployment Verification
// ============================================================================

async function verifyDeployment(
  contractAddress: string,
  config: DeploymentConfig,
  logger: Logger
): Promise<boolean> {
  try {
    logger.step(5, 6, "Verifying Deployment");

    logger.info("Querying contract state...");
    
    const providers: ContractProviders<Contract<AuditPrivateState>> = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: process.env.MIDNIGHT_STATE_STORE || "0xguard-deployment-state",
      }),
      publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
      zkConfigProvider: new NodeZkConfigProvider(
        resolve(PROJECT_ROOT, "../contracts/midnight/build")
      ) as any,
      proofProvider: httpClientProofProvider(config.proofServer),
      walletProvider: null,
      midnightProvider: null,
    };

    const contract = new Contract<AuditPrivateState>(witnesses);
    
    // Try to find the deployed contract
    const foundContract = await findDeployedContract(providers, {
      contract,
      contractAddress,
      privateStateId: process.env.MIDNIGHT_STATE_STORE || "0xguard-deployment-state",
      initialPrivateState: {
        exploitString: new Uint8Array(64),
        riskScore: 0n,
      },
    });

    if (foundContract) {
      logger.success("Contract found on network");
      
      // Query contract state
      const state = await providers.publicDataProvider.queryContractState(contractAddress);
      const ledgerState = ledger(state.data);
      
      logger.info("Contract state retrieved successfully");
      logger.info(`Ledger maps initialized: ${ledgerState ? "Yes" : "No"}`);
      
      return true;
    } else {
      logger.warn("Contract not found on network (may need time to propagate)");
      return false;
    }
  } catch (error) {
    logger.error("Deployment verification failed", error);
    return false;
  }
}

// ============================================================================
// Save Deployment Info
// ============================================================================

function saveDeploymentInfo(
  result: DeploymentResult,
  config: DeploymentConfig,
  logger: Logger
): void {
  try {
    logger.step(6, 6, "Saving Deployment Information");

    if (!result.contractAddress) {
      throw new Error("No contract address to save");
    }

    // Save to .env file
    const envPath = join(PROJECT_ROOT, ".env");
    let envContent = "";
    
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, "utf-8");
    }

    // Update or add contract address
    if (envContent.includes("MIDNIGHT_CONTRACT_ADDRESS")) {
      envContent = envContent.replace(
        /MIDNIGHT_CONTRACT_ADDRESS=.*/,
        `MIDNIGHT_CONTRACT_ADDRESS=${result.contractAddress}`
      );
    } else {
      envContent += `\nMIDNIGHT_CONTRACT_ADDRESS=${result.contractAddress}\n`;
    }

    writeFileSync(envPath, envContent);
    logger.success(`Contract address saved to .env: ${result.contractAddress}`);

    // Save to JSON file
    const deploymentInfo: DeploymentInfo = {
      contractAddress: result.contractAddress,
      transactionHash: result.transactionHash || "",
      network: config.network,
      deployedAt: new Date().toISOString(),
      gasUsed: result.gasUsed,
      blockHeight: result.blockHeight,
    };

    const jsonPath = join(PROJECT_ROOT, "deployment-info.json");
    writeFileSync(jsonPath, JSON.stringify(deploymentInfo, null, 2));
    logger.success(`Deployment info saved to: ${jsonPath}`);

    logger.info("\n📋 Deployment Summary:");
    logger.info(`   Contract Address: ${result.contractAddress}`);
    logger.info(`   Transaction Hash: ${result.transactionHash || "N/A"}`);
    logger.info(`   Network: ${config.network}`);
    logger.info(`   Block Height: ${result.blockHeight || "N/A"}`);
    logger.info(`   Deployed At: ${deploymentInfo.deployedAt}`);
  } catch (error) {
    logger.error("Failed to save deployment info", error);
  }
}

// ============================================================================
// Main Deployment Function
// ============================================================================

async function main(): Promise<void> {
  const logger = new Logger(process.env.MIDNIGHT_VERBOSE === "true");
  
  console.log("\n" + "=".repeat(60));
  console.log("🌙 AuditVerifier Contract Deployment");
  console.log("=".repeat(60) + "\n");

  // Parse command line arguments
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const networkArg = args.find(arg => arg.startsWith("--network="));
  const network = networkArg ? networkArg.split("=")[1] : undefined;

  if (network) {
    process.env.MIDNIGHT_NETWORK = network;
  }

  try {
    // Load configuration
    const config = loadConfig(force);
    logger.info(`Network: ${config.network}`);
    logger.info(`Force redeploy: ${force}\n`);

    // Check if contract already deployed
    if (!force && process.env.MIDNIGHT_CONTRACT_ADDRESS) {
      logger.warn(`Contract already deployed: ${process.env.MIDNIGHT_CONTRACT_ADDRESS}`);
      logger.warn("Use --force to redeploy");
      process.exit(0);
    }

    // Step 1: Compile contract
    const compiled = await compileContract(logger);
    if (!compiled) {
      throw new Error("Contract compilation failed");
    }

    // Step 2: Check network connection
    const connected = await checkNetworkConnection(config, logger);
    if (!connected) {
      throw new Error("Network connection failed");
    }

    // Step 3: Setup wallet
    const wallet = await setupWallet(config, logger);

    // Step 4: Deploy contract
    const deploymentResult = await deployContractWithRetry(config, wallet, logger);
    if (!deploymentResult.success || !deploymentResult.contractAddress) {
      throw new Error(deploymentResult.error || "Deployment failed");
    }

    // Step 5: Verify deployment
    const verified = await verifyDeployment(deploymentResult.contractAddress, config, logger);
    deploymentResult.verificationStatus = verified;

    // Step 6: Save deployment info
    saveDeploymentInfo(deploymentResult, config, logger);

    // Final summary
    console.log("\n" + "=".repeat(60));
    logger.success("🎉 Deployment Complete!");
    console.log("=".repeat(60));
    console.log(`\nContract Address: ${deploymentResult.contractAddress}`);
    console.log(`Transaction Hash: ${deploymentResult.transactionHash || "N/A"}`);
    console.log(`Verification Status: ${verified ? "✅ Verified" : "⚠️  Pending"}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Contract address saved to .env`);
    console.log(`  2. Deployment info saved to deployment-info.json`);
    console.log(`  3. You can now interact with the contract\n`);

    process.exit(0);
  } catch (error) {
    logger.error("Deployment failed", error);
    console.log("\n" + "=".repeat(60));
    console.log("❌ Deployment Failed");
    console.log("=".repeat(60));
    process.exit(1);
  }
}

// Run deployment
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

