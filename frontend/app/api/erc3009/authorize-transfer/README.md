# ERC-3009 Authorization API

This API endpoint creates EIP-712 signed authorizations for ERC-3009 gasless token transfers.

## Endpoint

`POST /api/erc3009/authorize-transfer`

## Request Body

```json
{
  "to": "0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B",
  "value": "1000000000000000000",  // Amount in token units (wei/smallest unit)
  "validAfter": 1704067200,        // Optional: Unix timestamp (defaults to now)
  "validBefore": 1704153600,       // Required: Unix timestamp (expiration)
  "nonce": "0x..."                 // Optional: 32-byte hex string (will be generated if not provided)
}
```

## Response

```json
{
  "success": true,
  "authorization": {
    "from": "0x...",
    "to": "0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B",
    "value": "1000000000000000000",
    "validAfter": 1704067200,
    "validBefore": 1704153600,
    "nonce": "0x..."
  },
  "signature": {
    "v": 27,
    "r": "0x...",
    "s": "0x..."
  },
  "typedData": {
    "domain": {
      "name": "Agent Token",
      "version": "1",
      "chainId": 11155420,
      "verifyingContract": "0x..."
    },
    "types": { ... },
    "message": { ... }
  },
  "signatureHex": "0x..."
}
```

## Usage Example

```typescript
const response = await fetch('/api/erc3009/authorize-transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '0x742d35Cc6634C0532925a3b844Bc9e8bE1595F0B',
    value: '1000000000000000000', // 1 token (18 decimals)
    validBefore: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  })
});

const data = await response.json();

// Use the signature to call transferWithAuthorization on the contract
await contract.transferWithAuthorization(
  data.authorization.from,
  data.authorization.to,
  data.authorization.value,
  data.authorization.validAfter,
  data.authorization.validBefore,
  data.authorization.nonce,
  data.signature.v,
  data.signature.r,
  data.signature.s
);
```

## Environment Variables

Required:
- `ERC3009_SIGNER_PRIVATE_KEY` - Private key for signing (or `PRIVATE_KEY`)
- `NEXT_PUBLIC_AGENT_TOKEN_ADDRESS` - AgentToken contract address
- `NEXT_PUBLIC_CHAIN_ID` - Chain ID (defaults to Optimism Sepolia: 11155420)

## Security Notes

- The private key should be stored securely and never exposed to the client
- Nonces should be unique per authorization to prevent replay attacks
- `validBefore` should be set to a reasonable expiration time
- The signature is valid only for the specified chain and contract

## Error Responses

- `400` - Invalid request (missing fields, invalid format)
- `500` - Server error (signing key not configured, signing failed)

