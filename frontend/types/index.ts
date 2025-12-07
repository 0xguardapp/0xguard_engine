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
  status: 'active' | 'completed' | 'failed' | 'pending' | 'ready';
  createdAt: string;
  updatedAt: string;
  vulnerabilityCount?: number;
  riskScore?: number;
  intensity?: string;
  ownerAddress?: string; // Wallet address of the user who created the audit
  // New fields for Create Audit workflow
  name?: string;
  description?: string;
  target?: string; // URL/Repo (alternative to targetAddress)
  tags?: string[];
  difficulty?: string;
  priority?: string;
  metadata?: Record<string, any>;
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

export interface AgentIdentity {
  name?: string;
  role?: string;
  capabilities?: string[];
  version?: string;
  address: string;
  started_at?: string;
  unibase_key?: string;
  identity_uri?: string;
  registered_at?: number;
  last_updated?: number;
}

export interface AgentReputation {
  score: number;
  lastUpdated: number;
  evidenceURI: string;
  history?: Array<{
    delta: number;
    timestamp: string;
    metadata: any;
  }>;
}

export interface AgentValidation {
  valid: boolean;
  evidenceURI: string;
  lastValidated?: string;
}

export interface OnChainEvent {
  type: 'AgentRegistered' | 'IdentityURIUpdated' | 'ReputationUpdated' | 'AgentValidated' | 'AgentRevoked';
  transactionHash: string;
  blockNumber: number;
  timestamp: string;
  data: any;
}

