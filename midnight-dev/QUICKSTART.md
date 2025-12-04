# Quick Start Guide

Get up and running with Midnight Network development in 5 minutes.

## Step 1: Install Dependencies

```bash
cd midnight-dev
npm install
```

## Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (defaults work for local devnet)
```

## Step 3: Start Devnet

```bash
# Option 1: Use the init script (recommended)
npm run devnet:init

# Option 2: Start directly
npm run devnet:start
```

## Step 4: Verify Devnet

```bash
npm run devnet:verify
```

You should see:
```
✅ Midnight Devnet is running and ready!
```

## Step 5: Test the Setup

```bash
npm run test
```

## Next Steps

- **Compile contracts**: `npm run compile`
- **Deploy contracts**: `npm run deploy`
- **View devnet logs**: `npm run devnet:logs`
- **Stop devnet**: `npm run devnet:stop`

## Troubleshooting

**Docker not running?**
```bash
# Start Docker Desktop, then:
npm run devnet:start
```

**Port 6300 already in use?**
```bash
# Stop existing container:
docker stop midnight-devnet
docker rm midnight-devnet

# Or change port in .env:
MIDNIGHT_PROOF_SERVER=http://127.0.0.1:6301
```

**Need help?**
See the full [README.md](./README.md) for detailed documentation.

