import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, formatUnits } from 'viem';
import { optimismSepolia } from 'viem/chains';

// Contract addresses from environment
const IDENTITY_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || '') as `0x${string}`;
const REPUTATION_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS || '') as `0x${string}`;
const VALIDATION_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS || '') as `0x${string}`;
const OPTIMISM_SEPOLIA_RPC = process.env.NEXT_PUBLIC_OPTIMISM_SEPOLIA_RPC_URL || 'https://sepolia.optimism.io';
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';

// Minimal ABIs for the required functions
const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "getIdentity",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "getIdentityFull",
    outputs: [
      {
        components: [
          { internalType: "string", name: "identityURI", type: "string" },
          { internalType: "uint256", name: "registeredAt", type: "uint256" },
          { internalType: "uint256", name: "lastUpdated", type: "uint256" }
        ],
        internalType: "struct AgentIdentityRegistry.AgentIdentity",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "isRegistered",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

const REPUTATION_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "getReputation",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "score", type: "uint256" },
          { internalType: "uint256", name: "lastUpdated", type: "uint256" },
          { internalType: "string", name: "evidenceURI", type: "string" }
        ],
        internalType: "struct AgentReputationRegistry.Reputation",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];

const VALIDATION_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "address", name: "agent", type: "address" }],
    name: "getValidation",
    outputs: [
      { internalType: "bool", name: "valid", type: "bool" },
      { internalType: "string", name: "evidenceURI", type: "string" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// Helper to get RPC URL
function getRpcUrl(): string {
  if (ALCHEMY_API_KEY) {
    return `https://opt-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  }
  if (INFURA_API_KEY) {
    return `https://optimism-sepolia.infura.io/v3/${INFURA_API_KEY}`;
  }
  return OPTIMISM_SEPOLIA_RPC;
}

// Create viem public client
function getPublicClient() {
  return createPublicClient({
    chain: optimismSepolia,
    transport: http(getRpcUrl())
  });
}

// Helper to fetch from Unibase
async function fetchFromUnibase(uri: string): Promise<any> {
  try {
    // Extract key from URI (format: unibase://record/{key})
    const match = uri.match(/unibase:\/\/record\/(.+)/);
    if (!match) return null;

    const key = match[1];
    const unibaseRpc = process.env.UNIBASE_RPC_URL || 'https://testnet.unibase.io';
    
    const response = await fetch(`${unibaseRpc}/get?key=${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.value) {
        return JSON.parse(data.value);
      }
    }
  } catch (error) {
    console.error('Error fetching from Unibase:', error);
  }
  return null;
}

// Helper to fetch events from Alchemy/Infura
async function fetchOnChainEvents(address: `0x${string}`, client: ReturnType<typeof getPublicClient>): Promise<any[]> {
  const events: any[] = [];
  
  try {
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock > BigInt(10000) ? currentBlock - BigInt(10000) : BigInt(0);
    
    // Event topic hashes (keccak256 of event signatures)
    const AGENT_REGISTERED_TOPIC = '0x...'; // Would be actual topic hash
    const REPUTATION_UPDATED_TOPIC = '0x...';
    const AGENT_VALIDATED_TOPIC = '0x...';
    
    // Fetch AgentRegistered events from Identity Registry
    if (IDENTITY_REGISTRY_ADDRESS) {
      try {
        const logs = await client.getLogs({
          address: IDENTITY_REGISTRY_ADDRESS,
          event: {
            type: 'event',
            name: 'AgentRegistered',
            inputs: [
              { type: 'address', indexed: true, name: 'agent' },
              { type: 'string', indexed: false, name: 'identityURI' }
            ]
          } as any,
          args: { agent: address },
          fromBlock,
          toBlock: 'latest'
        });
        
        for (const log of logs) {
          const block = await client.getBlock({ blockNumber: log.blockNumber });
          events.push({
            type: 'AgentRegistered',
            transactionHash: log.transactionHash,
            blockNumber: Number(log.blockNumber),
            timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
            data: { identityURI: (log.args as any)?.identityURI || '' }
          });
        }
      } catch (error) {
        // Event fetching may fail if contract not deployed or no events
        console.error('Error fetching identity events:', error);
      }
    }
    
    // Similar for other registries - simplified for now
    // In production, would use proper event filtering with topic hashes
    
  } catch (error) {
    console.error('Error fetching on-chain events:', error);
  }
  
  // Sort by block number (newest first)
  events.sort((a, b) => b.blockNumber - a.blockNumber);
  
  return events.slice(0, 20); // Limit to 20 most recent
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = params.address as `0x${string}`;
  
  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return NextResponse.json(
      { error: 'Invalid agent address' },
      { status: 400 }
    );
  }

  try {
    const client = getPublicClient();
    
    // Fetch identity
    let identity: any = { address };
    let identityUri = '';
    
    if (IDENTITY_REGISTRY_ADDRESS) {
      try {
        const identityData = await client.readContract({
          address: IDENTITY_REGISTRY_ADDRESS,
          abi: IDENTITY_REGISTRY_ABI,
          functionName: 'getIdentityFull',
          args: [address]
        }) as [string, bigint, bigint];
        
        if (identityData && identityData[0]) {
          identityUri = identityData[0];
          identity.identity_uri = identityUri;
          identity.registered_at = Number(identityData[1]);
          identity.last_updated = Number(identityData[2]);
        }
      } catch (error) {
        console.error('Error fetching identity:', error);
      }
    }

    // Fetch from Unibase if URI exists
    if (identityUri) {
      const unibaseData = await fetchFromUnibase(identityUri);
      if (unibaseData && unibaseData.data) {
        identity = { ...identity, ...unibaseData.data, identity_uri: identityUri };
        if (unibaseData.agent) {
          identity.unibase_key = unibaseData.agent;
        }
      }
    }

    // Fetch reputation
    let reputation: any = null;
    if (REPUTATION_REGISTRY_ADDRESS) {
      try {
        const repData = await client.readContract({
          address: REPUTATION_REGISTRY_ADDRESS,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'getReputation',
          args: [address]
        }) as [bigint, bigint, string];
        
        if (repData) {
          reputation = {
            score: Number(repData[0]),
            lastUpdated: Number(repData[1]),
            evidenceURI: repData[2],
            history: [] // Would need to fetch from events
          };
        }
      } catch (error) {
        console.error('Error fetching reputation:', error);
      }
    }

    // Fetch validation
    let validation: any = null;
    if (VALIDATION_REGISTRY_ADDRESS) {
      try {
        const valData = await client.readContract({
          address: VALIDATION_REGISTRY_ADDRESS,
          abi: VALIDATION_REGISTRY_ABI,
          functionName: 'getValidation',
          args: [address]
        }) as [boolean, string];
        
        if (valData) {
          validation = {
            valid: valData[0],
            evidenceURI: valData[1]
          };
        }
      } catch (error) {
        console.error('Error fetching validation:', error);
      }
    }

    // Fetch memory from Unibase
    let memory: any = {};
    try {
      const memoryKey = `agent:mem:${address.toLowerCase().replace('0x', '')}`;
      const unibaseRpc = process.env.UNIBASE_RPC_URL || 'https://testnet.unibase.io';
      const response = await fetch(`${unibaseRpc}/get?key=${encodeURIComponent(memoryKey)}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.value) {
          const parsed = JSON.parse(data.value);
          memory = parsed.data || {};
        }
      }
    } catch (error) {
      console.error('Error fetching memory:', error);
    }

    // Fetch on-chain events
    const events = await fetchOnChainEvents(address, client);

    // Check ERC-3009 support (check if address has received with authorization capability)
    const erc3009Available = false; // Would check AgentToken contract

    return NextResponse.json({
      identity,
      reputation,
      validation,
      memory,
      events,
      erc3009Available
    });
  } catch (error) {
    console.error('Error fetching agent data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

