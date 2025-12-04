# Midnight Network Development Environment

Complete development environment for building zero-knowledge proofs and smart contracts on the Midnight Network.

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** (for running local devnet)
- **Compact Compiler** (for compiling smart contracts)

### Installation

1. **Install dependencies:**
   ```bash
   cd midnight-dev
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Midnight devnet:**
   ```bash
   npm run devnet:start
   ```

4. **Verify devnet is running:**
   ```bash
   npm run devnet:verify
   ```

## 📁 Project Structure

```
midnight-dev/
├── contracts/          # Compact smart contracts (references ../contracts/midnight)
├── scripts/            # Deployment and utility scripts
│   ├── deploy.js       # Deploy contracts to Midnight
│   └── verify-devnet.js # Verify devnet is running
├── test/               # Test files
│   └── basic.test.ts   # Basic configuration tests
├── integration/        # Judge Agent integration
│   └── judge-integration.ts # Python-JS bridge for ZK proofs
├── package.json        # Project dependencies
├── midnight.config.js # Network configuration
├── .env.example       # Environment variables template
└── README.md          # This file
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

- **MIDNIGHT_NETWORK**: Network to use (`testnet` or `mainnet`)
- **MIDNIGHT_PROOF_SERVER**: Local proof server URL (default: `http://127.0.0.1:6300`)
- **MIDNIGHT_MNEMONIC**: 24-word mnemonic for wallet (required for mainnet)
- **MIDNIGHT_CONTRACT_ADDRESS**: Deployed contract address (set after deployment)

See `.env.example` for all available options.

### Network Configuration

Edit `midnight.config.js` to customize:
- Network endpoints
- Contract paths
- Private state storage
- Development settings

## 🛠️ Available Scripts

### Devnet Management

```bash
# Start the local devnet
npm run devnet:start

# Stop the devnet
npm run devnet:stop

# View devnet logs
npm run devnet:logs

# Verify devnet is running
npm run devnet:verify
```

### Contract Development

```bash
# Compile Compact contracts
npm run compile

# Build contracts (compile + TypeScript)
npm run build

# Deploy contracts to Midnight
npm run deploy
```

### Testing

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run integration:test
```

## 🌙 Midnight Devnet Setup

### Starting the Devnet

The Midnight devnet runs in a Docker container:

```bash
npm run devnet:start
```

This starts the proof server on port 6300.

### Verifying Devnet

Check if the devnet is running:

```bash
npm run devnet:verify
```

Expected output:
```
🌙 Verifying Midnight Devnet...

1. Checking Docker container...
   ✅ Docker container 'midnight-devnet' is running

2. Checking proof server...
   URL: http://127.0.0.1:6300
   ✅ Proof server is accessible
   Status: OK

==================================================
✅ Midnight Devnet is running and ready!
```

### Troubleshooting

**Devnet won't start:**
- Ensure Docker is running: `docker ps`
- Check if port 6300 is available: `lsof -i :6300`
- View logs: `npm run devnet:logs`

**Proof server not accessible:**
- Verify container is running: `docker ps | grep midnight-devnet`
- Check container logs: `docker logs midnight-devnet`
- Restart container: `npm run devnet:stop && npm run devnet:start`

## 📝 Compact Compiler Setup

### Installing the Compact Compiler

1. **Download the compiler:**
   - Visit [Midnight Network releases](https://github.com/MidnightNetwork/midnight/releases)
   - Download `compactc` for your platform (Linux/macOS)

2. **Install:**
   ```bash
   mkdir -p ~/compact-compiler
   cd ~/compact-compiler
   unzip compactc-<platform>.zip
   chmod +x compactc
   ```

3. **Add to PATH:**
   ```bash
   export PATH=$PATH:~/compact-compiler
   ```

4. **Verify:**
   ```bash
   compactc --version
   ```

### Compiling Contracts

Contracts are compiled from `../contracts/midnight/src/`:

```bash
# From midnight-dev directory
npm run compile

# Or directly
cd ../contracts/midnight
npm run compact
```

## 🔗 Integration with Judge Agent

The Judge agent (Python) integrates with Midnight through the integration layer:

### Python Integration

The Judge agent uses `agent/midnight_client.py` which can call the TypeScript integration:

```python
from midnight_client import submit_audit_proof

proof_hash = await submit_audit_proof(
    audit_id=audit_id,
    exploit_string=exploit_payload,
    risk_score=98,
    auditor_id=judge.address,
    threshold=90
)
```

### TypeScript Integration

The integration layer (`integration/judge-integration.ts`) provides:

- `submitAuditProof()` - Submit ZK proof to Midnight
- `verifyAuditStatus()` - Verify audit status on-chain
- `checkDevnetAvailability()` - Check if devnet is available

## 📚 Contract Development

### Creating a New Contract

1. **Create contract file:**
   ```bash
   cd ../contracts/midnight/src
   touch MyContract.compact
   ```

2. **Write Compact code:**
   ```compact
   pragma language_version >= 0.16 && <= 0.18;
   import CompactStandardLibrary;

   export ledger myState: Map<Bytes<32>, Uint<64>>;

   export circuit myCircuit(input: Bytes<32>): [] {
     // Circuit logic
   }
   ```

3. **Compile:**
   ```bash
   npm run compile
   ```

4. **Deploy:**
   ```bash
   cd ../../../midnight-dev
   npm run deploy
   ```

### Contract Structure

Contracts use the Compact language:
- **Private Witness**: Data that remains private (never revealed on-chain)
- **Public Ledger**: Data stored publicly on-chain
- **Circuits**: Functions that generate ZK proofs

## 🧪 Testing

### Unit Tests

Run basic configuration tests:

```bash
npm run test
```

### Integration Tests

Test the complete flow:

```bash
npm run integration:test
```

## 🔍 Verification

### Verify Devnet

```bash
npm run devnet:verify
```

### Verify Configuration

```bash
node -e "import('./midnight.config.js').then(c => console.log(c.midnightConfig))"
```

## 📖 Resources

- **Midnight Network Docs**: https://docs.midnight.network/
- **Compact Language**: https://docs.midnight.network/compact
- **Midnight SDK**: https://github.com/MidnightNetwork/midnight-js
- **Contract Examples**: `../contracts/midnight/src/`

## 🐛 Troubleshooting

### Common Issues

**"Cannot find module '@midnight-ntwrk/...'"**
- Run `npm install` to install dependencies

**"Proof server connection refused"**
- Start devnet: `npm run devnet:start`
- Check Docker is running: `docker ps`

**"Contract compilation failed"**
- Ensure Compact compiler is installed and in PATH
- Check contract syntax matches Compact version

**"Deployment failed"**
- Verify devnet is running: `npm run devnet:verify`
- Check wallet mnemonic is set in `.env`
- Ensure contract is compiled: `npm run compile`

## 🚢 Deployment

### Testnet Deployment

1. Set `MIDNIGHT_NETWORK=testnet` in `.env`
2. Compile contracts: `npm run compile`
3. Deploy: `npm run deploy`
4. Save contract address to `.env`

### Mainnet Deployment

1. Set `MIDNIGHT_NETWORK=mainnet` in `.env`
2. Set `MIDNIGHT_MNEMONIC` with your wallet mnemonic
3. Compile contracts: `npm run compile`
4. Deploy: `npm run deploy`
5. Verify deployment on Midnight explorer

## 📄 License

See main project LICENSE file.

## 🤝 Contributing

See main project CONTRIBUTING guidelines.

