import { NextResponse } from 'next/server';
import { LogEntry } from '@/types';

// Generate dummy log entries with proofs, vulnerabilities, and activity
function generateMockLogs(): LogEntry[] {
  const now = Date.now();
  const logs: LogEntry[] = [];

  // Proof entries (ZK proofs minted on Midnight)
  const proofHashes = [
    'zk_proof_0x8a3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d_abc123',
    'zk_proof_0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b_def456',
    'zk_proof_0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e_ghi789',
    'zk_proof_0x5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d_jkl012',
    'zk_proof_0x7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e_mno345',
    'zk_proof_0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb_pqr678',
    'zk_proof_0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2_stu901',
    'zk_proof_0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db_vwx234',
  ];

  proofHashes.forEach((hash, index) => {
    const timestamp = new Date(now - (proofHashes.length - index) * 2 * 60 * 60 * 1000).toISOString();
    const riskScore = 85 + Math.floor(Math.random() * 15);
    const auditId = `audit_${index + 1}`;
    const auditorId = `auditor_${String.fromCharCode(65 + index)}`;

    logs.push({
      timestamp,
      actor: 'Midnight Protocol',
      icon: '🔐',
      message: `ZK Proof Minted on Midnight Network. Hash: ${hash}. Risk Score: ${riskScore}. Audit ID: ${auditId}. Auditor: ${auditorId}. Verified: true`,
      type: 'proof',
    });
  });

  // Vulnerability entries
  const vulnerabilities = [
    { type: 'Reentrancy', severity: 'Critical', address: '0x8a3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d' },
    { type: 'Integer Overflow', severity: 'High', address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b' },
    { type: 'Access Control', severity: 'Critical', address: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e' },
    { type: 'Unchecked External Call', severity: 'Medium', address: '0x5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d' },
    { type: 'Front-running', severity: 'High', address: '0x7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e' },
    { type: 'Timestamp Dependency', severity: 'Medium', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
    { type: 'Gas Limit DoS', severity: 'High', address: '0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2' },
    { type: 'Uninitialized Storage', severity: 'Critical', address: '0x4B20993Bc481177ec7E8f571ceCaE8A9e22C02db' },
    { type: 'Delegatecall Injection', severity: 'Critical', address: '0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabAB' },
    { type: 'Unsafe Randomness', severity: 'Medium', address: '0x617F2E2fD72FD9D5503197092aC168c91465E7f2' },
  ];

  vulnerabilities.forEach((vuln, index) => {
    const timestamp = new Date(now - (vulnerabilities.length - index) * 30 * 60 * 1000).toISOString();
    logs.push({
      timestamp,
      actor: 'Red Team Agent',
      icon: '🔴',
      message: `Vulnerability Found: ${vuln.type} (${vuln.severity}) in contract ${vuln.address}`,
      type: 'vulnerability',
      is_vulnerability: true,
    });
  });

  // Attack vectors (for Hivemind/Unibase)
  const attackVectors = [
    'Reentrancy via fallback()',
    'Integer overflow in transfer()',
    'Access control bypass',
    'Unchecked external call',
    'Front-running exploit',
    'Timestamp manipulation',
    'Gas limit DoS',
    'Uninitialized storage pointer',
    'Delegatecall injection',
    'Unsafe randomness',
  ];

  attackVectors.forEach((vector, index) => {
    const timestamp = new Date(now - (attackVectors.length - index) * 20 * 60 * 1000).toISOString();
    logs.push({
      timestamp,
      actor: 'Red Team Agent',
      icon: '🔴',
      message: `Executing vector: '${vector}'`,
      type: 'attack',
    });
  });

  // Agent activity logs
  const activities = [
    { actor: 'Judge Agent', icon: '⚖️', message: 'Validating exploit reproduction', type: 'info' },
    { actor: 'Target Agent', icon: '🎯', message: 'Contract deployed and initialized', type: 'info' },
    { actor: 'Red Team Agent', icon: '🔴', message: 'Starting fuzzing campaign', type: 'info' },
    { actor: 'Judge Agent', icon: '⚖️', message: 'Exploit verified and validated', type: 'info' },
    { actor: 'Target Agent', icon: '🎯', message: 'Monitoring contract state', type: 'info' },
    { actor: 'Red Team Agent', icon: '🔴', message: 'Analyzing contract bytecode', type: 'info' },
    { actor: 'Judge Agent', icon: '⚖️', message: 'Proof generation initiated', type: 'info' },
    { actor: 'Target Agent', icon: '🎯', message: 'Transaction executed successfully', type: 'info' },
    { actor: 'Red Team Agent', icon: '🔴', message: 'Fuzzing iteration 42 completed', type: 'info' },
    { actor: 'Judge Agent', icon: '⚖️', message: 'All agents synchronized', type: 'info' },
  ];

  activities.forEach((activity, index) => {
    const timestamp = new Date(now - (activities.length - index) * 5 * 60 * 1000).toISOString();
    logs.push({
      timestamp,
      actor: activity.actor,
      icon: activity.icon,
      message: activity.message,
      type: activity.type,
    });
  });

  // Sort by timestamp (oldest first)
  return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * GET /api/logs
 * Retrieves all log entries including proofs, vulnerabilities, and agent activity
 */
export async function GET() {
  try {
    const logs = generateMockLogs();
    
    return NextResponse.json(logs, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[GET /api/logs] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch logs',
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      {
        status: 500,
      }
    );
  }
}
