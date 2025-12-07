import { NextRequest, NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import { signTypedData } from 'viem';
import { optimismSepolia } from 'viem/chains';

// Configuration from environment
const PRIVATE_KEY = process.env.ERC3009_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY || '';
const AGENT_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_AGENT_TOKEN_ADDRESS || '') as `0x${string}`;
const CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : optimismSepolia.id;

// ERC-3009 TransferWithAuthorization typehash
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = '0x6c8ae9268e3c56cc20a9b1b1b9b83f50ec551d362c93591308f8aabfb8df50ca'; // keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")

interface AuthorizeTransferRequest {
  to: string;
  value: string; // Amount in token units (will be converted to BigInt)
  validAfter?: number; // Unix timestamp (defaults to now)
  validBefore: number; // Unix timestamp (required)
  nonce: string; // bytes32 nonce (hex string or will be generated)
}

/**
 * POST /api/erc3009/authorize-transfer
 * 
 * Creates an EIP-712 signed authorization for ERC-3009 gasless transfer.
 * 
 * Request body:
 * {
 *   to: string (recipient address)
 *   value: string (amount in token units)
 *   validAfter?: number (optional, defaults to now)
 *   validBefore: number (required, expiration timestamp)
 *   nonce: string (optional, will be generated if not provided)
 * }
 * 
 * Returns:
 * {
 *   success: boolean
 *   authorization: {
 *     from: string (signer address)
 *     to: string
 *     value: string
 *     validAfter: number
 *     validBefore: number
 *     nonce: string
 *   }
 *   signature: {
 *     v: number
 *     r: string
 *     s: string
 *   }
 *   typedData: object (EIP-712 typed data structure)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate private key is configured
    if (!PRIVATE_KEY || !PRIVATE_KEY.startsWith('0x')) {
      return NextResponse.json(
        { 
          error: 'Server signing key not configured',
          message: 'ERC3009_SIGNER_PRIVATE_KEY environment variable must be set'
        },
        { status: 500 }
      );
    }

    // Validate token address
    if (!AGENT_TOKEN_ADDRESS || !AGENT_TOKEN_ADDRESS.startsWith('0x')) {
      return NextResponse.json(
        { 
          error: 'Agent token address not configured',
          message: 'NEXT_PUBLIC_AGENT_TOKEN_ADDRESS environment variable must be set'
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: AuthorizeTransferRequest = await request.json();
    
    // Validate required fields
    if (!body.to || !body.value || !body.validBefore) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['to', 'value', 'validBefore'],
          received: Object.keys(body)
        },
        { status: 400 }
      );
    }

    // Validate address format
    if (!body.to.startsWith('0x') || body.to.length !== 42) {
      return NextResponse.json(
        { error: 'Invalid recipient address format' },
        { status: 400 }
      );
    }

    // Validate value
    const value = BigInt(body.value);
    if (value <= 0n) {
      return NextResponse.json(
        { error: 'Value must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate timestamps
    const now = Math.floor(Date.now() / 1000);
    const validAfter = body.validAfter || now;
    const validBefore = body.validBefore;

    if (validAfter >= validBefore) {
      return NextResponse.json(
        { error: 'validAfter must be less than validBefore' },
        { status: 400 }
      );
    }

    if (validBefore <= now) {
      return NextResponse.json(
        { error: 'validBefore must be in the future' },
        { status: 400 }
      );
    }

    // Generate or validate nonce
    let nonce: `0x${string}`;
    if (body.nonce) {
      if (!body.nonce.startsWith('0x') || body.nonce.length !== 66) {
        return NextResponse.json(
          { error: 'Invalid nonce format (must be 32-byte hex string)' },
          { status: 400 }
        );
      }
      nonce = body.nonce as `0x${string}`;
    } else {
      // Generate random nonce
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      nonce = `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
    }

    // Create account from private key
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const from = account.address;

    // Build EIP-712 domain
    const domain = {
      name: 'Agent Token',
      version: '1',
      chainId: CHAIN_ID,
      verifyingContract: AGENT_TOKEN_ADDRESS
    };

    // Build EIP-712 types
    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    };

    // Build message
    const message = {
      from,
      to: body.to as `0x${string}`,
      value,
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce
    };

    // Sign typed data
    const signature = await signTypedData({
      account,
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message
    });

    // Parse signature into v, r, s components
    // viem returns signature as hex string (65 bytes: 32 bytes r + 32 bytes s + 1 byte v)
    const sigBytes = Buffer.from(signature.slice(2), 'hex');
    if (sigBytes.length !== 65) {
      throw new Error('Invalid signature length');
    }
    
    const r = `0x${sigBytes.slice(0, 32).toString('hex')}` as `0x${string}`;
    const s = `0x${sigBytes.slice(32, 64).toString('hex')}` as `0x${string}`;
    // v is the recovery id (0 or 1), we need to add 27 for ECDSA
    const v = sigBytes[64] < 27 ? sigBytes[64] + 27 : sigBytes[64];

    // Build authorization object
    const authorization = {
      from,
      to: body.to,
      value: body.value,
      validAfter,
      validBefore,
      nonce
    };

    // Return response
    return NextResponse.json({
      success: true,
      authorization,
      signature: {
        v,
        r,
        s
      },
      typedData: {
        domain,
        types,
        message: {
          ...message,
          value: message.value.toString(),
          validAfter: message.validAfter.toString(),
          validBefore: message.validBefore.toString()
        }
      },
      // Include full signature for convenience
      signatureHex: signature
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[ERC3009] Error authorizing transfer:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to authorize transfer',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/erc3009/authorize-transfer
 * 
 * Returns information about the authorization service.
 */
export async function GET() {
  const account = PRIVATE_KEY ? privateKeyToAccount(PRIVATE_KEY as `0x${string}`) : null;
  
  return NextResponse.json({
    service: 'ERC-3009 Authorization Service',
    signerAddress: account?.address || 'Not configured',
    tokenAddress: AGENT_TOKEN_ADDRESS || 'Not configured',
    chainId: CHAIN_ID,
    configured: !!(PRIVATE_KEY && AGENT_TOKEN_ADDRESS)
  });
}

