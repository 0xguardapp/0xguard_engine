# Devnet Verification Guide

This guide shows you how to verify that your Midnight Network devnet is properly set up and running.

## Quick Verification

Run the verification script:

```bash
npm run devnet:verify
```

## Expected Output

When everything is working correctly, you should see:

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

## Manual Verification Steps

### 1. Check Docker Container

```bash
docker ps | grep midnight-devnet
```

Expected output:
```
CONTAINER ID   IMAGE                          STATUS         PORTS                    NAMES
abc123def456   midnightnetwork/proof-server   Up 5 minutes   0.0.0.0:6300->6300/tcp   midnight-devnet
```

### 2. Check Container Logs

```bash
npm run devnet:logs
# or
docker logs midnight-devnet
```

You should see proof server logs indicating it's running.

### 3. Test Proof Server Endpoint

```bash
curl http://127.0.0.1:6300/health
```

Or test with Node.js:

```bash
node -e "fetch('http://127.0.0.1:6300/health').then(r => console.log('Status:', r.status)).catch(e => console.error('Error:', e.message))"
```

### 4. Check Port Availability

```bash
lsof -i :6300
```

Should show the Docker container using port 6300.

## Troubleshooting

### Container Not Running

**Problem**: Container doesn't exist or isn't running

**Solution**:
```bash
npm run devnet:start
# or
npm run devnet:init
```

### Port Already in Use

**Problem**: Port 6300 is already in use by another process

**Solution**:
```bash
# Find what's using the port
lsof -i :6300

# Stop the conflicting process, or
# Change the port in .env:
MIDNIGHT_PROOF_SERVER=http://127.0.0.1:6301
```

### Connection Refused

**Problem**: Proof server not accessible

**Solution**:
1. Check container is running: `docker ps`
2. Check container logs: `docker logs midnight-devnet`
3. Restart container: `npm run devnet:stop && npm run devnet:start`

### Container Exits Immediately

**Problem**: Container starts then stops

**Solution**:
```bash
# Check logs for errors
docker logs midnight-devnet

# Common issues:
# - Docker daemon not running
# - Insufficient resources
# - Image pull failed
```

## Advanced Verification

### Test with Midnight SDK

Create a test file `test-devnet.js`:

```javascript
import { midnightConfig } from './midnight.config.js';

async function testDevnet() {
  try {
    const response = await fetch(midnightConfig.proofServer.url + '/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    console.log('✅ Devnet is accessible');
    console.log('Status:', response.status);
  } catch (error) {
    console.error('❌ Devnet is not accessible:', error.message);
  }
}

testDevnet();
```

Run:
```bash
node test-devnet.js
```

### Verify Network Configuration

```bash
node -e "import('./midnight.config.js').then(c => {
  console.log('Network:', c.midnightConfig.network);
  console.log('Proof Server:', c.midnightConfig.proofServer.url);
  console.log('Network ID:', c.midnightConfig.networkId);
})"
```

## Next Steps

Once verified, you can:

1. **Compile contracts**: `npm run compile`
2. **Run tests**: `npm run test`
3. **Deploy contracts**: `npm run deploy`
4. **Start development**: See [README.md](./README.md)

## Support

If you continue to have issues:

1. Check [README.md](./README.md) for detailed setup instructions
2. Review [QUICKSTART.md](./QUICKSTART.md) for step-by-step setup
3. Check Midnight Network documentation: https://docs.midnight.network/

