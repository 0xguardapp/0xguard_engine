# 0xGuard Smart Contracts

This directory contains the smart contracts for the 0xGuard platform.

## AgentIdentityRegistry (ERC-8004)

The `AgentIdentityRegistry` contract implements the ERC-8004 standard for managing agent identities on-chain.

### Features

- **Agent Registration**: Register agents with identity URIs that reference Unibase record keys
- **Identity Updates**: Update agent identity URIs (owner-only)
- **Identity Queries**: Retrieve agent identity information
- **Ownership Control**: Only contract owner can register/update identities

### Functions

- `registerAgent(address agent, string identityURI)` - Register a new agent
- `updateIdentityURI(address agent, string newURI)` - Update an agent's identity URI
- `getIdentity(address agent)` - Get an agent's identity URI
- `getIdentityFull(address agent)` - Get complete identity information
- `isRegistered(address agent)` - Check if an agent is registered

### Events

- `AgentRegistered(address indexed agent, string identityURI)`
- `IdentityURIUpdated(address indexed agent, string oldURI, string newURI)`

### Deployment

#### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
export PRIVATE_KEY=your_private_key_here
export OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io
```

#### Deploy to Optimism Sepolia

```bash
npm run deploy:optimism-sepolia
```

### Compiler

- Solidity: `0.8.20`
- Network: Optimism Sepolia (Chain ID: 11155420)

### Security

This contract uses OpenZeppelin's `Ownable` for access control, ensuring only the contract owner can register and update agent identities.

