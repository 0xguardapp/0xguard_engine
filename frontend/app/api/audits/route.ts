import { NextResponse } from 'next/server';
import { Audit } from '@/types';

// Mock audit data - in production, this would fetch from a database
const mockAudits: Audit[] = [
  {
    id: 'audit_1',
    targetAddress: '0x8a3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d',
    status: 'active',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    vulnerabilityCount: 3,
    riskScore: 85,
    intensity: 'deep',
  },
  {
    id: 'audit_2',
    targetAddress: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    status: 'completed',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20 hours ago
    vulnerabilityCount: 7,
    riskScore: 92,
    intensity: 'deep',
  },
  {
    id: 'audit_3',
    targetAddress: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e',
    status: 'completed',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 3 days ago + 2 hours
    vulnerabilityCount: 2,
    riskScore: 45,
    intensity: 'quick',
  },
  {
    id: 'audit_4',
    targetAddress: '0x5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d',
    status: 'active',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
    vulnerabilityCount: 1,
    riskScore: 78,
    intensity: 'quick',
  },
  {
    id: 'audit_5',
    targetAddress: '0x3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    status: 'failed',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 11 * 60 * 60 * 1000).toISOString(), // 11 hours ago
    vulnerabilityCount: 0,
    riskScore: 0,
    intensity: 'deep',
  },
  {
    id: 'audit_6',
    targetAddress: '0x7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    status: 'completed',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 5 days ago + 4 hours
    vulnerabilityCount: 12,
    riskScore: 98,
    intensity: 'deep',
  },
  {
    id: 'audit_7',
    targetAddress: '0x2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f',
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    updatedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    vulnerabilityCount: 0,
    riskScore: undefined,
    intensity: 'quick',
  },
];

export async function GET() {
  try {
    // In production, fetch from database
    return NextResponse.json({ audits: mockAudits });
  } catch (error) {
    console.error('Error fetching audits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audits' },
      { status: 500 }
    );
  }
}


