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

## AgentReputationRegistry (ERC-8004)

The `AgentReputationRegistry` contract implements the ERC-8004 standard for managing agent reputation scores on-chain.

### Features

- **Reputation Tracking**: Track agent reputation scores with evidence references to Unibase record keys
- **Score Updates**: Update reputation scores with positive or negative deltas (admin-only)
- **Score Flooring**: Reputation scores are automatically floored at 0 (cannot go negative)
- **Evidence Tracking**: Each update includes an evidence URI pointing to a Unibase record key
- **Batch Updates**: Support for batch updating multiple agents at once
- **Ownership Control**: Only contract owner (admin) can update reputations

### Functions

- `updateReputation(address agent, int256 delta, string evidenceURI)` - Update an agent's reputation score
- `getReputation(address agent)` - Get complete reputation information (score, lastUpdated, evidenceURI)
- `getReputationScore(address agent)` - Get only the reputation score
- `hasReputation(address agent)` - Check if an agent has a reputation record
- `batchUpdateReputation(address[] agents, int256[] deltas, string[] evidenceURIs)` - Batch update multiple agents

### Events

- `ReputationUpdated(address indexed agent, uint256 score, string evidenceURI)`

### Reputation Model

- Reputation scores start at 0 for new agents
- Scores can be increased (positive delta) or decreased (negative delta)
- Scores are automatically floored at 0 - they cannot go negative
- Each update requires an evidence URI pointing to a Unibase record key
- The `lastUpdated` timestamp tracks when the reputation was last modified

### Deployment

#### Deploy Reputation Registry to Optimism Sepolia

```bash
npx hardhat run scripts/deploy-reputation.js --network optimismSepolia
```

### Security

This contract uses OpenZeppelin's `Ownable` for access control, ensuring only the contract owner (admin) can update agent reputations. All updates require evidence URIs for auditability.

## AgentValidationRegistry (ERC-8004)

The `AgentValidationRegistry` contract implements the ERC-8004 standard for managing agent validation status on-chain.

### Features

- **Agent Validation**: Validate agents with evidence references to Unibase validation records
- **Validation Revocation**: Revoke agent validation status (admin-only)
- **Status Queries**: Check validation status and retrieve evidence URIs
- **Evidence Tracking**: Each validation includes an evidence URI pointing to a Unibase validation record
- **Batch Operations**: Support for batch validating and revoking multiple agents
- **Ownership Control**: Only contract owner (admin) can validate/revoke agents

### Functions

- `validateAgent(address agent, string evidenceURI)` - Validate an agent with evidence
- `revokeAgent(address agent)` - Revoke an agent's validation status
- `getValidation(address agent)` - Get validation status and evidence URI (returns bool, string)
- `batchValidateAgents(address[] agents, string[] evidenceURIs)` - Batch validate multiple agents
- `batchRevokeAgents(address[] agents)` - Batch revoke multiple agents

### Events

- `AgentValidated(address indexed agent, string evidenceURI)`
- `AgentRevoked(address indexed agent)`

### Validation Model

- Agents start as unvalidated (false)
- Validation requires an evidence URI pointing to a Unibase validation record
- Agents can be re-validated with new evidence (updates the evidence URI)
- Revocation clears both validation status and evidence URI
- Public mappings allow direct access to `isValidAgent` and `validationEvidenceURI`

### Deployment

#### Deploy Validation Registry to Optimism Sepolia

```bash
npx hardhat run scripts/deploy-validation.js --network optimismSepolia
```

### Security

This contract uses OpenZeppelin's `Ownable` for access control, ensuring only the contract owner (admin) can validate and revoke agents. All validations require evidence URIs for auditability.

## AgentToken (ERC-20 with ERC-3009)

The `AgentToken` contract is an ERC-20 token with ERC-3009 gasless transfer support, enabling agents to receive payments without needing to pay gas fees.

### Features

- **Standard ERC-20**: Full ERC-20 token functionality
- **Gasless Transfers**: ERC-3009 support for meta-transactions
- **Transfer with Authorization**: Token holders can authorize transfers via off-chain signatures
- **Receive with Authorization**: Recipients can claim authorized tokens (paying gas themselves)
- **Cancel Authorization**: Token holders can cancel pending authorizations
- **EIP-712 Signatures**: Secure structured data signing for authorizations
- **Replay Protection**: Nonce-based system prevents authorization reuse
- **Time Windows**: Authorizations have validity periods for security

### Functions

- `transferWithAuthorization(...)` - Execute transfer with signed authorization (anyone can call)
- `receiveWithAuthorization(...)` - Recipient claims authorized tokens (recipient pays gas)
- `cancelAuthorization(...)` - Cancel a pending authorization
- `authorizationState(address authorizer, bytes32 nonce)` - Check if authorization was used
- Standard ERC-20 functions: `transfer`, `approve`, `transferFrom`, etc.

### Events

- `AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)` - Emitted when authorization is used
- `AuthorizationCancelled(address indexed authorizer, bytes32 indexed nonce)` - Emitted when authorization is cancelled
- Standard ERC-20 events: `Transfer`, `Approval`

### ERC-3009 Features

**transferWithAuthorization:**
- Token holder signs authorization off-chain
- Relayer (or anyone) can execute the transfer on-chain
- Token holder doesn't pay gas
- Useful for sending tokens to agents

**receiveWithAuthorization:**
- Token holder authorizes transfer to recipient
- Recipient calls the function to claim tokens
- Recipient pays gas (useful for agents receiving payments)
- Only the authorized recipient can claim

**cancelAuthorization:**
- Token holder can cancel pending authorizations
- Prevents unwanted transfers
- Requires signature for security

### Security Features

- **EIP-712 Domain Separator**: Ensures signatures are chain-specific and contract-specific
- **Nonce System**: Each authorization uses a unique nonce to prevent replay attacks
- **Time Windows**: `validAfter` and `validBefore` timestamps limit authorization validity
- **Signature Verification**: All authorizations require valid EIP-712 signatures
- **Replay Protection**: Used authorizations cannot be reused

### Usage Example

1. **Token Holder Creates Authorization:**
   - Signs a message off-chain with transfer details
   - Includes nonce, validity window, and recipient

2. **Relayer Executes (transferWithAuthorization):**
   - Relayer submits transaction with signature
   - Token holder doesn't pay gas
   - Transfer executes automatically

3. **Or Recipient Claims (receiveWithAuthorization):**
   - Recipient calls function with authorization
   - Recipient pays gas
   - Tokens are transferred

### Deployment

#### Deploy AgentToken to Optimism Sepolia

```bash
npx hardhat run scripts/deploy-token.js --network optimismSepolia
```

The contract mints an initial supply to the deployer (default: 1,000,000 AGT).

### Compiler

- Solidity: `0.8.20`
- Network: Optimism Sepolia (Chain ID: 11155420)

### Security

This contract uses OpenZeppelin's `ERC20` and `EIP712` implementations for secure token operations and signature verification. All authorizations are protected by EIP-712 structured data signing and nonce-based replay protection.

