export interface LogEntry {
  timestamp: string;
  actor: string;
  agent?: string; // Alias for actor
  icon: string;
  message: string;
  type: string;
  category?: 'attack' | 'proof' | 'status' | 'error';
  auditId?: string;
  is_vulnerability?: boolean;
  // Proof-specific fields
  proofHash?: string;
  proofStatus?: 'submitted' | 'verified' | 'pending' | 'failed';
  transactionId?: string;
  contractTxId?: string;
}

export interface AgentStatus {
  redTeam: string;
  target: string;
  judge: string;
}

export interface Audit {
  id: string;
  targetAddress: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  vulnerabilityCount?: number;
  riskScore?: number;
  intensity?: string;
}

export interface ProofDetail {
  hash: string;
  timestamp: string;
  verified: boolean;
  status: 'submitted' | 'verified' | 'pending' | 'failed';
  auditId?: string;
  riskScore?: number;
  auditorId?: string;
  exploitHash?: string;
  transactionId?: string;
  contractTxId?: string;
  blockHeight?: number;
  contractAddress?: string;
}

